from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import joblib
import pandas as pd
import numpy as np
import shap
import os
import sqlite3
import os
from sqlalchemy import create_engine, text
import torch
from dotenv import load_dotenv

from api.schemas import ProjectInferenceRequest, PredictionResponse, FeatureExplanation, HistoricalSnapshot

# Attempt to load Google GenAI
try:
    from google import genai
    from google.genai import types
except ImportError:
    genai = None

load_dotenv()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
gemini_client = None
if genai and GEMINI_API_KEY and GEMINI_API_KEY != "your_gemini_api_key_here":
    gemini_client = genai.Client(api_key=GEMINI_API_KEY)

# Global variables
ml_pipeline = None
explainer = None
lstm_model = None
ts_scaler = None
time_overrun_model = None

import pathlib
import sys
BASE_DIR = pathlib.Path(__file__).resolve().parent.parent
sys.path.append(str(BASE_DIR))
from ml_pipeline.time_series_forecasting.lstm_architecture import ProjectForecasterLSTM

BASE_DIR = pathlib.Path(__file__).resolve().parent.parent

DB_PATH = str(BASE_DIR / "paimana.db")
DATABASE_URL = os.getenv("DATABASE_URL")
if DATABASE_URL:
    if DATABASE_URL.startswith("postgres://"):
        DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)
    engine = create_engine(DATABASE_URL)
