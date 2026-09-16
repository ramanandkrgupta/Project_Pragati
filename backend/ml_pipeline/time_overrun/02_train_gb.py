import pandas as pd
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.metrics import mean_absolute_error, r2_score
import joblib
import os

def train_time_overrun_model():
    print("--- 02: GRADIENT BOOSTING TRAINING (TIME OVERRUN) ---")
    
    data_dir = "output/data/time_overrun"
    model_dir = "output/models"
    os.makedirs(model_dir, exist_ok=True)
    
    X_train = pd.read_csv(f"{data_dir}/X_train.csv")
    X_test = pd.read_csv(f"{data_dir}/X_test.csv")
    y_train = pd.read_csv(f"{data_dir}/y_train.csv")['target_delay_months']
    y_test = pd.read_csv(f"{data_dir}/y_test.csv")['target_delay_months']
    
    # Initialize Gradient Boosting Regressor
    model = GradientBoostingRegressor(
        n_estimators=100,
        learning_rate=0.1,
        max_depth=5,
        random_state=42
    )
    
    print("Training Gradient Boosting Regressor...")
    model.fit(X_train, y_train)
    
    # Evaluate
    predictions = model.predict(X_test)
    mae = mean_absolute_error(y_test, predictions)
    r2 = r2_score(y_test, predictions)
    
    print(f"Mean Absolute Error: {mae:.2f} months")
    print(f"R2 Score: {r2:.4f}")
    
    # Save Model
    model_path = os.path.join(model_dir, "time_overrun_gb.pkl")
    joblib.dump(model, model_path)
    print(f"Model saved to {model_path}")

if __name__ == "__main__":
    train_time_overrun_model()
