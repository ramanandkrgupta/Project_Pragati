import sqlite3
import pandas as pd
import numpy as np
from sklearn.ensemble import GradientBoostingRegressor
import json
import os
import pathlib

BASE_DIR = pathlib.Path(__file__).resolve().parent.parent.parent

def extract_global_drivers():
    print("--- 01: GLOBAL COST ESCALATION DRIVER ANALYSIS ---")
    
    conn = sqlite3.connect(str(BASE_DIR / "paimana.db"))
    
    # We join projects with early_warnings to get the predicted cost overruns
    query = """
    SELECT 
        p.project_id,
        p.planned_duration_months,
        p.approved_cost,
        s.physical_progress,
        s.financial_progress,
        s.milestones_completed,
        s.milestones_total,
        s.milestones_overdue,
        e.predicted_cost_cr,
        e.predicted_delay_months
    FROM projects p
    JOIN early_warnings e ON p.project_id = e.project_id
    JOIN (
        SELECT project_id, physical_progress, financial_progress, milestones_completed, milestones_total, milestones_overdue
        FROM project_snapshots
        GROUP BY project_id
        HAVING report_date = MAX(report_date)
    ) s ON p.project_id = s.project_id
    """
    df = pd.read_sql_query(query, conn)
    conn.close()
    
    df = df.fillna(0)
    
    # Target: Cost Escalation %
    df = df[df['approved_cost'] > 0] # Avoid division by zero
    y = (df['predicted_cost_cr'] / df['approved_cost'] - 1) * 100
    y = y.replace([np.inf, -np.inf], np.nan).fillna(0)
    y = y.clip(lower=0) # We only care about positive escalation
    
    features = [
        'planned_duration_months', 
        'physical_progress', 
        'financial_progress',
        'milestones_completed',
        'milestones_total',
        'milestones_overdue',
        'predicted_delay_months'
    ]
    X = df[features]
    
    # Train Global Explainer
    print("Training Global Gradient Boosting Regressor for Driver Extraction...")
    model = GradientBoostingRegressor(n_estimators=100, random_state=42)
    model.fit(X, y)
    
    # Extract Feature Importances
    importances = model.feature_importances_
    
    # Map to human-readable driver names for the SIH prototype
    driver_map = {
        'predicted_delay_months': 'Compounding Time Delays (Months)',
        'milestones_overdue': 'Regulatory & Administrative Bottlenecks (Milestones)',
        'planned_duration_months': 'Project Scale & Complexity',
        'physical_progress': 'Execution Stagnation',
        'financial_progress': 'Fund Disbursement Issues',
        'milestones_total': 'Scope Creep / High Milestone Count',
        'milestones_completed': 'Lack of Completion Momentum'
    }
    
    drivers = []
    for i, col in enumerate(features):
        drivers.append({
            "driver_key": col,
            "driver_name": driver_map.get(col, col),
            "importance_score": round(float(importances[i]) * 100, 2), # Scale to 0-100
            "correlation": "Positive" if col in ['predicted_delay_months', 'milestones_overdue', 'planned_duration_months', 'milestones_total'] else "Negative"
        })
        
    # Sort by importance
    drivers.sort(key=lambda x: x['importance_score'], reverse=True)
    
    # Calculate some macro statistics for the API
    macro_stats = {
        "average_national_escalation_pct": round(y.mean(), 2),
        "projects_with_escalation": int((y > 5).sum()), # > 5% overrun
        "top_driver": drivers[0]['driver_name']
    }
    
    output_data = {
        "macro_stats": macro_stats,
        "global_drivers": drivers
    }
    
    output_dir = BASE_DIR / "output" / "data"
    os.makedirs(output_dir, exist_ok=True)
    
    out_path = output_dir / "global_cost_drivers.json"
    with open(out_path, "w") as f:
        json.dump(output_data, f, indent=4)
        
    print(f"Successfully extracted {len(drivers)} Global Cost Drivers.")
    print(f"Saved to {out_path}")

if __name__ == "__main__":
    extract_global_drivers()
