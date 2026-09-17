import {
  Alert,
  AlertStatus,
  AuthResponse,
  DashboardSummary,
  ModelInsightsData,
  Prediction,
  Project,
  ProjectMonitoringData,
  User,
  UserRole,
  UserProfile,
  CreateProjectPayload,
  ValidationResult,
  ChatResponse,
} from '../types';

const BASE_URL = '/api/v1';
const TOKEN_STORAGE_KEY = 'project_sentinel_token';
const USER_STORAGE_KEY = 'project_sentinel_user';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function getStoredUser(): User | null {
  const raw = localStorage.getItem(USER_STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveAuthSession(token: string, user: User) {
  localStorage.setItem(TOKEN_STORAGE_KEY, token);
  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
}

export function clearAuthSession() {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
  localStorage.removeItem(USER_STORAGE_KEY);
}

function getAuthHeaders(extraHeaders: Record<string, string> = {}): Record<string, string> {
  const token = getStoredToken();
  const headers: Record<string, string> = { ...extraHeaders };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

// ----------------------------------------------------
// Authentication API (Mocked for Python Backend)
// ----------------------------------------------------

export async function loginUser(credentials: { email: string; password: string }): Promise<AuthResponse> {
  // Python backend doesn't have login, so we mock it
  const mockUser: User = {
    id: 'admin-1',
    name: 'Admin User',
    email: credentials.email,
    role: 'admin',
    created_at: new Date().toISOString(),
  };
  const mockToken = 'mock_jwt_token_for_python_backend';
  saveAuthSession(mockToken, mockUser);
  return {
    access_token: mockToken,

    token_type: 'Bearer',
    user: mockUser,
  };
}

export async function registerUser(payload: {
  name: string;
  email: string;
  password: string;
  role?: 'admin' | 'officer';
}): Promise<AuthResponse> {
  const mockUser: User = {
    id: 'admin-new',
    name: payload.name,
    email: payload.email,
    role: payload.role || 'officer',
    created_at: new Date().toISOString(),
  };
  const mockToken = 'mock_jwt_token_for_python_backend';
  saveAuthSession(mockToken, mockUser);
  return {
    access_token: mockToken,

    token_type: 'Bearer',
    user: mockUser,
  };
}

export async function fetchCurrentUser(): Promise<User> {
  const user = getStoredUser();
  if (!user) throw new Error('Not logged in');
  return user;
}

// ----------------------------------------------------
// Core Predictive & Risk Data API (Connected to Python)
// ----------------------------------------------------

export async function fetchDashboard(): Promise<DashboardSummary> {
  const res = await fetch(`${BASE_URL}/analytics/overview`);
  if (!res.ok) throw new Error('Failed to fetch dashboard data from backend');
  const data = await res.json();

  return {
    total_projects: data.total_projects || 0,
    high_risk_projects: data.total_high_risk || 0,
    delay_risk_projects: data.total_time_delayed || 0,
    cost_risk_projects: data.total_cost_overrun || 0,
    avg_risk_score: data.avg_risk_score || 0,
    risk_distribution: {
      low: data.total_low_risk || 0,
      medium: data.total_medium_risk || 0,
      high: data.total_high_risk || 0,
    },
    risk_trends: data.risk_trends || [],
    top_high_risk_projects: (data.top_high_risk_projects || []).map((p: any) => ({
      id: String(p.id || p.project_id),
      project_code: p.project_code || `PRJ-${p.project_id}`,
      project_name: p.project_name,
      sector: p.sector,
      prediction: {
        risk_score: Math.round((p.risk_probability || 0) * 100),
        risk_level: (p.risk_level || 'HIGH').toUpperCase(),
      },
      latest_monitoring: {
        physical_progress: p.physical_progress || 0,
        revised_cost: p.predicted_cost_cr || 0,
      }
    })),
    sector_risk_summary: data.sector_risk_breakdown || [],
    progress_divergence_projects: data.progress_divergence_projects || [],
    recent_alerts: [],
  };
}

export async function fetchProjects(params?: {
  sector?: string;
  state?: string;
  status?: string;
  risk_level?: string;
  data_source?: string;
  search?: string;
  sort_by?: string;
}): Promise<Project[]> {
  const query = new URLSearchParams();
  if (params?.sector && params.sector !== 'ALL') query.append('sector', params.sector);
  if (params?.search) query.append('search', params.search);
  if (params?.sort_by) query.append('sort_by', params.sort_by);
  if (params?.risk_level && params.risk_level !== 'ALL') {
    const rl = params.risk_level;
    query.append('risk_level', rl.charAt(0).toUpperCase() + rl.slice(1).toLowerCase());
  }
  query.append('limit', '500');

  const url = `${BASE_URL}/early-warnings?${query.toString()}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch projects from backend');

  const data = await res.json();

  return (data.warnings || []).map((w: any) => ({
    id: String(w.project_id),
    project_code: `PRJ-${w.project_id}`,
    project_name: w.project_name,
    sector: w.sector || 'Infrastructure',
    state: w.state || 'All India',
    ministry: 'N/A',
    implementing_agency: w.implementing_agency || 'N/A',
    project_status: w.physical_progress >= 100 ? 'Completed' : 'On-Going',
    data_source: 'Official Data',
    created_at: w.last_updated || new Date().toISOString(),
    latest_monitoring: {
      id: String(w.project_id), project_id: String(w.project_id), update_date: new Date().toISOString(),
      original_completion_date: new Date().toISOString(), revised_completion_date: new Date().toISOString(),
      original_cost: w.approved_cost || 0,
      revised_cost: w.predicted_cost_cr || w.approved_cost || 0,
      expenditure: w.expenditure || 0,
      physical_progress: w.physical_progress || 0,
      financial_progress: w.financial_progress || 0,
    },
    prediction: {
      id: String(w.project_id), project_id: String(w.project_id), prediction_date: new Date().toISOString(),
      risk_score: Math.round((w.risk_probability || 0) * 100),
      risk_level: (w.risk_level || 'LOW').toUpperCase() as any,
      delay_probability: w.predicted_delay_months > 0 ? 80 : 20,
      cost_overrun_probability: w.has_cost_overrun ? 80 : 20,
      top_risk_factors: [], recommended_action: '', feature_contributions: [], delay_model_used: '', cost_model_used: ''
    }
  }));
}

export async function fetchPaginatedProjects(params: {
  sector?: string;
  state?: string;
  status?: string;
  risk_level?: string;
  search?: string;
  sort_by?: string;
  page?: number;
  limit?: number;
}): Promise<{ projects: Project[], totalCount: number, totalPages: number, page: number }> {
  const query = new URLSearchParams();
  if (params.sector && params.sector !== 'ALL') query.append('sector', params.sector);
  if (params.state && params.state !== 'ALL') query.append('state', params.state);
  if (params.status && params.status !== 'ALL') query.append('status', params.status);
  if (params.search) query.append('search', params.search);
  if (params.sort_by) query.append('sort_by', params.sort_by);
  if (params.risk_level && params.risk_level !== 'ALL') {
    const rl = params.risk_level;
    query.append('risk_level', rl.charAt(0).toUpperCase() + rl.slice(1).toLowerCase());
  }
  query.append('page', String(params.page || 1));
  query.append('limit', String(params.limit || 50));

  const url = `${BASE_URL}/early-warnings?${query.toString()}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch paginated projects from backend');

  const data = await res.json();

  const projects = (data.warnings || []).map((w: any) => ({
    id: String(w.project_id),
    project_code: `PRJ-${w.project_id}`,
    project_name: w.project_name,
    sector: w.sector || 'Infrastructure',
    state: w.state || 'All India',
    ministry: 'N/A',
    implementing_agency: w.implementing_agency || 'N/A',
    project_status: w.physical_progress >= 100 ? 'Completed' : 'On-Going',
    data_source: 'Official Data',
    created_at: w.last_updated || new Date().toISOString(),
    latest_monitoring: {
      id: String(w.project_id), project_id: String(w.project_id), update_date: new Date().toISOString(),
      original_completion_date: new Date().toISOString(), revised_completion_date: new Date().toISOString(),
      original_cost: w.approved_cost || 0,
      revised_cost: w.predicted_cost_cr || w.approved_cost || 0,
      expenditure: w.expenditure || 0,
      physical_progress: w.physical_progress || 0,
      financial_progress: w.financial_progress || 0,
    },
    prediction: {
      id: String(w.project_id), project_id: String(w.project_id), prediction_date: new Date().toISOString(),
      risk_score: Math.round((w.risk_probability || 0) * 100),
      risk_level: (w.risk_level || 'LOW').toUpperCase() as any,
      delay_probability: w.predicted_delay_months > 0 ? 80 : 20,
      cost_overrun_probability: w.has_cost_overrun ? 80 : 20,
      top_risk_factors: [], recommended_action: '', feature_contributions: [], delay_model_used: '', cost_model_used: ''
    }
  }));

  return {
    projects,
    totalCount: data.total_count,
    totalPages: data.total_pages,
    page: data.page
  };
}

export async function fetchSectors(): Promise<string[]> {
  const res = await fetch(`${BASE_URL}/options/sectors`);
  if (!res.ok) return [];
  const data = await res.json();
  return data.sectors || [];
}

export async function fetchStates(): Promise<string[]> {
  const res = await fetch(`${BASE_URL}/options/states`);
  if (!res.ok) return [];
  const data = await res.json();
  return data.states || [];
}

export async function fetchProjectById(id: string): Promise<{ project: Project; history: ProjectMonitoringData[] }> {
  const res = await fetch(`${BASE_URL}/early-warnings?search=${id}`);
  if (!res.ok) throw new Error(`Failed to fetch project ${id} from backend`);
  const data = await res.json();

  if (!data.warnings || data.warnings.length === 0) {
    throw new Error(`Project not found with ID: ${id}`);
  }

  const w = data.warnings[0];
  const project: Project = {
    id: String(w.project_id),
    project_code: `PRJ-${w.project_id}`,
    project_name: w.project_name,
    sector: w.sector || 'Infrastructure',
    state: w.state || 'All India',
    ministry: 'N/A',
    implementing_agency: w.implementing_agency || 'N/A',
    project_status: w.physical_progress >= 100 ? 'Completed' : 'On-Going',
    data_source: 'Official Data',
    created_at: w.last_updated || new Date().toISOString(),
    latest_monitoring: {
      id: String(w.project_id), project_id: String(w.project_id), update_date: new Date().toISOString(),
      original_completion_date: new Date().toISOString(), revised_completion_date: new Date().toISOString(),
      original_cost: w.approved_cost || 0,
      revised_cost: w.predicted_cost_cr || w.approved_cost || 0,
      expenditure: w.expenditure || 0,
      physical_progress: w.physical_progress || 0,
      financial_progress: w.financial_progress || 0,
    },
    prediction: {
      id: String(w.project_id), project_id: String(w.project_id), prediction_date: new Date().toISOString(),
      risk_score: Math.round((w.risk_probability || 0) * 100),
      risk_level: (w.risk_level || 'LOW').toUpperCase() as any,
      delay_probability: w.predicted_delay_months > 0 ? 80 : 20,
      cost_overrun_probability: w.has_cost_overrun ? 80 : 20,
      top_risk_factors: [], recommended_action: '', feature_contributions: [], delay_model_used: '', cost_model_used: ''
    }
  };

  let history: ProjectMonitoringData[] = [project.latest_monitoring!];

  try {
    const payload = JSON.stringify({ project_id: parseInt(id.replace('PRJ-', ''), 10) || 0 });

    // Fetch AI explanations and historical timeline
    const riskRes = await fetch(`${BASE_URL}/predict/overrun-risk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload
    });

    let riskData = null;
    if (riskRes.ok) {
      riskData = await riskRes.json();
      project.prediction = {
        ...project.prediction!,
        cost_overrun_probability: Math.round((riskData.risk_probability || 0) * 100),
        top_risk_factors: (riskData.top_factors || []).map((f: any) => `${f.feature_name}: ${f.impact_direction}`),
        recommended_action: riskData.ai_overview,
        feature_contributions: (riskData.top_factors || []).map((f: any) => ({
          feature: f.feature_name,
          value: f.feature_value,
          impact: f.shap_value,
          explanation: f.impact_direction,
          explanation_text: f.explanation_text
        }))
      };

      if (riskData.historical_timeline && riskData.historical_timeline.length > 0) {
        history = riskData.historical_timeline.map((h: any) => ({
          id: String(w.project_id),
          project_id: String(w.project_id),
          update_date: h.report_month,
          original_cost: project.latest_monitoring?.original_cost || 0,
          revised_cost: h.revised_cost,
          expenditure: h.expenditure,
          physical_progress: h.physical_progress,
          financial_progress: h.financial_progress,
          original_completion_date: project.latest_monitoring?.original_completion_date || '',
          revised_completion_date: project.latest_monitoring?.revised_completion_date || '',
        }));
      }
    }

    // Fetch Cost Overrun Forecast (LSTM)
    const costRes = await fetch(`${BASE_URL}/predict/cost-overrun`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload
    });

    if (costRes.ok) {
      const costData = await costRes.json();
      const historicalBacktest = costData.historical_backtest || [];
      const futureForecasts = costData.future_forecast || [];

      // Merge predicted_cost into the history array
      if (historicalBacktest.length > 0) {
        history = history.map(h => {
          const match = historicalBacktest.find((b: any) => b.report_month === h.update_date);
          if (match) {
            return { ...h, predicted_cost: match.predicted_cost };
          }
          return h;
        });
      }

      if (futureForecasts.length > 0 && history.length > 0) {
        const lastEntry = history[history.length - 1];
        futureForecasts.forEach((forecast: any, idx: number) => {
          history.push({
            id: String(w.project_id) + `_f${idx}`,
            project_id: String(w.project_id),
            update_date: `Forecast +${forecast.month_offset}M`,
            original_cost: lastEntry.original_cost,
            revised_cost: forecast.predicted_cost_cr,
            predicted_cost: forecast.predicted_cost_cr, // Set predicted_cost for chart mapping
            expenditure: lastEntry.expenditure, // carry over
            physical_progress: lastEntry.physical_progress, // carry over
            financial_progress: lastEntry.financial_progress, // carry over
            original_completion_date: lastEntry.original_completion_date,
            revised_completion_date: lastEntry.revised_completion_date,
          });
        });
      }
    }

  } catch (e) {
    console.error("Could not automatically load AI predictions on project init", e);
  }

  return { project, history };
}

export async function runProjectPrediction(projectId: string): Promise<{ project: Project; prediction: Prediction; alerts: Alert[] }> {
  const cleanId = projectId.replace('PRJ-', '');
  const payload = { project_id: parseInt(cleanId, 10) || 0 };

  const riskRes = await fetch(`${BASE_URL}/predict/overrun-risk`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!riskRes.ok) throw new Error('Failed to run prediction on Python backend');
  const riskData = await riskRes.json();

  const prediction: Prediction = {
    id: projectId, project_id: projectId, prediction_date: new Date().toISOString(),
    risk_score: Math.round((riskData.risk_probability || 0) * 100),
    risk_level: (riskData.risk_level || 'LOW').toUpperCase() as any,
    delay_probability: 0,
    cost_overrun_probability: Math.round((riskData.risk_probability || 0) * 100),
    top_risk_factors: (riskData.top_factors || []).map((f: any) => `${f.feature_name}: ${f.impact_direction}`),
    recommended_action: riskData.ai_overview,
    feature_contributions: (riskData.top_factors || []).map((f: any) => ({
      feature: f.feature_name,
      value: f.feature_value,
      impact: f.shap_value,
      explanation: f.impact_direction
    })),
    delay_model_used: 'Gradient Boosting (Time Overrun)',
    cost_model_used: 'Random Forest (Cost Overrun)'
  };

  const project: Project = {
    id: projectId,
    project_code: projectId,
    project_name: riskData.project_name || `Project ${projectId}`,
    sector: 'Infrastructure',
    state: 'All India',
    ministry: 'N/A',
    implementing_agency: 'N/A',
    project_status: 'On-Going',
    data_source: 'Official Data',
    created_at: new Date().toISOString(),
    prediction
  };

  return { project, prediction, alerts: [] };
}

// Note: The rest of these functions are mocked/empty since the Python backend doesn't support them natively yet
export async function fetchAlerts(params?: any) { return []; }
export async function updateAlertStatus(alertId: string, status: AlertStatus) { return {} as Alert; }
export async function uploadProjectData(fileOrPayload: any, commit: boolean = false, dataSource: string = '') { return { success: true, validation: { total_rows: 0, valid_rows: 0, errors: [] }, totalRows: 0, validRows: 0, import_stats: { imported_count: 0, updated_count: 0 } }; }
export async function commitProjectRecordsBatch(payload: any) { return { success: true, batchIndex: 0, batchSize: 0, importedCount: 0, updatedCount: 0, processedCount: 0 }; }
export async function fetchModelInsights() { return {} as ModelInsightsData; }
export async function simulatePrediction(scenario: any) { return { features: {}, prediction: {} as Prediction, alerts: [] }; }
export async function sendChatMessage(message: string, history: any = [], currentProjectId?: string) { return { reply: "Chat is disabled in Python-only mode." } as ChatResponse; }
export async function createProject(payload: any) { return {} as Project; }
export async function updateProject(id: string, updates: any) { return {} as Project; }
export async function fetchUsers() { return []; }
export async function updateUserRole(id: string, role: any) { return {} as UserProfile; }

export async function fetchStateWiseAnalytics(): Promise<import('../types').AggregatedMetrics[]> {
  const response = await fetch(`${BASE_URL}/analytics/state-wise`);
  if (!response.ok) throw new Error('Failed to fetch state-wise analytics');
  const data = await response.json();
  return data.data;
}

export async function fetchAgencyWiseAnalytics(): Promise<import('../types').AggregatedMetrics[]> {
  const response = await fetch(`${BASE_URL}/analytics/agency-wise`);
  if (!response.ok) throw new Error('Failed to fetch agency-wise analytics');
  const data = await response.json();
  return data.data;
}

export async function fetchSectorWiseAnalytics(): Promise<import('../types').AggregatedMetrics[]> {
  const response = await fetch(`${BASE_URL}/analytics/sector-wise`);
  if (!response.ok) throw new Error('Failed to fetch sector-wise analytics');
  const data = await response.json();
  return data.data;
}