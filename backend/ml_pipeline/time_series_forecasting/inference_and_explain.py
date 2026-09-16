import torch
import numpy as np
import shap
import joblib
import json
from .lstm_architecture import ProjectForecasterLSTM

def inference_and_explain():
    print("--- 04: LSTM INFERENCE & EXPLAINABILITY ---")
    
    output_dir = "output/data/time_series"
    model_dir = "output/models"
    
    # Load scaling and datasets
    scaler = joblib.load(f"{output_dir}/ts_scaler.pkl")
    X_test = np.load(f"{output_dir}/X_test.npy")
    y_test = np.load(f"{output_dir}/y_test.npy")
    
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    
    model = ProjectForecasterLSTM(input_dim=4, hidden_dim=64, num_layers=2, output_dim=2, forecast_horizon=3)
    model.load_state_dict(torch.load(f"{model_dir}/lstm_forecaster.pth"))
    model.to(device)
    model.eval()
    
    # Pick a random project from test set
    idx = 0 
    sample_seq = torch.tensor(X_test[idx:idx+1], dtype=torch.float32).to(device)
    
    print("\n[INFERENCE]")
    with torch.no_grad():
        forecast = model(sample_seq)
        
    forecast_np = forecast.cpu().numpy()[0] # Shape: (3, 2)
    
    print(f"Forecasted next 3 months (scaled values): {forecast_np}")
    
    # In a real scenario, we inverse-transform these back to absolute numbers (Crores & Percentages)
    # Since we scaled physical_progress, financial_progress, expenditure, revised_cost
    # Our output is revised_cost (index 3) and physical_progress (index 0)
    
    print("\n[EXPLAINABILITY - DeepExplainer]")
    print("Initializing SHAP DeepExplainer to understand WHY the model made this forecast...")
    
    # We use a background dataset (e.g. first 100 samples from train set) to integrate over
    # But for a quick test, we'll use a small subset of X_test
    background = torch.tensor(X_test[:50], dtype=torch.float32).to(device)
    
    try:
        # SHAP DeepExplainer is experimental for LSTMs, but works well for many architectures
        explainer = shap.DeepExplainer(model, background)
        shap_values = explainer.shap_values(sample_seq)
        
        print("SHAP values calculated successfully. The API will use this to generate natural language explanations.")
        print(f"Example shape of SHAP explanation for the first forecast step: {np.array(shap_values).shape}")
    except Exception as e:
        print(f"Note: SHAP DeepExplainer encountered an issue (common with complex multi-layer LSTMs in PyTorch). Fallback to gradient explainer or simpler attribution methods can be used.")
        print(f"Error: {e}")

    print("\nAPI Response Mockup:")
    api_response = {
        "project_id": "Example Project",
        "forecast": {
            "month_1": {"predicted_cost_cr": "2800", "predicted_physical_progress": "85%"},
            "month_2": {"predicted_cost_cr": "2850", "predicted_physical_progress": "88%"},
            "month_3": {"predicted_cost_cr": "2900", "predicted_physical_progress": "90%"}
        },
        "completion_estimate": "Estimated to hit 100% in 5 months based on current velocity.",
        "ai_explanation": "Predicted cost increase driven by stagnation in physical_progress over the last 3 months while expenditure continued to rise."
    }
    
    print(json.dumps(api_response, indent=2))

if __name__ == "__main__":
    inference_and_explain()
