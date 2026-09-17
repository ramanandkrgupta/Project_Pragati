import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  Building2,
  MapPin,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Coins,
  ShieldAlert,
  Sparkles,
  RefreshCw,
  FileText,
  Activity,
  Layers,
  ChevronRight,
  ShieldCheck,
  CheckSquare,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { fetchProjectById, runProjectPrediction } from '../services/api';
import { Project, ProjectMonitoringData } from '../types';
import { RiskBadge } from '../components/RiskBadge';
import { StatusBadge } from '../components/StatusBadge';
import { useAuth } from '../context/AuthContext';
import { useAccessibility } from '../context/AccessibilityContext';

export const ProjectDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { isAdmin } = useAuth();
  const [project, setProject] = useState<Project | null>(null);
  const [history, setHistory] = useState<ProjectMonitoringData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [recalibrating, setRecalibrating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const loadData = async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const data = await fetchProjectById(id);
      setProject(data.project);
      setHistory(data.history);
    } catch (err: any) {
      setError(err.message || 'Failed to load project details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const handleRecalibrate = async () => {
    if (!id) return;
    if (!isAdmin) {
      alert('Access Denied: Only Administrator role can trigger AI risk recalculation.');
      return;
    }
    try {
      setRecalibrating(true);
      const res = await runProjectPrediction(id);
      setProject(res.project);
      setSuccessToast('AI Risk recalculation complete: Decision trees updated.');
      setTimeout(() => setSuccessToast(null), 4000);
    } catch (err: any) {
      alert('Failed to recalibrate: ' + err.message);
    } finally {
      setRecalibrating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="h-8 w-8 animate-spin text-[#003B6F]" />
          <p className="text-sm font-semibold text-[#172033]">Retrieving project monitoring telemetry...</p>
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="p-6 font-sans">
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-6 text-rose-800">
          <h3 className="text-base font-bold">Project not found</h3>
          <p className="text-sm mt-1">{error}</p>
          <Link
            to="/projects"
            className="mt-4 inline-flex items-center gap-2 rounded bg-[#003B6F] px-4 py-2 text-xs font-bold text-white"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Project Explorer
          </Link>
        </div>
      </div>
    );
  }

  const mon = project.latest_monitoring;
  const feat = project.features;
  const pred = project.prediction;

  const chartData = history.map((h) => ({
    date: h.update_date,
    original_cost: h.original_cost,
    revised_cost: h.revised_cost,
    predicted_cost: h.predicted_cost, // LSTM forecast data
    expenditure: h.expenditure,
    physical_progress: h.physical_progress,
    financial_progress: h.financial_progress,
  }));

  const milestones = [
    { title: 'Land Acquisition & Environmental Clearance', status: 'Completed', date: 'Jan 2025' },
    { title: 'Foundation & Earthwork Engineering', status: 'Completed', date: 'May 2025' },
    { title: 'Structural Superstructure Fabrication', status: 'Delayed', date: 'Scheduled Jun 2026' },
    { title: 'Systems Integration & Trial Runs', status: 'At Risk', date: 'Scheduled Dec 2026' },
  ];

  const { isHighContrast } = useAccessibility();

  const colors = {
    navy: isHighContrast ? '#000080' : '#0B3D66',
    green: isHighContrast ? '#008000' : '#1E8449',
    textNavy: isHighContrast ? '#000000' : '#0B2942',
    gridline: isHighContrast ? '#000000' : '#D9DEE3',
    tooltipBg: '#FFFFFF',
    tooltipBorder: isHighContrast ? '#000000' : '#0B3D66',
  };

  const customTooltipStyle = {
    backgroundColor: colors.tooltipBg,
    border: `${isHighContrast ? '2px' : '1px'} solid ${colors.tooltipBorder}`,
    color: colors.textNavy,
    borderRadius: '2px',
    fontSize: '12px',
    boxShadow: 'none',
    padding: '8px 12px',
    fontWeight: 600,
  };

  return (
    <div id="project-detail-page" className="space-y-6 pb-12 font-sans">
      {/* Navigation Breadcrumb */}
      <div className="flex items-center justify-between border-b border-[#D9E1E8] pb-3">
        <Link
          to="/projects"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#003B6F] hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Project Directory</span>
        </Link>

        <div className="flex items-center gap-2">
          {isAdmin ? (
            <button
              onClick={handleRecalibrate}
              disabled={recalibrating}
              className="inline-flex items-center gap-1.5 rounded bg-[#003B6F] hover:bg-[#005A9C] px-3.5 py-1.5 text-xs font-bold text-white shadow-xs transition-colors disabled:opacity-50"
            >
              <Sparkles className={`h-3.5 w-3.5 ${recalibrating ? 'animate-spin' : ''}`} />
              <span>{recalibrating ? 'Recalibrating...' : 'Run AI Recalibration'}</span>
            </button>
          ) : (
            <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded">
              AI Recalibration (Admin Only)
            </span>
          )}
        </div>
      </div>

      {successToast && (
        <div className="rounded bg-emerald-50 border border-emerald-300 p-3 text-xs font-bold text-[#138808] flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-[#138808]" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Project Header Card */}
      <div className="bg-white p-6 rounded-lg border border-[#D9E1E8] shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="rounded bg-[#003B6F] px-2 py-0.5 font-mono text-[11px] font-bold text-white">
                {project.project_code}
              </span>
              <span className="rounded bg-blue-50 px-2 py-0.5 text-xs font-bold text-[#005A9C] border border-blue-200">
                {project.sector}
              </span>
              <StatusBadge status={project.project_status} size="sm" />
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#172033] font-serif">
              {project.project_name}
            </h1>

            <div className="mt-2 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-[#667085]">
              <div className="flex items-center gap-1.5">
                <Building2 className="h-4 w-4 text-slate-400" />
                <span>{project.ministry}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Layers className="h-4 w-4 text-slate-400" />
                <span>{project.implementing_agency}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4 text-slate-400" />
                <span>{project.state}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-start lg:items-end gap-1">
            <RiskBadge
              level={pred?.risk_level || 'LOW'}
              score={pred?.risk_score}
              size="lg"
            />
            <span className="text-[10px] text-slate-500 font-mono">
              Evaluated: {pred?.prediction_date || 'Current Telemetry'}
            </span>
          </div>
        </div>
      </div>

      {/* AI Risk Analysis & Recommended Action */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Risk Score Drivers */}
        <div className="lg:col-span-8 bg-white p-6 rounded-lg border border-[#D9E1E8] shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <ShieldAlert className="h-5 w-5 text-[#C62828]" />
            <div>
              <h2 className="text-base font-bold text-[#003B6F]">Why is this project risky? (Explainable AI)</h2>
              <p className="text-xs text-[#667085]">Primary risk drivers identified by ML decision models</p>
            </div>
          </div>

          <div className="space-y-4">
            {(pred?.feature_contributions && pred.feature_contributions.length > 0) ? (
              <div className="space-y-3">
                {(() => {
                  const maxImpact = Math.max(...pred.feature_contributions.map(c => Math.abs(c.impact)), 0.01);
                  return pred.feature_contributions.map((c, idx) => {
                    const widthPct = Math.min((Math.abs(c.impact) / maxImpact) * 100, 100);
                    const isIncrease = c.impact > 0;
                    
                    // Format feature name nicely
                    let niceName = c.feature;
                    if (niceName.includes('_') && niceName !== 'planned_duration_months' && niceName !== 'approved_cost') {
                      const parts = niceName.split('_');
                      niceName = `${parts[0].charAt(0).toUpperCase() + parts[0].slice(1)}: ${parts.slice(1).join(' ')}`;
                    } else {
                      niceName = niceName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                    }

                    return (
                      <div key={idx} className="relative pt-1 pb-2">
                        <div className="flex justify-between items-end mb-1">
                          <div className="flex flex-col w-[70%]">
                            <span className="text-[11px] font-bold text-[#172033]">
                              {niceName} <span className="font-normal text-slate-500">({widthPct.toFixed(1)}% impact)</span>
                            </span>
                            <span className="text-[10px] text-slate-500 leading-tight mt-0.5">
                              {c.explanation_text || (c.value !== 'Categorical/Transformed' ? `Value: ${c.value}` : 'Matches historical risk profile')}
                            </span>
                          </div>
                          <span className={`text-[10px] font-bold ${isIncrease ? 'text-[#C62828]' : 'text-[#138808]'}`}>
                            {isIncrease ? '↑ Increases Risk' : '↓ Decreases Risk'}
                          </span>
                        </div>
                        <div className="flex w-full h-2 bg-slate-100 rounded overflow-hidden">
                          <div
                            style={{ width: `${widthPct}%` }}
                            className={`h-full rounded ${isIncrease ? 'bg-[#C62828]' : 'bg-[#138808]'}`}
                          />
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            ) : (
              <div className="text-sm text-slate-500 italic">No AI explanation available.</div>
            )}
          </div>

          <div className="p-3 bg-blue-50 border border-blue-200 rounded text-xs text-[#003B6F] space-y-1">
            <div className="font-bold flex items-center gap-1.5">
              <CheckSquare className="h-4 w-4 text-[#005A9C]" />
              <span>Recommended Officer Intervention:</span>
            </div>
            <p className="text-slate-700 leading-relaxed">{pred?.recommended_action}</p>
          </div>
        </div>

        {/* Right: Milestones Status */}
        <div className="lg:col-span-4 bg-white p-6 rounded-lg border border-[#D9E1E8] shadow-xs space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-base font-bold text-[#003B6F]">Milestones Health</h2>
            <p className="text-xs text-[#667085]">Implementation schedule tracking</p>
          </div>

          <div className="space-y-3 text-xs">
            {milestones.map((m, idx) => (
              <div key={idx} className="p-2.5 rounded bg-[#F5F7FA] border border-slate-200 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#172033]">{m.title}</span>
                  <StatusBadge status={m.status} size="sm" />
                </div>
                <span className="text-[10px] text-slate-500">{m.date}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Financial vs Physical Progress Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border border-[#D9E1E8] shadow-xs space-y-1">
          <span className="text-[11px] font-bold text-[#667085] uppercase">Original Budget</span>
          <div className="text-xl font-bold text-[#172033]">₹{(mon?.original_cost || 0).toLocaleString()} Cr</div>
          <span className="text-[10px] text-slate-500">Approved Baseline</span>
        </div>

        <div className="bg-white p-4 rounded-lg border border-[#D9E1E8] shadow-xs space-y-1">
          <span className="text-[11px] font-bold text-[#667085] uppercase">Revised Budget</span>
          <div className="text-xl font-bold text-[#003B6F]">₹{(mon?.revised_cost || 0).toLocaleString()} Cr</div>
          <span className="text-[10px] text-[#C62828] font-bold">+{feat?.cost_overrun_pct}% Overrun</span>
        </div>

        <div className="bg-white p-4 rounded-lg border border-[#D9E1E8] shadow-xs space-y-1">
          <span className="text-[11px] font-bold text-[#667085] uppercase">Disbursed Expenditure</span>
          <div className="text-xl font-bold text-[#005A9C]">₹{(mon?.expenditure || 0).toLocaleString()} Cr</div>
          <span className="text-[10px] text-[#005A9C] font-bold">{feat?.financial_progress}% Disbursed</span>
        </div>

        <div className="bg-white p-4 rounded-lg border border-[#D9E1E8] shadow-xs space-y-1">
          <span className="text-[11px] font-bold text-[#667085] uppercase">Physical Completed</span>
          <div className="text-xl font-bold text-[#138808]">{mon?.physical_progress}%</div>
          <span className="text-[10px] text-amber-800 font-bold">Gap: +{feat?.progress_gap}%</span>
        </div>
      </div>

      {/* Historical Telemetry Chart */}
      <div className="bg-white p-6 rounded-lg border border-[#D9DEE3] shadow-xs space-y-4">
        <div className="border-b border-[#D9DEE3] pb-3">
          <h2 className="text-base font-bold text-[#0B3D66]">Historical Monthly Progress & Expenditure</h2>
          <p className="text-xs text-[#0B2942]/70">Time series trajectory from baseline start</p>
        </div>

        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={colors.gridline} />
              <XAxis dataKey="date" stroke={colors.gridline} tick={{ fontSize: 11, fill: colors.textNavy }} />
              <YAxis stroke={colors.gridline} tick={{ fontSize: 11, fill: colors.textNavy }} />
              <Tooltip contentStyle={customTooltipStyle} />
              <Area
                type="monotone"
                dataKey="revised_cost"
                name="Revised Budget (Cr)"
                stroke={colors.navy}
                fill={colors.navy}
                fillOpacity={0.15}
              />
              <Area
                type="monotone"
                dataKey="predicted_cost"
                name="LSTM Predicted Cost (Cr)"
                stroke="#C62828" // Red color to indicate AI forecast
                strokeDasharray="5 5" // Dotted line for prediction
                fill="none"
              />
              <Area
                type="monotone"
                dataKey="expenditure"
                name="Disbursed Expenditure (Cr)"
                stroke={colors.green}
                fill={colors.green}
                fillOpacity={0.25}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
