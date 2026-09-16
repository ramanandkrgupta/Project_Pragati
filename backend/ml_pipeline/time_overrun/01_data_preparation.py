import pandas as pd
import sqlite3
import numpy as np
import os
import joblib

def prepare_time_overrun_data():
    print("--- 01: TIME OVERRUN DATA PREP ---")
    db_path = "paimana.db"
    conn = sqlite3.connect(db_path)
    
    # We fetch the latest snapshot for each project to train the model
    # We want features that indicate a project is falling behind
    query = """
    SELECT 
        p.project_id,
        p.sector,
        p.planned_duration_months,
        s.physical_progress,
        s.planned_progress,
        s.financial_progress,
        s.expenditure_ratio,
        s.milestones_completed,
        s.milestones_total,
        s.milestones_overdue
    FROM projects p
    JOIN project_snapshots s ON p.project_id = s.project_id
    WHERE s.report_date = (
        SELECT MAX(report_date) FROM project_snapshots WHERE project_id = p.project_id
    )
    """
    df = pd.read_sql(query, conn)
    conn.close()
    
    # Fill missing values
    df = df.fillna(0)
    
    # Engineer the Target Variable (Months of Delay)
    # We assume delay is proportional to the gap between planned and physical progress
    # e.g. if 50% planned but 25% done, you are 25% behind. 25% of a 40 month project = 10 months delayed.
    # We add some random noise so the ML model actually has to learn the non-linear relationship
    progress_gap = (df['planned_progress'] - df['physical_progress']) / 100.0
    progress_gap = np.maximum(0, progress_gap) # No negative delays
    
    # Add impact of overdue milestones (each overdue milestone adds ~0.5 months delay)
    milestone_impact = df['milestones_overdue'] * 0.5
    
    # Calculate target (Delay in Months)
    base_delay = (progress_gap * df['planned_duration_months']) + milestone_impact
    # Add 5% noise to make it realistic
    noise = np.random.normal(0, base_delay * 0.05)
    df['target_delay_months'] = np.maximum(0, base_delay + noise).round(1)
    
    print(f"Extracted {len(df)} projects for Time Overrun training.")
    print(f"Average delay: {df['target_delay_months'].mean():.1f} months")
    
    # Select features
    features = [
        'sector', 'planned_duration_months', 'physical_progress', 'planned_progress',
        'financial_progress', 'expenditure_ratio', 'milestones_completed',
        'milestones_total', 'milestones_overdue'
    ]
    
    X = df[features]
    y = df['target_delay_months']
    
    output_dir = "output/data/time_overrun"
    os.makedirs(output_dir, exist_ok=True)
    
    from sklearn.model_selection import train_test_split
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    X_train.to_csv(f"{output_dir}/X_train.csv", index=False)
    X_test.to_csv(f"{output_dir}/X_test.csv", index=False)
    y_train.to_csv(f"{output_dir}/y_train.csv", index=False)
    y_test.to_csv(f"{output_dir}/y_test.csv", index=False)
    
    print(f"Saved prepared time overrun data to {output_dir}")

if __name__ == "__main__":
    prepare_time_overrun_data()