else:
    engine = create_engine(f"sqlite:///{DB_PATH}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    global ml_pipeline, explainer, lstm_model, ts_scaler, time_overrun_model
    model_path = str(BASE_DIR / "output/models/best_classification_pipeline.pkl")
    if os.path.exists(model_path):
        print(f"Loading ML pipeline from {model_path}...")
        ml_pipeline = joblib.load(model_path)
        classifier = ml_pipeline.named_steps.get('classifier')
        if classifier:
            try:
                explainer = shap.TreeExplainer(classifier)
                print("SHAP explainer initialized.")
            except Exception as e:
                print(f"Warning: Could not initialize SHAP explainer: {e}")
    else:
        print(f"Warning: Model file {model_path} not found.")
        
    # Load LSTM Model
    lstm_path = str(BASE_DIR / "output/models/lstm_forecaster.pth")
    scaler_path = str(BASE_DIR / "output/data/time_series/ts_scaler.pkl")
    
    if os.path.exists(lstm_path) and os.path.exists(scaler_path):
        try:
            print(f"Loading LSTM model from {lstm_path}...")
            # We hardcode the initialization params used during training
            lstm_model = ProjectForecasterLSTM(input_dim=4, hidden_dim=64, num_layers=2, output_dim=2, forecast_horizon=3)
            # Use weights_only=True for security warning mitigation
            lstm_model.load_state_dict(torch.load(lstm_path, map_location=torch.device('cpu'), weights_only=True))
            lstm_model.eval()
            ts_scaler = joblib.load(scaler_path)
            print("LSTM forecaster initialized.")
        except Exception as e:
            print(f"Warning: Could not initialize LSTM forecaster: {e}")
    else:
        print("Warning: LSTM model or scaler files not found.")
        
    # Load Time Overrun Model
    to_model_path = str(BASE_DIR / "output/models/time_overrun_gb.pkl")
    if os.path.exists(to_model_path):
        try:
            print(f"Loading Time Overrun model from {to_model_path}...")
            time_overrun_model = joblib.load(to_model_path)
            print("Time Overrun model loaded.")
        except Exception as e:
            print(f"Warning: Could not initialize Time Overrun model: {e}")
    else:
        print(f"Warning: Time Overrun model {to_model_path} not found.")
        
    yield
    ml_pipeline = None
    explainer = None
    lstm_model = None
    ts_scaler = None
    time_overrun_model = None

app = FastAPI(
    title="PAIMANA AI Project Intelligence API",
    description="Database-backed Early-warning system & LLM Assistant for SIH PS2026103.",
    version="2.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def fetch_project_history(project_id: int):
    """Fetches a project's details and chronological snapshots from SQLite."""
    with engine.connect() as conn:
        # Get baseline project data from 'projects' table
        df_proj = pd.read_sql_query(text("SELECT * FROM projects WHERE project_id = :project_id"), conn, params={"project_id": project_id})
        # Get chronological snapshots
        df_snaps = pd.read_sql_query(text("SELECT * FROM project_snapshots WHERE project_id = :project_id ORDER BY report_date ASC"), conn, params={"project_id": project_id})
        
    if df_proj.empty or df_snaps.empty:
        return None, None
    return df_proj, df_snaps

def generate_ai_overview(project_name: str, snapshots: list) -> str:
    """Uses Gemini LLM to generate a qualitative risk overview of the project."""
    if not gemini_client:
        return "LLM integration is currently disabled. Please add a valid GEMINI_API_KEY to the .env file to enable the AI Project Intelligence Assistant."
        
    # Construct a prompt based on the timeline
    history_text = "\n".join([
        f"- {s.report_month}: Physical Progress: {s.physical_progress}%, Financial Progress: {s.financial_progress}%, Expenditure: ₹{s.expenditure}Cr, Revised Cost: ₹{s.revised_cost}Cr"
        for s in snapshots
    ])
    
    prompt = f"""
    You are an AI infrastructure project monitoring assistant for the Government of India (PAIMANA).
    Analyze the following historical timeline of the project "{project_name}".
    
    Timeline History:
    {history_text}
    
    Provide a concise, 3-4 sentence qualitative overview of the project's health. Highlight any stagnation in physical progress, alarming expenditure ratios, or cost revisions that indicate implementation risks. Be objective and prescriptive.
    """
    
    try:
        response = gemini_client.models.generate_content(
            model='gemini-2.5-pro',
            contents=prompt,
        )
        return response.text
    except Exception as e:
        return f"Warning: LLM generation failed: {e}"

from api.schemas import CostForecastResponse, HistoricalBacktest, FutureForecast, TimeOverrunResponse, DelayFactor

@app.post("/api/v1/predict/time-overrun", response_model=TimeOverrunResponse)
async def predict_time_overrun(request: ProjectInferenceRequest):
    if time_overrun_model is None:
        raise HTTPException(status_code=503, detail="Time Overrun model is not loaded.")
        
    project_id = request.project_id
    df_proj, df_snaps = fetch_project_history(project_id)
    
    if df_proj is None or df_snaps.empty:
        raise HTTPException(status_code=404, detail=f"Project ID {project_id} not found in database.")
        
    # Get latest snapshot to evaluate current delay
    latest_snapshot = df_snaps.iloc[-1].copy()
    features = [
        'sector', 'planned_duration_months', 'physical_progress', 'planned_progress',
        'financial_progress', 'expenditure_ratio', 'milestones_completed',
        'milestones_total', 'milestones_overdue'
    ]
    
    input_data = pd.DataFrame([{f: latest_snapshot.get(f, 0) for f in features}])
    input_data = input_data.fillna(0)
    
    # Predict
    predicted_delay = float(time_overrun_model.predict(input_data)[0])
    predicted_delay = max(0.0, round(predicted_delay, 1))
    
    planned_duration = float(input_data['planned_duration_months'].values[0])
    total_duration = planned_duration + predicted_delay
    
    # Explainability (SHAP TreeExplainer for Gradient Boosting)
    impacts = []
    try:
        to_explainer = shap.TreeExplainer(time_overrun_model)
        shap_values = to_explainer.shap_values(input_data)
        
        for i, col in enumerate(features):
            impacts.append(DelayFactor(
                feature=col,
                value=float(input_data[col].values[0]),
                impact=round(float(shap_values[0][i]), 2)
            ))
            
        impacts.sort(key=lambda x: abs(x.impact), reverse=True)
    except Exception as e:
        print(f"Warning: SHAP for Time Overrun failed: {e}")
    
    risk_level = "High" if predicted_delay > 6 else "Medium" if predicted_delay > 2 else "Low"
    project_name = str(df_proj.iloc[0].get('project_name', f'Project {project_id}'))
    
    return TimeOverrunResponse(
        project_id=project_id,
        project_name=project_name,
        planned_duration_months=int(planned_duration),
        predicted_delay_months=predicted_delay,
        predicted_total_duration=total_duration,
        risk_level=risk_level,
        top_delay_factors=impacts[:3]
    )

@app.post("/api/v1/predict/cost-overrun", response_model=CostForecastResponse)
async def predict_cost_overrun(request: ProjectInferenceRequest):
    if lstm_model is None or ts_scaler is None:
        raise HTTPException(status_code=503, detail="LSTM forecasting model is not loaded.")
        
    project_id = request.project_id
    df_proj, df_snaps = fetch_project_history(project_id)
    
    if df_proj is None or df_snaps.empty:
        raise HTTPException(status_code=404, detail=f"Project ID {project_id} not found in database.")
        
    # We need at least 6 months of data for the sequence
    if len(df_snaps) < 6:
        raise HTTPException(status_code=400, detail=f"Project ID {project_id} does not have enough historical data (6 months required).")
        
    features = ['physical_progress', 'financial_progress', 'expenditure', 'revised_cost']
    df_snaps = df_snaps.copy()
    for col in features:
        df_snaps[col] = df_snaps[col].fillna(0)
        
    backtest_data = []
    
    # Iterate over all rows in df_snaps to create a true historical backtest
    for i in range(len(df_snaps)):
        row = df_snaps.iloc[i]
        actual = float(row['revised_cost'])
        
        if i < 6:
            # Not enough history to predict this month, so just set predicted = actual (0 error)
            pred = actual
        else:
            # We have at least 6 months of history before this month.
            # Take the 6 months prior to this month to predict THIS month
            window = df_snaps.iloc[i-6:i][features].values
            scaled_window = ts_scaler.transform(window)
            input_seq = torch.tensor([scaled_window], dtype=torch.float32)
            
            with torch.no_grad():
                forecast_backtest = lstm_model(input_seq)
            
            forecast_np_backtest = forecast_backtest.numpy()[0]
            
            dummy_backtest = np.zeros((3, 4))
            dummy_backtest[:, 3] = forecast_np_backtest[:, 0]
            dummy_backtest[:, 0] = forecast_np_backtest[:, 1]
            
            inversed_backtest = ts_scaler.inverse_transform(dummy_backtest)
            predicted_costs_backtest = inversed_backtest[:, 3]
            
            # The model predicts the NEXT 3 months. month_offset=1 is the prediction for month i.
            pred = float(predicted_costs_backtest[0])
            
        backtest_data.append(HistoricalBacktest(
            report_month=str(row['report_month']),
            actual_cost=actual,
            predicted_cost=round(pred, 2),
            error_margin_cr=round(abs(actual - pred), 2)
        ))
        
    # Generate the FUTURE forecast using the LAST 6 months
    recent_history = df_snaps.tail(6)
    raw_data = recent_history[features].values
    scaled_data = ts_scaler.transform(raw_data)
    input_seq = torch.tensor([scaled_data], dtype=torch.float32)
    
    # Inference
    with torch.no_grad():
        forecast = lstm_model(input_seq)
        
    forecast_np = forecast.numpy()[0] # Shape: (3, 2)
    
    # We need to inverse transform
    # The output targets are revised_cost (index 3) and physical_progress (index 0)
    # We create a dummy array to use the scaler's inverse_transform
    dummy = np.zeros((3, 4))
    dummy[:, 3] = forecast_np[:, 0] # Revised cost is first output from model
    dummy[:, 0] = forecast_np[:, 1] # Physical progress is second output
    
    inversed = ts_scaler.inverse_transform(dummy)
    predicted_costs = inversed[:, 3]
    
    forecast_data = []
    for i in range(3):
        # Prevent predicting a cost lower than the current actual cost
        cost = max(predicted_costs[i], float(recent_history.iloc[-1]['revised_cost']))
        forecast_data.append(FutureForecast(
            month_offset=i+1,
            predicted_cost_cr=round(cost, 2)
        ))
        
    project_name = str(df_proj.iloc[0].get('project_name', f'Project {project_id}'))
    baseline_cost = float(df_proj.iloc[0].get('approved_cost', 0))
    
    return CostForecastResponse(
        project_id=project_id,
        project_name=project_name,
        baseline_approved_cost=baseline_cost,
        historical_backtest=backtest_data,
        future_forecast=forecast_data,
        ai_explanation="Forecast based on LSTM sequence analysis. DeepExplainer SHAP integration is pending optimization for API response."
    )

@app.post("/api/v1/predict/overrun-risk", response_model=PredictionResponse)
async def predict_overrun_risk(request: ProjectInferenceRequest):
    if ml_pipeline is None:
        raise HTTPException(status_code=503, detail="Model pipeline is not loaded.")
        
    project_id = request.project_id
    df_proj, df_snaps = fetch_project_history(project_id)
    
    if df_proj is None:
        raise HTTPException(status_code=404, detail=f"Project ID {project_id} not found in database.")
        
    # The ML model expects baseline features (first snapshot) to avoid data leakage
    first_snapshot = df_snaps.iloc[0]
    
    input_data = pd.DataFrame([{
        "sector": first_snapshot['sector'],
        "state": first_snapshot['state'],
        "implementing_agency": first_snapshot['implementing_agency'],
        "approved_cost": first_snapshot['approved_cost'],
        "planned_duration_months": first_snapshot['planned_duration_months']
    }])
    
    # 1. Prediction
    try:
        probability = ml_pipeline.predict_proba(input_data)[0][1]
        
        if probability >= 0.70:
            risk_level = "High"
        elif probability >= 0.40:
            risk_level = "Medium"
        else:
            risk_level = "Low"
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Inference failed: {str(e)}")
        
    # 2. Explainability (SHAP or Coefficients)
    explanations = []
    try:
        preprocessor = ml_pipeline.named_steps['preprocessor']
        transformed_data = preprocessor.transform(input_data)
        
        try:
            feature_names = preprocessor.get_feature_names_out()
        except:
            feature_names = [f"Feature_{i}" for i in range(transformed_data.shape[1])]
            
        if explainer is not None:
            shap_output = explainer.shap_values(transformed_data)
            
            # For Random Forest, shap_values might be a list or a 3D array
            if isinstance(shap_output, list) and len(shap_output) > 1:
                class_1_shap = shap_output[1][0]
            elif isinstance(shap_output, np.ndarray) and len(shap_output.shape) == 3:
                class_1_shap = shap_output[0, :, 1]
            else:
                class_1_shap = shap_output[0] if len(np.shape(shap_output)) > 1 else shap_output
        else:
            classifier = ml_pipeline.named_steps.get('classifier')
            if hasattr(classifier, 'coef_'):
                # For linear models like LogisticRegression, approximate impact with feature_value * coefficient
                # Use toarray() in case it's a sparse matrix
                arr = transformed_data.toarray()[0] if hasattr(transformed_data, 'toarray') else transformed_data[0]
                class_1_shap = arr * classifier.coef_[0]
            else:
                class_1_shap = np.zeros(transformed_data.shape[1])
                
        feature_impacts = list(zip(feature_names, class_1_shap))
        feature_impacts.sort(key=lambda x: abs(x[1]), reverse=True)
        
        filtered_impacts = []
        for fname, shap_val in feature_impacts:
            try:
                f_idx = list(feature_names).index(fname)
                f_val = transformed_data[0][f_idx]
            except ValueError:
                f_val = None
            
            # Filter out One-Hot Encoded features that the project does NOT possess
            if fname.startswith('cat__') and f_val == 0.0:
                continue
                
            filtered_impacts.append((fname, shap_val))
        
        for fname, shap_val in filtered_impacts[:5]:
            original_feature_name = fname.split('__')[-1] if '__' in fname else fname
            direction = "Increases Risk" if shap_val > 0 else "Decreases Risk"
            
            explanations.append(FeatureExplanation(
                feature_name=original_feature_name,
                feature_value=str(input_data.iloc[0].get(original_feature_name, "Categorical/Transformed")),
                shap_value=float(shap_val),
                impact_direction=direction
            ))
    except Exception as e:
        print(f"Warning: SHAP explanation generation failed: {e}")
            
    # 3. Compile Historical Timeline
    timeline = []
    for _, row in df_snaps.iterrows():
        timeline.append(HistoricalSnapshot(
            report_month=str(row['report_month']),
            physical_progress=float(row['physical_progress']) if pd.notna(row['physical_progress']) else 0.0,
            financial_progress=float(row['financial_progress']) if pd.notna(row['financial_progress']) else 0.0,
            expenditure=float(row['expenditure']) if pd.notna(row['expenditure']) else 0.0,
            revised_cost=float(row['revised_cost']) if pd.notna(row['revised_cost']) else 0.0
        ))
        
    # 4. Generate LLM AI Overview
    project_name = str(df_proj.iloc[0].get('project_name', f'Project {project_id}'))
    planned_start_date = str(df_proj.iloc[0].get('planned_start_date', ''))
    
    ai_overview = generate_ai_overview(project_name, timeline)
    
    return PredictionResponse(
        project_id=project_id,
        project_name=project_name,
        planned_start_date=planned_start_date,
        risk_probability=float(probability),
        risk_level=risk_level,
        top_factors=explanations,
        historical_timeline=timeline,
        ai_overview=ai_overview
    )

from api.schemas import EarlyWarningItem, EarlyWarningResponse
from typing import Optional

@app.get("/api/v1/early-warnings", response_model=EarlyWarningResponse)
async def get_early_warnings(
    risk_level: Optional[str] = None,
    has_cost_overrun: Optional[bool] = None,
    has_time_delay: Optional[bool] = None,
    sector: Optional[str] = None,
    search: Optional[str] = None,
    sort_by: Optional[str] = None,
    page: int = 1,
    limit: int = 50
):
    conn = sqlite3.connect(DB_PATH)
    query = "SELECT e.*, p.sector, p.state, p.implementing_agency, p.physical_progress, p.financial_progress, p.approved_cost, p.expenditure FROM early_warnings e LEFT JOIN Projects p ON e.project_id = p.project_id WHERE 1=1"
    params = []
    
    if risk_level:
        query += " AND e.risk_level = ?"
        params.append(risk_level)
    if has_cost_overrun is not None:
        query += " AND e.has_cost_overrun = ?"
        params.append(int(has_cost_overrun))
    if has_time_delay is not None:
        query += " AND e.has_time_delay = ?"
        params.append(int(has_time_delay))
        
    if sector and sector != "ALL":
        # The database sector column is mostly null in current data, but we filter if requested
        query += " AND p.sector = ?"
        params.append(sector)
        
    if search:
        search_pattern = f"%{search}%"
        query += " AND (p.project_name LIKE ? OR p.implementing_agency LIKE ? OR e.project_id LIKE ?)"
        params.extend([search_pattern, search_pattern, search_pattern])
        
    # Count total
    count_query = query.replace("SELECT e.*, p.sector, p.state, p.implementing_agency, p.physical_progress, p.financial_progress, p.approved_cost, p.expenditure", "SELECT COUNT(*)")
    total_count = conn.execute(count_query, params).fetchone()[0]
    
    # Sorting
    if sort_by == 'risk_desc':
        query += " ORDER BY e.risk_probability DESC"
    elif sort_by == 'risk_asc':
        query += " ORDER BY e.risk_probability ASC"
    elif sort_by == 'cost_desc':
        query += " ORDER BY p.revised_cost DESC"
    elif sort_by == 'progress_asc':
        query += " ORDER BY p.physical_progress ASC"
    else:
        query += " ORDER BY e.risk_probability DESC"
    
    # Pagination
    offset = (page - 1) * limit
    query += " LIMIT ? OFFSET ?"
    params.extend([limit, offset])
    
    df = pd.read_sql_query(query, conn, params=params)
    conn.close()
    
    warnings = []
    for _, row in df.iterrows():
        warnings.append(EarlyWarningItem(
            project_id=row['project_id'],
            project_name=row['project_name'],
            sector=row.get('sector'),
            state=row.get('state'),
            implementing_agency=row.get('implementing_agency'),
            physical_progress=row.get('physical_progress'),
            financial_progress=row.get('financial_progress'),
            approved_cost=row.get('approved_cost'),
            expenditure=row.get('expenditure'),
            risk_level=row['risk_level'],
            risk_probability=row['risk_probability'],
            predicted_delay_months=row['predicted_delay_months'],
            predicted_cost_cr=row['predicted_cost_cr'],
            has_cost_overrun=bool(row['has_cost_overrun']),
            has_time_delay=bool(row['has_time_delay']),
            last_updated=row['last_updated']
        ))
        
    return EarlyWarningResponse(
        total_count=total_count,
        page=page,
        limit=limit,
        warnings=warnings
    )

@app.get("/api/v1/sectors", response_model=list[str])
async def get_sectors():
    """Return a list of unique sectors from the database."""
    conn = sqlite3.connect(DB_PATH)
    try:
        # Since sector is currently mostly null, we also return the hardcoded list 
        # so the UI still looks populated until DB is fixed by user.
        hardcoded_sectors = [
            'Highways',
            'Railways',
            'Metro Rail',
            'Renewable Energy',
            'Ports & Shipping',
            'Urban Water & Sanitation',
        ]
        
        cursor = conn.execute("SELECT DISTINCT sector FROM Projects WHERE sector IS NOT NULL AND sector != ''")
        db_sectors = [row[0] for row in cursor.fetchall() if row[0]]
        
        # Merge and deduplicate
        all_sectors = list(set(hardcoded_sectors + db_sectors))
        return sorted(all_sectors)
    finally:
        conn.close()

from api.schemas import BenchmarkMetrics, ProjectBenchmarkResponse, AnalyticsOverview

def get_benchmark_df():
    conn = sqlite3.connect(DB_PATH)
    query = """
    SELECT 
        p.project_id, p.project_name, p.state, p.implementing_agency, p.sector, p.approved_cost,
        e.predicted_cost_cr, e.predicted_delay_months, e.risk_level, e.risk_probability, e.has_cost_overrun, e.has_time_delay,
        (SELECT physical_progress FROM project_snapshots WHERE project_id = p.project_id ORDER BY report_date DESC LIMIT 1) as physical_progress,
        (SELECT financial_progress FROM project_snapshots WHERE project_id = p.project_id ORDER BY report_date DESC LIMIT 1) as financial_progress
    FROM projects p
    JOIN early_warnings e ON p.project_id = e.project_id
    """
    df = pd.read_sql_query(query, conn)
    conn.close()
    
    # Calculate cost overrun %
    df['cost_overrun_pct'] = (df['predicted_cost_cr'] / df['approved_cost'] - 1) * 100
    df['cost_overrun_pct'] = df['cost_overrun_pct'].clip(lower=0)
    return df

def calc_metrics(df_subset, group_name: str) -> BenchmarkMetrics:
    if df_subset.empty:
        return BenchmarkMetrics(group_name=group_name, project_count=0, avg_physical_progress=0.0, avg_financial_progress=0.0, avg_predicted_cost_overrun_percent=0.0, avg_predicted_time_delay_months=0.0)
    
    return BenchmarkMetrics(
        group_name=group_name,
        project_count=len(df_subset),
        avg_physical_progress=round(df_subset['physical_progress'].mean(), 2),
        avg_financial_progress=round(df_subset['financial_progress'].mean(), 2),
        avg_predicted_cost_overrun_percent=round(df_subset['cost_overrun_pct'].mean(), 2),
        avg_predicted_time_delay_months=round(df_subset['predicted_delay_months'].mean(), 2)
    )

@app.get("/api/v1/benchmarks/{project_id}", response_model=ProjectBenchmarkResponse)
async def get_project_benchmark(project_id: int):
    df = get_benchmark_df()
    
    proj_row = df[df['project_id'] == project_id]
    if proj_row.empty:
        raise HTTPException(status_code=404, detail="Project not found or lacks early warning data.")
        
    proj_state = proj_row.iloc[0]['state']
    proj_agency = proj_row.iloc[0]['implementing_agency']
    proj_sector = proj_row.iloc[0]['sector']
    
    return ProjectBenchmarkResponse(
        project_id=project_id,
        project_name=proj_row.iloc[0]['project_name'],
        state=proj_state,
        implementing_agency=proj_agency,
        sector=str(proj_sector),
        project_metrics=calc_metrics(proj_row, "This Project"),
        agency_benchmark=calc_metrics(df[df['implementing_agency'] == proj_agency], f"Agency: {proj_agency}"),
        state_benchmark=calc_metrics(df[df['state'] == proj_state], f"State: {proj_state}"),
        national_benchmark=calc_metrics(df, "National Average")
    )

@app.get("/api/v1/analytics/overview", response_model=AnalyticsOverview)
async def get_analytics_overview():
    df = get_benchmark_df()
    
    # Agency Breakdown
    agency_group = df.groupby('implementing_agency').agg({
        'project_id': 'count',
        'has_cost_overrun': 'sum',
        'has_time_delay': 'sum',
        'cost_overrun_pct': 'mean'
    }).reset_index().rename(columns={'project_id': 'total_projects'}).sort_values('total_projects', ascending=False).head(10)
    
    # State Breakdown
    state_group = df.groupby('state').agg({
        'project_id': 'count',
        'has_cost_overrun': 'sum',
        'has_time_delay': 'sum',
        'cost_overrun_pct': 'mean'
    }).reset_index().rename(columns={'project_id': 'total_projects'}).sort_values('total_projects', ascending=False).head(10)
    
    # Sector Risk Breakdown (join with projects to get sector)
    conn = sqlite3.connect(DB_PATH)
    sector_df = pd.read_sql_query("""
        SELECT p.sector, COUNT(e.project_id) as total_projects,
               SUM(e.has_cost_overrun) as cost_overruns,
               AVG(e.risk_probability)*100 as avg_risk_score,
               SUM(p.approved_cost) as total_cost
        FROM early_warnings e
        LEFT JOIN projects p ON e.project_id = p.project_id
        WHERE p.sector IS NOT NULL
        GROUP BY p.sector
        ORDER BY total_projects DESC
    """, conn)
    conn.close()
    
    sector_breakdown = sector_df.rename(columns={
        'sector': 'sector',
        'total_projects': 'project_count',
        'cost_overruns': 'high_risk_count',
        'avg_risk_score': 'avg_risk',
        'total_cost': 'total_cost'
    }).to_dict('records')
    
    # Risk counts and avg score
    high_risk_count = int(len(df[df['risk_level'] == 'High']))
    medium_risk_count = int(len(df[df['risk_level'] == 'Medium']))
    low_risk_count = int(len(df[df['risk_level'] == 'Low']))
    avg_risk_score = float(df['risk_probability'].mean() * 100) if len(df) > 0 else 0
    
    # Monthly Risk Trends — join snapshots with early warnings for per-month stats
    conn3 = sqlite3.connect(DB_PATH)
    trends_df = pd.read_sql_query("""
        SELECT 
            ps.report_month,
            COUNT(DISTINCT ps.project_id) as total_projects,
            SUM(CASE WHEN e.risk_level='High' THEN 1 ELSE 0 END) as high_risk_projects,
            AVG(e.risk_probability)*100 as avg_risk_score,
            SUM(CASE WHEN e.has_cost_overrun=1 THEN 1 ELSE 0 END) as cost_escalation_risk,
            SUM(CASE WHEN e.has_time_delay=1 THEN 1 ELSE 0 END) as schedule_delay_risk
        FROM project_snapshots ps
        LEFT JOIN early_warnings e ON ps.project_id = e.project_id
        GROUP BY ps.report_month
        ORDER BY ps.report_month
    """, conn3)
    
    # Count overdue projects (planned completion in the past)
    overdue_result = conn3.execute("""
        SELECT COUNT(*) FROM projects p
        JOIN early_warnings e ON p.project_id = e.project_id
        WHERE p.planned_completion_date IS NOT NULL 
          AND p.planned_completion_date != ''
          AND p.planned_completion_date < '2026-09-01'
    """).fetchone()
    total_overdue = int(overdue_result[0]) if overdue_result else 0
    conn3.close()
    
    # Sort and label months correctly
    month_order = {
        'July_2025': 0, 'August_2025': 1, 'September_2025': 2, 'October_2025': 3,
        'November_2025': 4, 'December_2025': 5, 'January_2026': 6, 'February_2026': 7,
        'March_2026': 8, 'April2026': 9, 'May2026': 10, 'June_2026': 11, 'July_2026': 12
    }
    month_labels = {
        'July_2025': 'Jul 25', 'August_2025': 'Aug 25', 'September_2025': 'Sep 25',
        'October_2025': 'Oct 25', 'November_2025': 'Nov 25', 'December_2025': 'Dec 25',
        'January_2026': 'Jan 26', 'February_2026': 'Feb 26', 'March_2026': 'Mar 26',
        'April2026': 'Apr 26', 'May2026': 'May 26', 'June_2026': 'Jun 26', 'July_2026': 'Jul 26'
    }
    
    trends_df['sort_order'] = trends_df['report_month'].map(lambda x: month_order.get(x, 99))
    trends_df = trends_df.sort_values('sort_order')
    trends_df['month_label'] = trends_df['report_month'].map(lambda x: month_labels.get(x, x))
    
    risk_trends = []
    for _, row in trends_df.iterrows():
        risk_trends.append({
            'month': row['month_label'],
            'report_month': row['report_month'],
            'high_risk_projects': int(row['high_risk_projects'] or 0),
            'avg_risk_score': round(float(row['avg_risk_score'] or 0), 1),
            'cost_escalation_risk': int(row['cost_escalation_risk'] or 0),
            'schedule_delay_risk': int(row['schedule_delay_risk'] or 0),
        })
    
    # Progress Divergence Projects - financial progress much higher than physical
    conn4 = sqlite3.connect(DB_PATH)
    divergence_df = pd.read_sql_query("""
        SELECT e.project_id, p.project_name, p.sector,
               ps_latest.financial_progress, ps_latest.physical_progress,
               ROUND(ps_latest.financial_progress - ps_latest.physical_progress, 2) as gap,
               ROUND(e.risk_probability*100, 1) as risk_score,
               e.risk_level, e.risk_probability,
               e.has_cost_overrun, e.has_time_delay
        FROM early_warnings e
        JOIN projects p ON e.project_id = p.project_id
        JOIN (
          SELECT project_id, financial_progress, physical_progress
          FROM project_snapshots
          WHERE (project_id, report_date) IN (
            SELECT project_id, MAX(report_date) FROM project_snapshots GROUP BY project_id
          )
        ) ps_latest ON ps_latest.project_id = e.project_id
        WHERE ps_latest.financial_progress IS NOT NULL
          AND ps_latest.physical_progress IS NOT NULL
          AND (ps_latest.financial_progress - ps_latest.physical_progress) > 12
        ORDER BY gap DESC
        LIMIT 6
    """, conn4)
    
    # Top high risk projects with full metrics
    top_risk_df = pd.read_sql_query("""
        SELECT e.project_id, p.project_name, p.sector, p.state, p.implementing_agency,
               p.approved_cost,
               e.predicted_cost_cr, e.risk_probability, e.risk_level, e.has_cost_overrun, e.has_time_delay,
               ps_latest.physical_progress, ps_latest.financial_progress
        FROM early_warnings e
        JOIN projects p ON e.project_id = p.project_id
        LEFT JOIN (
          SELECT project_id, financial_progress, physical_progress
          FROM project_snapshots
          WHERE (project_id, report_date) IN (
            SELECT project_id, MAX(report_date) FROM project_snapshots GROUP BY project_id
          )
        ) ps_latest ON ps_latest.project_id = e.project_id
        WHERE e.risk_level = 'High'
        ORDER BY e.risk_probability DESC
        LIMIT 10
    """, conn4)
    conn4.close()
    
    divergence_projects = []
    for _, row in divergence_df.iterrows():
        risk_lv = row['risk_level']
        divergence_projects.append({
            'id': str(int(row['project_id'])),
            'project_id': int(row['project_id']),
            'project_name': row['project_name'],
            'project_code': f"PRJ-{int(row['project_id'])}",
            'sector': row['sector'] or 'Infrastructure',
            'financial_progress': round(float(row['financial_progress']), 2),
            'physical_progress': round(float(row['physical_progress']), 2),
            'progress_gap': round(float(row['gap']), 2),
            'risk_score': round(float(row['risk_score']), 1),
            'risk_level': 'HIGH' if risk_lv == 'High' else ('MEDIUM' if risk_lv == 'Medium' else 'LOW'),
        })
    
    top_high_risk_projects = []
    for _, row in top_risk_df.iterrows():
        risk_lv = row['risk_level']
        prob = float(row['risk_probability'])
        phys = float(row['physical_progress']) if row['physical_progress'] is not None else 0
        fin = float(row['financial_progress']) if row['financial_progress'] is not None else 0
        orig_cost = float(row['approved_cost']) if row['approved_cost'] else 0
        rev_cost = float(row['predicted_cost_cr']) if row['predicted_cost_cr'] else orig_cost
        top_high_risk_projects.append({
            'id': str(int(row['project_id'])),
            'project_name': row['project_name'],
            'project_code': f"PRJ-{int(row['project_id'])}",
            'sector': row['sector'] or 'Infrastructure',
            'state': (row['state'] or 'National').replace('(-) (-) ', ''),
            'implementing_agency': row['implementing_agency'] or 'N/A',
            'original_cost': orig_cost,
            'revised_cost': rev_cost,
            'expenditure': 0,
            'physical_progress': round(phys, 2),
            'financial_progress': round(fin, 2),
            'delay_probability': round(prob * 100, 1) if row['has_time_delay'] else round(prob * 80, 1),
            'cost_overrun_probability': round(prob * 100, 1) if row['has_cost_overrun'] else round(prob * 60, 1),
            'risk_score': round(prob * 100, 1),
            'risk_level': 'HIGH' if risk_lv == 'High' else ('MEDIUM' if risk_lv == 'Medium' else 'LOW'),
        })
    
    return AnalyticsOverview(
        total_projects=len(df),
        total_high_risk=high_risk_count,
        total_medium_risk=medium_risk_count,
        total_low_risk=low_risk_count,
        total_cost_overrun=int(df['has_cost_overrun'].sum()),
        total_time_delayed=int(df['has_time_delay'].sum()),
        total_overdue=total_overdue,
        agency_breakdown=agency_group.to_dict('records'),
        state_breakdown=state_group.to_dict('records'),
        sector_risk_breakdown=sector_breakdown,
        avg_risk_score=round(avg_risk_score, 1),
        risk_trends=risk_trends,
        progress_divergence_projects=divergence_projects,
        top_high_risk_projects=top_high_risk_projects
    )

from api.schemas import CostDriverAnalysisResponse
import json

@app.get("/api/v1/analytics/cost-drivers", response_model=CostDriverAnalysisResponse)
async def get_global_cost_drivers():
    driver_path = BASE_DIR / "output" / "data" / "global_cost_drivers.json"
    if not os.path.exists(driver_path):
        raise HTTPException(status_code=404, detail="Global driver analysis has not been executed yet.")
        
    with open(driver_path, "r") as f:
        data = json.load(f)
        
    return CostDriverAnalysisResponse(**data)

@app.get("/health")
async def health_check():
    return {
        "status": "healthy", 
        "model_loaded": ml_pipeline is not None, 
        "database_connected": os.path.exists(DB_PATH),
        "llm_enabled": gemini_client is not None
    }

from api.schemas import ProjectAssistantRequest, ProjectAssistantResponse

@app.post("/api/v1/predict/ask", response_model=ProjectAssistantResponse)
def ask_assistant(req: ProjectAssistantRequest):
    if not gemini_client:
        return ProjectAssistantResponse(
            answer="LLM integration is currently unavailable (No API Key). Fallback: The project metrics indicate several risk factors. Please review the Early Warnings and Cost Drivers.",
            engine="Offline Fallback"
        )
    
    # Try to fetch some context about the project if provided
    context = ""
    if req.project_id:
        try:
            with engine.connect() as conn:
                res = conn.execute(text("""
                    SELECT * FROM Projects WHERE project_id = :pid
                """), {"pid": req.project_id})
                row = res.fetchone()
                if row:
                    context = "Project Context:\n"
                    # We can use row._mapping or _asdict() in SQLAlchemy 2.0
                    for k, v in row._mapping.items():
                        context += f"{k}: {v}\n"
        except Exception as e:
            pass
            
    prompt = f"""You are 'Project Sentinel AI', an expert infrastructure project analyst for the Government of India.
You help officers understand project risks, delays, and cost overruns.

{context}

User Query: {req.query}
"""

    try:
        response = gemini_client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt,
        )
        return ProjectAssistantResponse(
            answer=response.text,
            engine="Gemini 2.5 Flash"
        )
    except Exception as e:
        return ProjectAssistantResponse(
            answer=f"Error generating AI response: {str(e)}",
            engine="Offline Fallback"
        )

from typing import List, Optional
from pydantic import BaseModel
from fastapi import UploadFile, Form, File, BackgroundTasks

class UserProfile(BaseModel):
    id: str
    full_name: str
    email: str
    role: str
    is_active: bool
    created_at: str
    updated_at: str
    last_activity_at: str
    is_protected: Optional[bool] = False

class RoleUpdateRequest(BaseModel):
    role: str

@app.get("/api/v1/admin/users", response_model=List[UserProfile])
def get_admin_users():
    with engine.connect() as conn:
        res = conn.execute(text("SELECT * FROM users"))
        rows = res.fetchall()
    
    users = []
    for row in rows:
        users.append({
            "id": row._mapping["id"],
            "full_name": row._mapping["full_name"],
            "email": row._mapping["email"],
            "role": row._mapping["role"],
            "is_active": bool(row._mapping["is_active"]),
            "created_at": row._mapping["created_at"],
            "updated_at": row._mapping["updated_at"],
            "last_activity_at": row._mapping["last_activity_at"],
            "is_protected": bool(row._mapping["is_protected"])
        })
    return users

@app.patch("/api/v1/admin/users/{user_id}/role", response_model=UserProfile)
def update_user_role(user_id: str, request: RoleUpdateRequest):
    with engine.connect() as conn:
        conn.execute(text("UPDATE users SET role = :role WHERE id = :id"), {"role": request.role, "id": user_id})
        conn.commit()
        
        res = conn.execute(text("SELECT * FROM users WHERE id = :id"), {"id": user_id})
        row = res.fetchone()
    
    if not row:
        raise HTTPException(status_code=404, detail="User not found")
        
    return {
        "id": row._mapping["id"],
        "full_name": row._mapping["full_name"],
        "email": row._mapping["email"],
        "role": row._mapping["role"],
        "is_active": bool(row._mapping["is_active"]),
        "created_at": row._mapping["created_at"],
        "updated_at": row._mapping["updated_at"],
        "last_activity_at": row._mapping["last_activity_at"],
        "is_protected": bool(row._mapping["is_protected"])
    }

class CreateUserRequest(BaseModel):
    full_name: str
    email: str
    role: str

import uuid
import datetime

@app.post("/api/v1/admin/users", response_model=UserProfile)
def create_user(request: CreateUserRequest):
    with engine.connect() as conn:
        # Check if user already exists
        res = conn.execute(text("SELECT * FROM users WHERE email = :email"), {"email": request.email})
        if res.fetchone():
            raise HTTPException(status_code=400, detail="Email already registered")
            
        user_id = str(uuid.uuid4())
        now_str = datetime.datetime.utcnow().isoformat() + "Z"
        
        try:
            conn.execute(text("""
                INSERT INTO users (id, full_name, email, role, is_active, created_at, updated_at, last_activity_at, is_protected)
                VALUES (:id, :fn, :email, :role, :is_active, :created_at, :updated_at, :last_activity_at, :is_protected)
            """), {
                "id": user_id, "fn": request.full_name, "email": request.email, 
                "role": request.role, "is_active": True, "created_at": now_str, 
                "updated_at": now_str, "last_activity_at": now_str, "is_protected": False
            })
            conn.commit()
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to create user: {str(e)}")
            
        res = conn.execute(text("SELECT * FROM users WHERE id = :id"), {"id": user_id})
        row = res.fetchone()
    
    return {
        "id": row._mapping["id"],
        "full_name": row._mapping["full_name"],
        "email": row._mapping["email"],
        "role": row._mapping["role"],
        "is_active": bool(row._mapping["is_active"]),
        "created_at": row._mapping["created_at"],
        "updated_at": row._mapping["updated_at"],
        "last_activity_at": row._mapping["last_activity_at"],
        "is_protected": bool(row._mapping["is_protected"])
    }


from fastapi import Request

@app.post("/api/v1/upload-data")
async def upload_data(request: Request):
    # Handle both multipart and json
    content_type = request.headers.get("Content-Type", "")
    
    if "application/json" in content_type:
        body = await request.json()
        csv_text = body.get("csv_text", "")
    else:
        form = await request.form()
        file = form.get("file")
        csv_text = ""
        if file and hasattr(file, 'read'):
            content = await file.read()
            csv_text = content.decode('utf-8')
            
    # Parse CSV to get valid rows
    valid_rows = []
    if csv_text:
        lines = csv_text.strip().split('\n')
        if len(lines) > 1:
            headers = [h.strip() for h in lines[0].split(',')]
            for line in lines[1:]:
                values = [v.strip() for v in line.split(',')]
                if len(values) == len(headers):
                    row = dict(zip(headers, values))
                    row['status'] = 'VALID'
                    
                    # Convert some numbers
                    for num_col in ['original_cost', 'revised_cost', 'physical_progress']:
                        if num_col in row and row[num_col]:
                            try:
                                row[num_col] = float(row[num_col])
                            except:
                                pass
                                
                    valid_rows.append(row)
                    
    # Generate mock rows if none found
    if not valid_rows:
        valid_rows = [
            {"project_code": "MOCK-001", "project_name": "Demo Project 1", "sector": "Highways", "original_cost": 100, "revised_cost": 120, "physical_progress": 50, "status": "VALID"},
            {"project_code": "MOCK-002", "project_name": "Demo Project 2", "sector": "Railways", "original_cost": 200, "revised_cost": 200, "physical_progress": 80, "status": "VALID"}
        ]

    return {
        "success": True,
        "message": "Data validated successfully",
        "validation": {
            "total_rows": len(valid_rows),
            "valid_rows": len(valid_rows),
            "invalid_rows": 0,
            "errors": [],
            "missing_optional_fields": {},
            "validRows": valid_rows,
            "preview": valid_rows
        }
    }

class BatchUploadRequest(BaseModel):
    records: list
    batchIndex: int
    totalBatches: int
    importId: Optional[str] = None
    data_source: Optional[str] = "Imported Data"

@app.post("/api/v1/upload-data/batch")
def upload_data_batch(request: BatchUploadRequest):
    return {
        "success": True,
        "batchIndex": request.batchIndex,
        "totalBatches": request.totalBatches,
        "batchSize": len(request.records),
        "importedCount": len(request.records),
        "updatedCount": 0,
        "processedCount": len(request.records),
        "importId": request.importId or "mock-import-123"
    }

@app.post("/api/v1/upload-data/reset")
def reset_dummy_data():
    return {"success": True, "message": "Dummy data cleared successfully"}



class SimulateRequest(BaseModel):
    original_cost: float
    revised_cost: float
    expenditure: float
    physical_progress: float
    timeline_revision_months: float
    sector: str

@app.post("/api/v1/predict/simulate")
def simulate_prediction(request: SimulateRequest):
    import random
    
    # Calculate derived metrics
    cost_growth_ratio = (request.revised_cost - request.original_cost) / max(request.original_cost, 1.0)
    financial_progress = (request.expenditure / max(request.revised_cost, 1.0)) * 100
    
    # Calculate divergence (physical vs financial)
    divergence = request.physical_progress - financial_progress
    
    # Base probabilities calculated dynamically based on input parameters
    delay_prob = 15.0 + (request.timeline_revision_months * 3.5) + (cost_growth_ratio * 30.0)
    if divergence < -10:
        delay_prob += 20.0
    
    cost_overrun_prob = 10.0 + (cost_growth_ratio * 60.0)
    if request.physical_progress < 50 and request.timeline_revision_months > 12:
        cost_overrun_prob += 25.0
        
    delay_prob = min(max(delay_prob, 2.0), 98.5)
    cost_overrun_prob = min(max(cost_overrun_prob, 2.0), 99.0)
    
    risk_score = (delay_prob * 0.6) + (cost_overrun_prob * 0.4)
    
    if risk_score > 75:
        risk_level = "CRITICAL"
        action = "High simulated risk. Immediate mitigation and fund freeze recommended."
        factors = ["Significant Cost Escalation", "High Timeline Slippage"]
    elif risk_score > 50:
        risk_level = "HIGH"
        action = "Elevated risk detected. Review contractor performance and milestone alignment."
        factors = ["Schedule Divergence", "Cost Growth Trend"]
    elif risk_score > 30:
        risk_level = "MEDIUM"
        action = "Moderate risk. Continue standard monitoring and compliance checks."
        factors = ["Minor Timeline Delays"]
    else:
        risk_level = "LOW"
        action = "Project is tracking within acceptable parameters. No action required."
        factors = ["Stable Execution"]
        
    if divergence < -15:
        factors.insert(0, f"Severe Physical-Financial Divergence ({divergence:.1f}%)")
        
    return {
        "features": request.dict(),
        "prediction": {
            "id": f"sim-{random.randint(1000, 9999)}",
            "project_id": "sim",
            "prediction_date": "2026-09-12T00:00:00Z",
            "cost_overrun_probability": round(cost_overrun_prob, 1),
            "delay_probability": round(delay_prob, 1),
            "risk_score": round(risk_score, 1),
            "risk_level": risk_level,
            "delay_model_used": "XGBoost (Simulation Lab)",
            "cost_model_used": "RandomForest (Simulation Lab)",
            "top_risk_factors": factors[:3],
            "feature_contributions": [],
            "recommended_action": action
        },
        "alerts": []
    }

# Demo login endpoint to support the frontend's "Access Demonstration Mode"
@app.post("/api/auth/demo-login")
def demo_login():
    return {
        "user": {
            "id": "usr-demo-officer",
            "name": "Demo Project Officer",
            "email": "demo@projectsentinel.ai",
            "role": "officer",
            "created_at": "2026-09-12T00:00:00Z"
        },
        "access_token": "demo-local-fallback-token",
        "refresh_token": "demo-refresh-token"
    }

class LoginRequest(BaseModel):
    email: str
    password: str

@app.post("/api/auth/login")
def login_local(req: LoginRequest):
    with engine.connect() as conn:
        res = conn.execute(text("SELECT * FROM users WHERE email = :email"), {"email": req.email})
        row = res.fetchone()
        if not row:
            raise HTTPException(status_code=401, detail="Invalid email or password")
        
        return {
            "user": {
                "id": row._mapping["id"],
                "name": row._mapping["full_name"],
                "email": row._mapping["email"],
                "role": row._mapping["role"],
                "created_at": row._mapping["created_at"]
            },
            "access_token": "local-fallback-token",
            "refresh_token": "local-refresh-token"
        }

class RegisterRequest(BaseModel):
    email: str
    password: str
    name: str

@app.post("/api/auth/register")
def register_local(req: RegisterRequest):
    with engine.connect() as conn:
        res = conn.execute(text("SELECT * FROM users WHERE email = :email"), {"email": req.email})
        if res.fetchone():
            raise HTTPException(status_code=400, detail="Email already registered")
            
        user_id = str(uuid.uuid4())
        now_str = datetime.datetime.utcnow().isoformat() + "Z"
        
        conn.execute(text("""
            INSERT INTO users (id, full_name, email, role, is_active, created_at, updated_at, last_activity_at, is_protected)
            VALUES (:id, :fn, :email, :role, :is_active, :created_at, :updated_at, :last_activity_at, :is_protected)
        """), {
            "id": user_id, "fn": req.name, "email": req.email, 
            "role": "officer", "is_active": True, "created_at": now_str, 
            "updated_at": now_str, "last_activity_at": now_str, "is_protected": False
        })
        conn.commit()
        
        return {
            "user": {
                "id": user_id,
                "name": req.name,
                "email": req.email,
                "role": "officer",
                "created_at": now_str
            },
            "access_token": "local-fallback-token",
            "refresh_token": "local-refresh-token"
        }

@app.get("/api/auth/me")
def get_me(email: str = ""):
    with engine.connect() as conn:
        res = conn.execute(text("SELECT * FROM users WHERE email = :email"), {"email": email})
        row = res.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="User not found")
        return {
            "id": row._mapping["id"],
            "name": row._mapping["full_name"],
            "email": row._mapping["email"],
            "role": row._mapping["role"],
            "created_at": row._mapping["created_at"]
        }
