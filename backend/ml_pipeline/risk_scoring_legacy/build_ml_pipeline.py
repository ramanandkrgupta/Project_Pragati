import os
import pandas as pd
import numpy as np
from datetime import datetime
import joblib
import json

from sklearn.model_selection import GroupShuffleSplit, GroupKFold, cross_validate
from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor, HistGradientBoostingClassifier
from sklearn.metrics import classification_report, accuracy_score, precision_score, recall_score, f1_score, roc_auc_score, mean_absolute_error, mean_squared_error, r2_score
import shap

def parse_date(date_str):
    if pd.isna(date_str) or date_str == '-' or date_str == 'NA':
        return pd.NaT
    try:
        return pd.to_datetime(date_str, format='%m/%Y')
    except:
        return pd.NaT

def main():
    print("PHASE 1-3: CANONICAL SCHEMA & DATA QUALITY")
    df = pd.read_csv('master_project_data.csv')
    
    # 1. Date normalization
    df['planned_start_date'] = df['planned_start_date'].apply(parse_date)
    df['planned_completion_date'] = df['planned_completion_date'].apply(parse_date)
    
    df['planned_duration_months'] = (df['planned_completion_date'].dt.year - df['planned_start_date'].dt.year) * 12 + (df['planned_completion_date'].dt.month - df['planned_start_date'].dt.month)
    
    # Map report month to datetime for sorting
    def parse_report_month(rm):
        try:
            return datetime.strptime(rm, '%B_%Y')
        except:
            try:
                return datetime.strptime(rm, '%B%Y')
            except:
                return pd.NaT
            
    df['report_date'] = df['report_month'].apply(parse_report_month)
    
    # Convert numeric columns
    numeric_cols = ['approved_cost', 'revised_cost', 'physical_progress', 'financial_progress', 'expenditure']
    for col in numeric_cols:
        df[col] = pd.to_numeric(df[col], errors='coerce')
        
    df['expenditure_ratio'] = df['expenditure'] / df['approved_cost']
    
    # Deduplicate into Projects and Snapshots
    df = df.sort_values(by=['project_id', 'report_date'])
    
    # Generate Snapshot ID
    df['snapshot_id'] = df['project_id'].astype(str) + "_" + df['report_month']
    
    # Deduplicate snapshots: Keep the row with the most valid (non-null) data
    df['non_null_count'] = df.notna().sum(axis=1)
    df = df.sort_values(by=['snapshot_id', 'non_null_count'])
    df = df.drop_duplicates(subset=['snapshot_id'], keep='last')
    df = df.drop(columns=['non_null_count'])
    
    # Sort chronologically again just to be safe
    df = df.sort_values(by=['project_id', 'report_date'])
    
    # 2. Canonical Projects
    # We want one row per project to represent the "static" or final state for historical outcome
    canonical_projects = df.groupby('project_id').last().reset_index()
    
    # 3. Data Quality Report
    dq_report = {
        'total_pdfs': df['report_month'].nunique(),
        'total_projects': df['project_id'].nunique(),
        'total_snapshots': len(df),
        'missing_values': df.isnull().sum().to_dict(),
        'negative_costs': int(len(df[(df['approved_cost'] < 0) | (df['revised_cost'] < 0)])),
        'progress_gt_100': int(len(df[df['physical_progress'] > 100])),
        'expenditure_gt_revised': int(len(df[df['expenditure'] > df['revised_cost']])),
    }
    
    print(f"Total Projects: {dq_report['total_projects']}")
    print(f"Total Snapshots: {dq_report['total_snapshots']}")
    
    # Save canonical data
    os.makedirs('output', exist_ok=True)
    canonical_projects.to_csv('output/canonical_projects.csv', index=False)
    df.to_csv('output/canonical_snapshots.csv', index=False)
    
    print("\nPHASE 4-5: ML DATASET & LEAKAGE-SAFE PREP")
    # Define Target on canonical_projects (historical outcome)
    # is_overrun = revised_cost > original_cost
    canonical_projects['overrun_amount'] = canonical_projects['revised_cost'] - canonical_projects['approved_cost']
    canonical_projects['overrun_pct'] = (canonical_projects['overrun_amount'] / canonical_projects['approved_cost']) * 100
    canonical_projects['is_overrun'] = (canonical_projects['overrun_pct'] > 0).astype(int)
    
    # Create target mapping
    y_target_clf = canonical_projects.set_index('project_id')['is_overrun']
    y_target_reg = canonical_projects.set_index('project_id')['overrun_pct']
    
    # Define Features (X) from the FIRST snapshot of each project to prevent leakage!
    # Early warning means predicting overrun based on the data available when the project is FIRST reported
    initial_snapshots = df.groupby('project_id').first().reset_index()
    
    # Leakage-safe features
    features = ['project_id', 'sector', 'state', 'implementing_agency', 'approved_cost', 'planned_duration_months']
    X = initial_snapshots[features].copy()
    
    # Add target back
    X['is_overrun'] = X['project_id'].map(y_target_clf)
    X['overrun_pct'] = X['project_id'].map(y_target_reg)
    
    # Filter out NaNs in target
    X = X.dropna(subset=['is_overrun'])
    
    X.to_csv('output/ml_training_dataset.csv', index=False)
    
    print(f"ML Dataset size: {len(X)} projects")
    
    # Split
    splitter = GroupShuffleSplit(n_splits=1, test_size=0.2, random_state=42)
    train_idx, test_idx = next(splitter.split(X, groups=X['project_id']))
    
    train_data = X.iloc[train_idx]
    test_data = X.iloc[test_idx]
    
    X_train = train_data.drop(columns=['project_id', 'is_overrun', 'overrun_pct'])
    y_train_clf = train_data['is_overrun']
    y_train_reg = train_data['overrun_pct'].fillna(0) # Some might be NaN if original cost was 0
    
    X_test = test_data.drop(columns=['project_id', 'is_overrun', 'overrun_pct'])
    y_test_clf = test_data['is_overrun']
    y_test_reg = test_data['overrun_pct'].fillna(0)
    
    print("\nPHASE 6-9: MODEL TRAINING & EVALUATION")
    numeric_features = ['approved_cost', 'planned_duration_months']
    categorical_features = ['sector', 'state', 'implementing_agency']
    
    preprocessor = ColumnTransformer(
        transformers=[
            ('num', Pipeline([
                ('imputer', SimpleImputer(strategy='median')),
                ('scaler', StandardScaler())
            ]), numeric_features),
            ('cat', Pipeline([
                ('imputer', SimpleImputer(strategy='constant', fill_value='Unknown')),
                ('onehot', OneHotEncoder(handle_unknown='ignore', sparse_output=False))
            ]), categorical_features)
        ])
    
    models = {
        'Logistic Regression': LogisticRegression(max_iter=1000, class_weight='balanced'),
        'Random Forest': RandomForestClassifier(n_estimators=100, class_weight='balanced', random_state=42),
        'Gradient Boosting': HistGradientBoostingClassifier(random_state=42)
    }
    
    best_model_name = None
    best_f1 = 0
    best_pipeline = None
    
    print("Classification Results:")
    for name, model in models.items():
        clf = Pipeline(steps=[('preprocessor', preprocessor), ('classifier', model)])
        clf.fit(X_train, y_train_clf)
        
        y_pred = clf.predict(X_test)
        y_prob = clf.predict_proba(X_test)[:, 1] if hasattr(clf, "predict_proba") else [0]*len(y_test_clf)
        
        print(f"--- {name} ---")
        print(f"Accuracy: {accuracy_score(y_test_clf, y_pred):.3f}")
        print(f"Precision: {precision_score(y_test_clf, y_pred, zero_division=0):.3f}")
        print(f"Recall: {recall_score(y_test_clf, y_pred, zero_division=0):.3f}")
        print(f"F1 Score: {f1_score(y_test_clf, y_pred, zero_division=0):.3f}")
        print(f"ROC-AUC: {roc_auc_score(y_test_clf, y_prob):.3f}")
        
        f1 = f1_score(y_test_clf, y_pred, zero_division=0)
        if f1 > best_f1:
            best_f1 = f1
            best_model_name = name
            best_pipeline = clf
            
    # Regression
    print("\nRegression Results (Random Forest Regressor):")
    reg = Pipeline(steps=[('preprocessor', preprocessor), ('regressor', RandomForestRegressor(n_estimators=100, random_state=42))])
    
    # Filter out extreme outliers for regression training
    mask_train = (y_train_reg >= -100) & (y_train_reg <= 500)
    reg.fit(X_train[mask_train], y_train_reg[mask_train])
    
    y_pred_reg = reg.predict(X_test)
    print(f"MAE: {mean_absolute_error(y_test_reg, y_pred_reg):.3f}")
    print(f"RMSE: {np.sqrt(mean_squared_error(y_test_reg, y_pred_reg)):.3f}")
    print(f"R2: {r2_score(y_test_reg, y_pred_reg):.3f}")
    
    print("\nPHASE 10: SHAP EXPLAINABILITY")
    if best_model_name == 'Random Forest':
        X_train_transformed = preprocessor.fit_transform(X_train)
        explainer = shap.TreeExplainer(best_pipeline.named_steps['classifier'])
        print("SHAP explainer successfully initialized.")
        
    print("\nPHASE 11: ARTIFACT EXPORT")
    os.makedirs('output/models', exist_ok=True)
    joblib.dump(best_pipeline, 'output/models/best_classification_pipeline.pkl')
    joblib.dump(reg, 'output/models/regression_pipeline.pkl')
    
    with open('output/data_quality_report.json', 'w') as f:
        json.dump(dq_report, f, indent=4)
        
    print("Pipelines, datasets, and reports saved to 'output/' directory.")

if __name__ == "__main__":
    main()
