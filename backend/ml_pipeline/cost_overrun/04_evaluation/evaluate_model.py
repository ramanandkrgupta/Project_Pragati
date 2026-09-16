import pandas as pd
import joblib
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
import numpy as np

def evaluate_model():
    print("--- 04: MODEL EVALUATION ---")
    
    print("Loading unseen Test Data (the 20%)...")
    X_test = pd.read_csv("output/data/X_test.csv")
    y_test = pd.read_csv("output/data/y_test.csv").squeeze()
    
    print("Loading trained model...")
    model = joblib.load("output/models/cost_overrun_model.pkl")
    
    print("Making predictions on the unseen Test Set...")
    predictions = model.predict(X_test)
    
    # Calculate Metrics
    mae = mean_absolute_error(y_test, predictions)
    rmse = np.sqrt(mean_squared_error(y_test, predictions))
    r2 = r2_score(y_test, predictions)
    
    print("\n================ EVALUATION METRICS ================")
    print(f"Mean Absolute Error (MAE): ₹{mae:.2f} Crores")
    print(f"  -> (On average, our model's cost overrun prediction is off by ₹{mae:.2f} Crores)")
    print(f"Root Mean Squared Error (RMSE): ₹{rmse:.2f} Crores")
    print(f"R-Squared (R2) Score: {r2:.4f}")
    if r2 > 0:
        print(f"  -> (Our model explains {r2*100:.1f}% of the variance in cost overruns)")
    else:
        print(f"  -> (Our model struggles to explain the variance. R2 is negative or zero.)")
    print("====================================================")
    
    # For a real run, we would generate SHAP plots here.
    # Since we are running in an automated environment without a display, 
    # we'll skip generating actual .png files for now, but we can print feature importances.
    
    importances = model.feature_importances_
    feature_names = X_test.columns
    
    print("\nFeature Importances (What drove the predictions?):")
    feat_imps = sorted(zip(feature_names, importances), key=lambda x: x[1], reverse=True)
    for feat, imp in feat_imps:
        print(f"  - {feat}: {imp*100:.1f}%")

if __name__ == "__main__":
    evaluate_model()
