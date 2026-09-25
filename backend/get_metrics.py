import pandas as pd
import numpy as np
import joblib
import json
import warnings
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score, accuracy_score, roc_auc_score, precision_score, recall_score, f1_score
warnings.filterwarnings('ignore')

results = {}


# 1. Cost Overrun (Regression)
try:
    X_test = pd.read_csv("output/data/X_test.csv")
    y_test = pd.read_csv("output/data/y_test.csv").squeeze()
    model = joblib.load("output/models/cost_overrun_model.pkl")
    preds = model.predict(X_test)
    results['Cost Overrun (Regression)'] = {
        'MAE': float(mean_absolute_error(y_test, preds)),
        'RMSE': float(np.sqrt(mean_squared_error(y_test, preds))),
        'R2': float(r2_score(y_test, preds))
    }
except Exception as e:
    pass

# 2. Time Overrun (Classification)
try:
    X_test = pd.read_csv("output/data/time_overrun/X_test.csv")
    y_test = pd.read_csv("output/data/time_overrun/y_test.csv").squeeze()
    model = joblib.load("output/models/time_overrun_gb.pkl")
    preds = model.predict(X_test)
    results['Time Overrun (Classification)'] = {
        'Accuracy': float(accuracy_score(y_test, preds)),
        'Precision': float(precision_score(y_test, preds, average='macro')),
        'Recall': float(recall_score(y_test, preds, average='macro')),
        'F1': float(f1_score(y_test, preds, average='macro'))
    }
except Exception as e:
    pass

# 3. Best Classification Pipeline
try:
    model = joblib.load("output/models/best_classification_pipeline.pkl")
    df = pd.read_csv("output/ml_training_dataset.csv")
    # In build_ml_pipeline.py, target is 'is_overrun'
    if 'is_overrun' in df.columns:
        X = df.drop('is_overrun', axis=1)
        y = df['is_overrun']
        preds = model.predict(X)
        try:
            preds_proba = model.predict_proba(X)[:, 1]
            roc_auc = float(roc_auc_score(y, preds_proba))
        except:
            roc_auc = None
            
        results['Risk Scoring (Classification)'] = {
            'Accuracy': float(accuracy_score(y, preds)),
            'Precision': float(precision_score(y, preds, zero_division=0)),
            'Recall': float(recall_score(y, preds, zero_division=0)),
            'F1 Score': float(f1_score(y, preds, zero_division=0)),
            'ROC AUC (ROA)': roc_auc
        }
except Exception as e:
    pass

print(json.dumps(results, indent=2))
