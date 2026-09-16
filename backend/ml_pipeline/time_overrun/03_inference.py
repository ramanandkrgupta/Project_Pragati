import pandas as pd
import joblib
import shap
import json

def test_inference():
    print("--- 03: TIME OVERRUN INFERENCE & SHAP ---")
    
    data_dir = "output/data/time_overrun"
    model_dir = "output/models"
    
    X_test = pd.read_csv(f"{data_dir}/X_test.csv")
    model = joblib.load(f"{model_dir}/time_overrun_gb.pkl")
    
    sample = X_test.iloc[[0]]
    
    # Predict
    predicted_delay = model.predict(sample)[0]
    planned_duration = sample['planned_duration_months'].values[0]
    total_duration = planned_duration + predicted_delay
    
    # SHAP Explanation
    explainer = shap.TreeExplainer(model)
    shap_values = explainer.shap_values(sample)
    
    # Sort feature impacts
    impacts = []
    for i, col in enumerate(sample.columns):
        val = shap_values[0][i]
        impacts.append({
            "feature": col,
            "value": float(sample[col].values[0]),
            "impact": float(val)
        })
        
    impacts.sort(key=lambda x: abs(x["impact"]), reverse=True)
    
    print("\nAPI Response Mockup:")
    response = {
        "project_id": "Example Project",
        "planned_duration_months": int(planned_duration),
        "predicted_delay_months": round(predicted_delay, 1),
        "predicted_total_duration": round(total_duration, 1),
        "risk_level": "High" if predicted_delay > 6 else "Medium" if predicted_delay > 2 else "Low",
        "top_delay_factors": impacts[:3]
    }
    
    print(json.dumps(response, indent=2))

if __name__ == "__main__":
    test_inference()
