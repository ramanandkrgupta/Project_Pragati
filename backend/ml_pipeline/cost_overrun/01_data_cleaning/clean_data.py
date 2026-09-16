import pandas as pd
import numpy as np
import os

def clean_data():
    print("--- 01: DATA CLEANING ---")
    # Define paths
    input_file = "master_project_data.csv"
    output_dir = "output/data"
    output_file = os.path.join(output_dir, "clean_cost_data.csv")
    
    os.makedirs(output_dir, exist_ok=True)
    
    print(f"Loading raw data from {input_file}...")
    df = pd.read_csv(input_file)
    initial_shape = df.shape
    
    # Clean strings and convert to numeric
    for col in ['approved_cost', 'revised_cost']:
        # Convert all to string first to handle any mixed types
        df[col] = df[col].astype(str).str.replace(',', '').str.replace(' ', '').str.replace('₹', '')
        # Coerce to numeric (invalid parsing will be set as NaN)
        df[col] = pd.to_numeric(df[col], errors='coerce')
    
    # Drop rows that couldn't be converted to numbers or are missing
    df = df.dropna(subset=['approved_cost', 'revised_cost'])
    
    # Calculate the Target Variable: Exact Cost Overrun (in Crores)
    df['cost_overrun_cr'] = df['revised_cost'] - df['approved_cost']
    
    # We also calculate percentage for analysis
    df['cost_overrun_pct'] = np.where(
        df['approved_cost'] > 0, 
        (df['cost_overrun_cr'] / df['approved_cost']) * 100, 
        0
    )
    
    # Filter out projects with negative overruns if we only want strictly overrun projects,
    # OR keep them to let the model learn under-budget projects too. 
    # Let's keep them as realistic Regression targets.
    
    # Fill missing categorical variables with 'Unknown'
    cat_cols = ['sector', 'state', 'implementing_agency', 'ministry']
    for col in cat_cols:
        if col in df.columns:
            df[col] = df[col].fillna('Unknown')
            
    # Save the clean dataset
    df.to_csv(output_file, index=False)
    
    print(f"Data cleaned. Rows dropped: {initial_shape[0] - df.shape[0]}")
    print(f"Clean dataset saved to {output_file}")
    print(f"Final shape: {df.shape}")

if __name__ == "__main__":
    clean_data()
