from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional

class ProjectInferenceRequest(BaseModel):
    project_id: int = Field(..., description="Unique 6-digit identifier for the infrastructure project")

class FeatureExplanation(BaseModel):
    feature_name: str = Field(..., description="Name of the feature")
    feature_value: Any = Field(..., description="Input value provided")
    shap_value: float = Field(..., description="SHAP attribution value (positive means it increases overrun risk)")
    impact_direction: str = Field(..., description="'Increases Risk' or 'Decreases Risk'")
    explanation_text: Optional[str] = Field(None, description="Dynamic data-backed context for this feature's risk impact")
    
class HistoricalSnapshot(BaseModel):
    report_month: str
    physical_progress: float
    financial_progress: float
    expenditure: float
    revised_cost: float

class PredictionResponse(BaseModel):
    project_id: int
    project_name: str
    planned_start_date: Optional[str] = Field(None, description="Project Date of Approval/Commissioning")
    risk_probability: float = Field(..., description="Probability of cost overrun (0.0 to 1.0)")
    risk_level: str = Field(..., description="Categorical risk level (Low, Medium, High)")
    top_factors: List[FeatureExplanation] = Field(..., description="Top contributing factors to the risk score")
    historical_timeline: List[HistoricalSnapshot] = Field(..., description="Chronological timeline of project updates")
    ai_overview: str = Field(..., description="LLM-generated qualitative analysis of project history and risks")

class HistoricalBacktest(BaseModel):
    report_month: str
    actual_cost: float
    predicted_cost: float
    error_margin_cr: float

class FutureForecast(BaseModel):
    month_offset: int
    predicted_cost_cr: float

class CostForecastResponse(BaseModel):
    project_id: int
    project_name: str
    baseline_approved_cost: float
    historical_backtest: List[HistoricalBacktest] = Field(..., description="Actual vs Predicted costs for historical data")
    future_forecast: List[FutureForecast] = Field(..., description="LSTM 3-month forecast")
    ai_explanation: str = Field(..., description="SHAP-driven explanation of the forecast")

class DelayFactor(BaseModel):
    feature: str
    value: float
    impact: float = Field(..., description="Impact in months of delay")

class TimeOverrunResponse(BaseModel):
    project_id: int
    project_name: str
    planned_duration_months: int
    predicted_delay_months: float
    predicted_total_duration: float
    risk_level: str = Field(..., description="Categorical risk level (Low, Medium, High)")
    top_delay_factors: List[DelayFactor] = Field(..., description="SHAP explanation of top features contributing to delay")

class EarlyWarningItem(BaseModel):
    project_id: int
    project_name: str
    sector: Optional[str] = None
    state: Optional[str] = None
    implementing_agency: Optional[str] = None
    physical_progress: Optional[float] = None
    financial_progress: Optional[float] = None
    approved_cost: Optional[float] = None
    expenditure: Optional[float] = None
    risk_level: str
    risk_probability: float
    predicted_delay_months: float
    predicted_cost_cr: float
    has_cost_overrun: bool
    has_time_delay: bool
    last_updated: Optional[str] = None

class EarlyWarningResponse(BaseModel):
    total_count: int
    total_pages: int
    page: int
    limit: int
    warnings: List[EarlyWarningItem]

class BenchmarkMetrics(BaseModel):
    group_name: str
    project_count: int
    avg_physical_progress: float
    avg_financial_progress: float
    avg_predicted_cost_overrun_percent: float
    avg_predicted_time_delay_months: float

class ProjectBenchmarkResponse(BaseModel):
    project_id: int
    project_name: str
    state: str
    implementing_agency: str
    sector: str
    project_metrics: BenchmarkMetrics
    agency_benchmark: BenchmarkMetrics
    state_benchmark: BenchmarkMetrics
    national_benchmark: BenchmarkMetrics

class AnalyticsOverview(BaseModel):
    total_projects: int
    total_high_risk: int
    total_medium_risk: int
    total_low_risk: int
    total_cost_overrun: int
    total_time_delayed: int
    total_overdue: int
    agency_breakdown: List[dict]
    state_breakdown: List[dict]
    sector_risk_breakdown: List[dict]
    avg_risk_score: float
    risk_trends: List[dict]
    progress_divergence_projects: List[dict]
    top_high_risk_projects: List[dict]

class CostDriverItem(BaseModel):
    driver_key: str
    driver_name: str
    importance_score: float
    correlation: str

class CostDriverAnalysisResponse(BaseModel):
    macro_stats: dict
    global_drivers: List[CostDriverItem]

class ProjectAssistantRequest(BaseModel):
    query: str = Field(..., description="The user's chat query")
    project_id: Optional[int] = Field(None, description="Optional project ID for context")

class ProjectAssistantResponse(BaseModel):
    answer: str
    engine: str
