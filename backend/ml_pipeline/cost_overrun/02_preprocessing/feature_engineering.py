import pandas as pd
import numpy as np
import os
from sklearn.model_selection import train_test_split
import joblib

def feature_engineering():
    print("--- 02: PREPROCESSING & FEATURE ENGINEERING ---")
    input_file = "output/data/clean_cost_data.csv"
    output_dir = "output/data"
    
    print(f"Loading clean data from {input_file}...")
    df = pd.read_csv(input_file)
    
    # Define features and target
    target = 'cost_overrun_cr'
    features = ['approved_cost', 'planned_duration_months', 'sector', 'state', 'implementing_agency', 'ministry']
    
    # Keep only needed columns
    available_features = [f for f in features if f in df.columns]
    
    # Fill missing numeric features with median
    for col in ['approved_cost', 'planned_duration_months']:
        if col in df.columns:
            df[col] = df[col].fillna(df[col].median())
    
    X = df[available_features]
    y = df[target]
    
    print("Performing 80/20 Train-Test Split to prevent data leakage...")
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    # --- TARGET ENCODING (The "Hidden Relationships") ---
    # We calculate the historical average overrun for State, Sector, Ministry 
    # ONLY using the Training data.
    
    target_encoded_cols = ['state', 'sector', 'ministry']
    encoding_maps = {}
    
    for col in target_encoded_cols:
        if col in X_train.columns:
            # Calculate mean overrun per category in training data
            temp_df = pd.concat([X_train[col], y_train], axis=1)
            mean_encodings = temp_df.groupby(col)[target].mean().to_dict()
            
            # Global mean for unseen categories in test set
            global_mean = y_train.mean()
            
            # Map to train and test
            X_train[f"{col}_historical_overrun_avg"] = X_train[col].map(mean_encodings).fillna(global_mean)
            X_test[f"{col}_historical_overrun_avg"] = X_test[col].map(mean_encodings).fillna(global_mean)
            
            encoding_maps[col] = {
                'encodings': mean_encodings,
                'global_mean': global_mean
            }
            
            # Drop the original categorical columns since we replaced them with numerical historical averages
            X_train = X_train.drop(col, axis=1)
            X_test = X_test.drop(col, axis=1)
            
    # For implementing_agency, which might have too many unique values, we use frequency encoding or target encoding too
    if 'implementing_agency' in X_train.columns:
        temp_df = pd.concat([X_train['implementing_agency'], y_train], axis=1)
        mean_enc = temp_df.groupby('implementing_agency')[target].mean().to_dict()
        g_mean = y_train.mean()
        X_train["agency_historical_overrun_avg"] = X_train['implementing_agency'].map(mean_enc).fillna(g_mean)
        X_test["agency_historical_overrun_avg"] = X_test['implementing_agency'].map(mean_enc).fillna(g_mean)
        X_train = X_train.drop('implementing_agency', axis=1)
        X_test = X_test.drop('implementing_agency', axis=1)
        
        encoding_maps['implementing_agency'] = {'encodings': mean_enc, 'global_mean': g_mean}

    print("Saving preprocessed datasets and encoding maps...")
    X_train.to_csv(os.path.join(output_dir, "X_train.csv"), index=False)
    X_test.to_csv(os.path.join(output_dir, "X_test.csv"), index=False)
    y_train.to_csv(os.path.join(output_dir, "y_train.csv"), index=False)
    y_test.to_csv(os.path.join(output_dir, "y_test.csv"), index=False)
    
    os.makedirs("output/models", exist_ok=True)
    joblib.dump(encoding_maps, "output/models/target_encoding_maps.pkl")
    
    print("Preprocessing complete!")

if __name__ == "__main__":
    feature_engineering()
