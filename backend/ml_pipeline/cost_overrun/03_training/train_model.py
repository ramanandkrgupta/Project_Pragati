import pandas as pd
import os
import joblib
from sklearn.ensemble import RandomForestRegressor

def train_model():
    print("--- 03: MODEL TRAINING ---")
    
    print("Loading preprocessed training data...")
    X_train = pd.read_csv("output/data/X_train.csv")
    y_train = pd.read_csv("output/data/y_train.csv")
    
    # We use y_train's single column as a 1D array
    y_train = y_train.squeeze()
    
    print(f"Training Random Forest Regressor on {X_train.shape[0]} projects...")
    print(f"Features: {list(X_train.columns)}")
    
    # Initialize and train the model
    # We use a Regressor because we are predicting an exact amount (Crores)
    model = RandomForestRegressor(
        n_estimators=100, 
        max_depth=10, 
        random_state=42,
        n_jobs=-1
    )
    
    model.fit(X_train, y_train)
    
    # Save the model
    model_path = "output/models/cost_overrun_model.pkl"
    joblib.dump(model, model_path)
    
    print(f"Model successfully trained and saved to {model_path}")

if __name__ == "__main__":
    train_model()
