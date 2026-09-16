import sqlite3
import pandas as pd
import numpy as np
import torch
import joblib
import os
from tqdm import tqdm
import datetime
import sys
import pathlib

BASE_DIR = pathlib.Path(__file__).resolve().parent.parent.parent
sys.path.append(str(BASE_DIR))

from ml_pipeline.time_series_forecasting.lstm_architecture import ProjectForecasterLSTM

def run_batch_inference():
    print("--- 01: BATCH INFERENCE (EARLY WARNING SYSTEM) ---")
    db_path = str(BASE_DIR / "paimana.db")
    
    # Load Models
    print("Loading ML Models...")
    try:
        # Risk Model
        risk_pipeline = joblib.load(str(BASE_DIR / "output/models/best_classification_pipeline.pkl"))
        
        # LSTM Model
        lstm_path = str(BASE_DIR / "output/models/lstm_forecaster.pth")
        scaler_path = str(BASE_DIR / "output/data/time_series/ts_scaler.pkl")
        lstm_model = ProjectForecasterLSTM(input_dim=4, hidden_dim=64, num_layers=2, output_dim=2, forecast_horizon=3)
        lstm_model.load_state_dict(torch.load(lstm_path, map_location=torch.device('cpu'), weights_only=True))
        lstm_model.eval()
        ts_scaler = joblib.load(scaler_path)
        
        # Time Overrun Model
        time_overrun_model = joblib.load(str(BASE_DIR / "output/models/time_overrun_gb.pkl"))
        
    except Exception as e:
        print(f"Failed to load models: {e}")
        return
        
    conn = sqlite3.connect(db_path)
    
    # Get all projects
    projects_df = pd.read_sql_query("SELECT * FROM projects", conn)
    
    warnings_data = []
    
    print(f"Running inference on {len(projects_df)} projects...")
    for idx, row in tqdm(projects_df.iterrows(), total=len(projects_df)):
        project_id = row['project_id']
        project_name = row['project_name']
        approved_cost = float(row['approved_cost'])
        
        # Fetch snapshots for this project
        snaps_df = pd.read_sql_query("SELECT * FROM project_snapshots WHERE project_id = ? ORDER BY report_date ASC", conn, params=(project_id,))
        if snaps_df.empty:
            continue
            
        latest_snap = snaps_df.iloc[-1].copy()
        
        # 1. RISK SCORING
        first_snap = snaps_df.iloc[0]
        risk_input = pd.DataFrame([{
            "sector": first_snap['sector'],
            "state": first_snap['state'],
            "implementing_agency": first_snap['implementing_agency'],
            "approved_cost": first_snap['approved_cost'],
            "planned_duration_months": first_snap['planned_duration_months']
        }])
        
        try:
            risk_prob = float(risk_pipeline.predict_proba(risk_input)[0][1])
            risk_level = "High" if risk_prob >= 0.7 else "Medium" if risk_prob >= 0.4 else "Low"
        except:
            risk_prob = 0.0
            risk_level = "Unknown"
            
        # 2. TIME OVERRUN
        time_features = [
            'sector', 'planned_duration_months', 'physical_progress', 'planned_progress',
            'financial_progress', 'expenditure_ratio', 'milestones_completed',
            'milestones_total', 'milestones_overdue'
        ]
        time_input = pd.DataFrame([{f: latest_snap.get(f, 0) for f in time_features}])
        time_input = time_input.fillna(0)
        
        try:
            predicted_delay = float(time_overrun_model.predict(time_input)[0])
            predicted_delay = max(0.0, round(predicted_delay, 1))
        except:
            predicted_delay = 0.0
            
        has_time_delay = int(predicted_delay > 0)
            
        # 3. COST OVERRUN (LSTM)
        if len(snaps_df) >= 6:
            recent_history = snaps_df.tail(6).copy()
            lstm_features = ['physical_progress', 'financial_progress', 'expenditure', 'revised_cost']
            recent_history[lstm_features] = recent_history[lstm_features].fillna(0)
            
            raw_data = recent_history[lstm_features].values
            scaled_data = ts_scaler.transform(raw_data)
            input_seq = torch.tensor([scaled_data], dtype=torch.float32)
            
            with torch.no_grad():
                forecast = lstm_model(input_seq)
            forecast_np = forecast.numpy()[0]
            
            dummy = np.zeros((3, 4))
            dummy[:, 3] = forecast_np[:, 0]
            dummy[:, 0] = forecast_np[:, 1]
            inversed = ts_scaler.inverse_transform(dummy)
            
            # Predict highest cost in next 3 months
            predicted_costs = inversed[:, 3]
            max_predicted_cost = max(predicted_costs)
            predicted_cost = max(max_predicted_cost, float(recent_history.iloc[-1]['revised_cost']))
        else:
            val = latest_snap.get('revised_cost')
            predicted_cost = float(val) if pd.notna(val) else float(approved_cost)
            
        predicted_cost = round(predicted_cost, 2)
        has_cost_overrun = int(predicted_cost > approved_cost * 1.05) # If cost is > 5% of approved
        
        # Append to results
        warnings_data.append({
            "project_id": project_id,
            "project_name": project_name,
            "risk_level": risk_level,
            "risk_probability": round(risk_prob, 4),
            "predicted_delay_months": predicted_delay,
            "predicted_cost_cr": predicted_cost,
            "has_cost_overrun": has_cost_overrun,
            "has_time_delay": has_time_delay,
            "last_updated": datetime.datetime.now().isoformat()
        })
        
    print("Inference complete. Saving to database...")
    warnings_df = pd.DataFrame(warnings_data)
    
    # Save to SQLite
    warnings_df.to_sql("early_warnings", conn, if_exists="replace", index=False)
    
    # Create indexes for fast filtering
    conn.execute("CREATE INDEX IF NOT EXISTS idx_warnings_risk ON early_warnings (risk_level);")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_warnings_cost ON early_warnings (has_cost_overrun);")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_warnings_time ON early_warnings (has_time_delay);")
    
    conn.close()
    
    print(f"Successfully generated Early Warnings for {len(warnings_df)} projects.")

if __name__ == "__main__":
    run_batch_inference()
