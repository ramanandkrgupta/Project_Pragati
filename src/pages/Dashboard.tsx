import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowUpRight,
  Clock,
  Coins,
  FileSpreadsheet,
  Layers,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  TrendingUp,
  TrendingDown,
  Activity,
  Sparkles,
  ChevronRight,
  Calendar,
  Filter,
  CheckCircle2,
  AlertOctagon,
  Building2,
  MapPin,
  PieChart as PieChartIcon,
  BarChart3,
  LineChart as LineChartIcon,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
  LineChart,
  Line,
  Legend,
} from 'recharts';
import { fetchDashboard, fetchProjects } from '../services/api';
import { DashboardSummary, Project } from '../types';
import { RiskBadge } from '../components/RiskBadge';
import { StatusBadge } from '../components/StatusBadge';
import { useAccessibility } from '../context/AccessibilityContext';

export const Dashboard: React.FC = () => {
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [allProjects, setAllProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [trendMetricMode, setTrendMetricMode] = useState<'avg_score' | 'all' | 'high_risk'>('avg_score');

  const { isHighContrast } = useAccessibility();

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [dashRes, projRes] = await Promise.all([
        fetchDashboard(),
        fetchProjects(),
      ]);
      setData(dashRes);
      setAllProjects(projRes);
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard telemetry');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="h-8 w-8 animate-spin text-[#0B3D66]" />
          <p className="text-sm font-semibold text-[#0B2942]">Loading National Infrastructure Telemetry...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 font-sans">
        <div className="rounded-lg border border-[#B03A2E]/30 bg-rose-50 p-6 text-[#B03A2E]">
          <div className="flex items-center gap-3">
            <ShieldAlert className="h-6 w-6 text-[#B03A2E]" />
            <h3 className="text-base font-bold text-[#0B2942]">Failed to load project telemetry</h3>
          </div>
          <p className="mt-2 text-sm text-[#B03A2E]">{error}</p>
          <button
            onClick={loadData}
            className="mt-4 rounded bg-[#B03A2E] px-4 py-2 text-xs font-bold text-white hover:bg-rose-900 transition-colors"
          >
            Retry Data Fetch
          </button>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // Color Tokens: Official Government Palette & High Contrast Mode
  // ----------------------------------------------------
  const colors = {
    navy: isHighContrast ? '#000080' : '#0B3D66',
    textNavy: isHighContrast ? '#000000' : '#0B2942',
    orange: isHighContrast ? '#D97706' : '#E8862C',
    green: isHighContrast ? '#008000' : '#1E8449',
    redMaroon: isHighContrast ? '#CC0000' : '#B03A2E',
    darkRed: isHighContrast ? '#800000' : '#7B241C',
    gridline: isHighContrast ? '#000000' : '#D9DEE3',
    cardBg: isHighContrast ? '#FFFFFF' : '#FFFFFF',
    border: isHighContrast ? '#000000' : '#D9DEE3',
    tooltipBg: '#FFFFFF',
    tooltipBorder: isHighContrast ? '#000000' : '#0B3D66',
  };

  // Custom Flat High-Contrast Tooltip Styling
  const customTooltipStyle = {
    backgroundColor: colors.tooltipBg,
    border: `1px solid ${colors.tooltipBorder}`,
    color: colors.textNavy,
    borderRadius: '2px',
    fontSize: '12px',
    boxShadow: 'none',
    padding: '8px 12px',
    fontWeight: 600,
  };

  // ----------------------------------------------------
  // 1. "At a Glance" Side-by-Side Bar Chart Data
  // Categories: Total Projects, Active Projects, Projects at Risk, Delayed Projects, Critical Projects
  // ----------------------------------------------------
  const statusCounts = { onTrack: 0, atRisk: 0, delayed: 0, critical: 0 };
  allProjects.forEach((p) => {
    const riskScore = p.prediction?.risk_score ?? 0;
    const status = p.project_status;
    const riskLevel = p.prediction?.risk_level;

    if (riskScore >= 75 || (riskLevel === 'HIGH' && (status === 'Delayed' || status === 'Under Risk'))) {
      statusCounts.critical++;
    } else if (status === 'Delayed' || (p.prediction?.delay_probability ?? 0) >= 70) {
      statusCounts.delayed++;
    } else if (status === 'Under Risk' || riskLevel === 'MEDIUM' || (p.prediction?.delay_probability ?? 0) >= 50) {
      statusCounts.atRisk++;
    } else {
      statusCounts.onTrack++;
    }
  });

  const atAGlanceBarData = [
    { category: 'Total Projects', count: data.total_projects, fill: colors.navy },
    { category: 'Active Projects', count: data.total_projects - data.high_risk_projects, fill: colors.green },
    { category: 'At Risk', count: statusCounts.atRisk, fill: colors.orange },
    { category: 'Delayed', count: data.delay_risk_projects, fill: colors.redMaroon },
    { category: 'Critical', count: statusCounts.critical, fill: colors.darkRed },
  ];

  // ----------------------------------------------------
  // 2. Risk Distribution (Donut Chart)
  // Categories: Low, Medium, High, Critical
  // ----------------------------------------------------
  const riskCounts = { low: 0, medium: 0, high: 0, critical: 0 };
  allProjects.forEach((p) => {
    const score = p.prediction?.risk_score ?? 0;
    const level = p.prediction?.risk_level;

    if (score >= 75) {
      riskCounts.critical++;
    } else if (level === 'HIGH' || score >= 60) {
      riskCounts.high++;
    } else if (level === 'MEDIUM' || score >= 35) {
      riskCounts.medium++;
    } else {
      riskCounts.low++;
    }
  });

  const riskDonutData = [
    { name: 'Low Risk', value: riskCounts.low, color: colors.green },
    { name: 'Medium Risk', value: riskCounts.medium, color: colors.orange },
    { name: 'High Risk', value: riskCounts.high, color: colors.redMaroon },
    { name: 'Critical Risk', value: riskCounts.critical, color: colors.darkRed },
  ];

  // ----------------------------------------------------
  // 3. Project Progress Overview (Horizontal Bar Chart)
  // ----------------------------------------------------
  const progressOverviewData = [...allProjects]
    .filter((p) => p.latest_monitoring)
    .sort((a, b) => (b.latest_monitoring?.physical_progress || 0) - (a.latest_monitoring?.physical_progress || 0))
    .slice(0, 6)
    .map((p) => {
      const shortName = p.project_name.length > 20 ? p.project_name.substring(0, 18) + '...' : p.project_name;
      return {
        name: shortName,
        fullName: p.project_name,
        code: p.project_code,
        progress: p.latest_monitoring?.physical_progress || 0,
        financialProgress: p.latest_monitoring?.financial_progress || 0,
      };
    });

  // ----------------------------------------------------
  // 4. Avg Risk Score Trend Over Time (Line Chart)
  // ----------------------------------------------------
  const trendData = (data.risk_trends && data.risk_trends.length > 0
    ? data.risk_trends
    : [
        { month: 'Nov 2025', avg_risk_score: 42, high_risk_projects: 3, delay_risk_projects: 4 },
        { month: 'Dec 2025', avg_risk_score: 45, high_risk_projects: 4, delay_risk_projects: 5 },
        { month: 'Jan 2026', avg_risk_score: 48, high_risk_projects: 4, delay_risk_projects: 6 },
        { month: 'Feb 2026', avg_risk_score: 51, high_risk_projects: 5, delay_risk_projects: 7 },
        { month: 'Mar 2026', avg_risk_score: 49, high_risk_projects: 5, delay_risk_projects: 6 },
        { month: 'Apr 2026', avg_risk_score: 53, high_risk_projects: 6, delay_risk_projects: 8 },
      ]
  ).map((item) => ({
    month: item.month,
    highRisk: item.high_risk_projects,
    delayRisk: item.delay_risk_projects,
    avgScore: item.avg_risk_score,
  }));

  // ----------------------------------------------------
  // 5. Budget vs Actual Expenditure (Grouped Bar Chart)
  // ----------------------------------------------------
  const budgetVsActualData = [...allProjects]
    .filter((p) => p.latest_monitoring && (p.latest_monitoring.revised_cost > 0 || p.latest_monitoring.original_cost > 0))
    .sort((a, b) => (b.latest_monitoring?.revised_cost || 0) - (a.latest_monitoring?.revised_cost || 0))
    .slice(0, 6)
    .map((p) => {
      const shortName = p.project_name.length > 16 ? p.project_name.substring(0, 14) + '...' : p.project_name;
      return {
        name: shortName,
        fullName: p.project_name,
        code: p.project_code,
        sanctionedBudget: Math.round(p.latest_monitoring?.revised_cost || p.latest_monitoring?.original_cost || 0),
        actualExpenditure: Math.round(p.latest_monitoring?.expenditure || 0),
      };
    });

  // ----------------------------------------------------
  // 6. Regional / State Distribution (Bar Chart)
  // ----------------------------------------------------
  const stateMap: Record<string, number> = {};
  allProjects.forEach((p) => {
    const stateName = p.state && p.state.trim() ? p.state.trim() : 'Unspecified';
    stateMap[stateName] = (stateMap[stateName] || 0) + 1;
  });

  const stateDistributionData = Object.entries(stateMap)
    .map(([state, count]) => ({ state, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 7);

  // ----------------------------------------------------
  // 7. Early Warning Summary (Compact Chart)
  // ----------------------------------------------------
  const alertSeverityCounts = { critical: 0, high: 0, medium: 0, low: 0 };
  (data.recent_alerts || []).forEach((alert) => {
    if (alert.alert_type === 'CRITICAL_RISK' || (alert.severity === 'HIGH' && alert.alert_type === 'PROGRESS_DIVERGENCE')) {
      alertSeverityCounts.critical++;
    } else if (alert.severity === 'HIGH') {
      alertSeverityCounts.high++;
    } else if (alert.severity === 'MEDIUM') {
      alertSeverityCounts.medium++;
    } else {
      alertSeverityCounts.low++;
    }
  });

  const earlyWarningData = [
    { severity: 'Critical', count: alertSeverityCounts.critical, fill: colors.darkRed },
    { severity: 'High', count: alertSeverityCounts.high, fill: colors.redMaroon },
    { severity: 'Medium', count: alertSeverityCounts.medium, fill: colors.orange },
    { severity: 'Low', count: alertSeverityCounts.low, fill: colors.green },
  ];

  const formatCurrency = (val: number) => {
    if (val >= 1000) return `₹${(val / 1000).toFixed(1)}k Cr`;
    return `₹${val} Cr`;
  };

  return (
    <div id="dashboard-page" className="space-y-6 pb-12 font-sans">
      {/* Institutional Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#D9DEE3] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded bg-[#0B3D66]/10 px-2.5 py-0.5 text-xs font-bold text-[#0B3D66] border border-[#0B3D66]/20">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>National Project Governance</span>
            </span>
            <span className="text-xs text-[#0B2942] font-mono">Live Telemetry</span>
          </div>
          <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold text-[#0B3D66] font-serif">
            PRAGATI Executive Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-[#0B2942]/80">
            Integrated Infrastructure Analytics & Early-Warning Monitoring Matrix
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={loadData}
            title="Refresh Dashboard Telemetry"
            className="inline-flex items-center gap-1.5 rounded bg-white border border-[#D9DEE3] px-3.5 py-2 text-xs font-bold text-[#0B2942] hover:bg-[#F4F6F8] transition-colors shadow-xs"
          >
            <RefreshCw className="h-3.5 w-3.5 text-[#0B3D66]" />
            <span>Refresh Telemetry</span>
          </button>
        </div>
      </div>

      {/* SECTION 1: "AT A GLANCE" STAT CARDS & SIDE-BY-SIDE BAR CHART */}
      <div className="bg-white p-5 rounded-lg border border-[#D9DEE3] shadow-xs space-y-5">
        <div className="border-b border-[#D9DEE3] pb-2.5 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-[#0B3D66] uppercase tracking-wide">
              At a Glance Portfolio Telemetry
            </h2>
            <p className="text-xs text-[#0B2942]/70">National infrastructure status and risk indicators</p>
          </div>
          <span className="text-xs font-bold text-[#0B3D66] font-mono">
            {data.total_projects} Active Portfolios
          </span>
        </div>

        {/* Top 6 Stat Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Total Projects */}
          <div className="bg-[#F4F6F8] p-3.5 rounded border border-[#D9DEE3] space-y-1">
            <span className="text-[11px] font-bold text-[#0B2942]/70 uppercase">Total Projects</span>
            <div className="text-2xl font-black text-[#0B3D66]">{data.total_projects}</div>
            <span className="text-[10px] text-[#0B2942]/60">Tracked Portfolios</span>
          </div>

          {/* Active Projects */}
          <div className="bg-[#F4F6F8] p-3.5 rounded border border-[#D9DEE3] space-y-1">
            <span className="text-[11px] font-bold text-[#0B2942]/70 uppercase">Active Projects</span>
            <div className="text-2xl font-black text-[#1E8449]">
              {data.total_projects - data.high_risk_projects}
            </div>
            <span className="text-[10px] text-[#1E8449] font-bold">On-Going Monitoring</span>
          </div>

          {/* High Risk */}
          <div className="bg-rose-50/70 p-3.5 rounded border border-[#B03A2E]/30 space-y-1">
            <span className="text-[11px] font-bold text-[#B03A2E] uppercase">High Risk</span>
            <div className="text-2xl font-black text-[#B03A2E]">{data.high_risk_projects}</div>
            <span className="text-[10px] text-[#B03A2E] font-bold">Requires Action</span>
          </div>

          {/* Delayed */}
          <div className="bg-amber-50/70 p-3.5 rounded border border-[#E8862C]/30 space-y-1">
            <span className="text-[11px] font-bold text-[#E8862C] uppercase">Delayed Projects</span>
            <div className="text-2xl font-black text-[#E8862C]">{data.delay_risk_projects}</div>
            <span className="text-[10px] text-[#E8862C] font-bold">Schedule Slippage</span>
          </div>

          {/* Critical Alerts */}
          <div className="bg-red-50/70 p-3.5 rounded border border-[#7B241C]/30 space-y-1">
            <span className="text-[11px] font-bold text-[#7B241C] uppercase">Critical Alerts</span>
            <div className="text-2xl font-black text-[#7B241C]">
              {(data.recent_alerts || []).filter((a) => a.severity === 'HIGH').length}
            </div>
            <span className="text-[10px] text-[#7B241C] font-bold">Early Warnings</span>
          </div>

          {/* Avg Risk Index */}
          <div className="bg-[#F4F6F8] p-3.5 rounded border border-[#D9DEE3] space-y-1">
            <span className="text-[11px] font-bold text-[#0B2942]/70 uppercase">Avg Risk Index</span>
            <div className="text-2xl font-black text-[#0B2942]">{data.avg_risk_score.toFixed(0)}%</div>
            <span className="text-[10px] text-[#0B2942]/60">Composite Score</span>
          </div>
        </div>

        {/* "At a Glance" Side-by-Side Bar Chart */}
        <div className="pt-2">
          <h3 className="text-xs font-bold text-[#0B2942] mb-2 uppercase tracking-wide">
            Portfolio Categories Breakdown (Side-by-Side Comparison)
          </h3>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={atAGlanceBarData} margin={{ top: 15, right: 15, left: -15, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={colors.gridline} vertical={false} />
                <XAxis dataKey="category" stroke={colors.gridline} tick={{ fontSize: 11, fill: colors.textNavy, fontWeight: 700 }} />
                <YAxis allowDecimals={false} stroke={colors.gridline} tick={{ fontSize: 11, fill: colors.textNavy }} />
                <Tooltip
                  cursor={{ fill: 'rgba(11, 61, 102, 0.04)' }}
                  contentStyle={customTooltipStyle}
                  formatter={(val: number) => [`${val} Projects`, 'Count']}
                />
                <Bar dataKey="count" radius={[2, 2, 0, 0]} barSize={40}>
                  {atAGlanceBarData.map((entry, index) => (
                    <Cell key={`cell-at-glance-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ROW 1: Risk Distribution (Donut) & Project Progress Overview (Bar) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Risk Distribution (Donut Chart) */}
        <div className="lg:col-span-5 bg-white p-5 rounded-lg border border-[#D9DEE3] shadow-xs space-y-3">
          <div className="border-b border-[#D9DEE3] pb-2.5">
            <h2 className="text-sm font-bold text-[#0B3D66] flex items-center gap-1.5">
              <PieChartIcon className="h-4 w-4 text-[#0B3D66]" />
              Risk Level Distribution
            </h2>
            <p className="text-xs text-[#0B2942]/70">Projects categorized by ML risk severity (Low / Medium / High / Critical)</p>
          </div>

          <div className="h-44 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={riskDonutData}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={68}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {riskDonutData.map((entry, index) => (
                    <Cell key={`cell-risk-donut-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={customTooltipStyle}
                  formatter={(val: number) => [`${val} Projects`, 'Count']}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-2 border-t border-[#D9DEE3] pt-2 text-xs">
            {riskDonutData.map((item) => (
              <div key={item.name} className="flex items-center justify-between bg-[#F4F6F8] px-2.5 py-1.5 rounded border border-[#D9DEE3]">
                <span className="flex items-center gap-1.5 text-[#0B2942] font-semibold">
                  <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                  {item.name}
                </span>
                <span className="font-bold font-mono text-[#0B2942]">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Project Physical Progress Completion (Horizontal Bar Chart) */}
        <div className="lg:col-span-7 bg-white p-5 rounded-lg border border-[#D9DEE3] shadow-xs space-y-3">
          <div className="border-b border-[#D9DEE3] pb-2.5 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-[#0B3D66] flex items-center gap-1.5">
                <BarChart3 className="h-4 w-4 text-[#0B3D66]" />
                Top Infrastructure Physical Completion (%)
              </h2>
              <p className="text-xs text-[#0B2942]/70">Physical progress metrics for major national projects</p>
            </div>
            <span className="text-xs font-bold text-[#0B3D66] font-mono">
              Physical Progress %
            </span>
          </div>

          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={progressOverviewData}
                layout="vertical"
                margin={{ top: 5, right: 25, left: 10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={colors.gridline} horizontal={false} />
                <XAxis type="number" domain={[0, 100]} unit="%" stroke={colors.gridline} tick={{ fontSize: 11, fill: colors.textNavy, fontWeight: 600 }} />
                <YAxis type="category" dataKey="name" stroke={colors.gridline} tick={{ fontSize: 11, fill: colors.textNavy, fontWeight: 600 }} width={120} />
                <Tooltip
                  contentStyle={customTooltipStyle}
                  formatter={(val: number, name: string, item: any) => [`${val}% Completed`, item.payload.fullName]}
                />
                <Bar dataKey="progress" name="Physical Progress" fill={colors.navy} radius={[0, 2, 2, 0]} barSize={16} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ROW 2: Risk Intelligence & Performance Analytics: Line Chart of Avg Risk Score Trend */}
      <div className="bg-white p-5 rounded-lg border border-[#D9DEE3] shadow-xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#D9DEE3] pb-2.5">
            <div>
              <h2 className="text-sm font-bold text-[#0B3D66] flex items-center gap-1.5">
                <LineChartIcon className="h-4 w-4 text-[#0B3D66]" />
                Risk Intelligence: Avg Risk Score Trend Over Time
              </h2>
              <p className="text-xs text-[#0B2942]/70">Monthly tracking of composite portfolio risk score trajectory</p>
            </div>
            <div className="flex items-center gap-1 bg-[#F4F6F8] p-1 rounded border border-[#D9DEE3] shrink-0">
              <button
                onClick={() => setTrendMetricMode('avg_score')}
                className={`px-2 py-0.5 text-[11px] font-bold rounded ${
                  trendMetricMode === 'avg_score' ? 'bg-[#0B3D66] text-white' : 'text-[#0B2942]'
                }`}
              >
                Avg Risk Score
              </button>
              <button
                onClick={() => setTrendMetricMode('all')}
                className={`px-2 py-0.5 text-[11px] font-bold rounded ${
                  trendMetricMode === 'all' ? 'bg-[#0B3D66] text-white' : 'text-[#0B2942]'
                }`}
              >
                All Metrics
              </button>
            </div>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData} margin={{ top: 10, right: 15, left: -15, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={colors.gridline} />
                <XAxis dataKey="month" stroke={colors.gridline} tick={{ fontSize: 11, fill: colors.textNavy, fontWeight: 600 }} />
                <YAxis domain={[0, 100]} stroke={colors.gridline} tick={{ fontSize: 11, fill: colors.textNavy }} unit="%" />
                <Tooltip contentStyle={customTooltipStyle} />
                <Legend verticalAlign="top" wrapperStyle={{ fontSize: 11, color: colors.textNavy, fontWeight: 600 }} />
                <Line
                  type="monotone"
                  dataKey="avgScore"
                  name="Avg Risk Score (%)"
                  stroke={colors.navy}
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: colors.navy }}
                />
                {trendMetricMode === 'all' && (
                  <Line
                    type="monotone"
                    dataKey="highRisk"
                    name="High Risk Count"
                    stroke={colors.redMaroon}
                    strokeWidth={2}
                    dot={{ r: 3, fill: colors.redMaroon }}
                  />
                )}
                {trendMetricMode === 'all' && (
                  <Line
                    type="monotone"
                    dataKey="delayRisk"
                    name="Delay Risk Count"
                    stroke={colors.orange}
                    strokeWidth={2}
                    strokeDasharray="4 4"
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

      {/* ROW 3: Budget vs Actual Expenditure (Grouped Bar) & Regional Distribution (Bar) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Budget vs Actual Expenditure */}
        <div className="lg:col-span-7 bg-white p-5 rounded-lg border border-[#D9DEE3] shadow-xs space-y-3">
          <div className="border-b border-[#D9DEE3] pb-2.5">
            <h2 className="text-sm font-bold text-[#0B3D66] flex items-center gap-1.5">
              <Coins className="h-4 w-4 text-[#0B3D66]" />
              Budget vs Actual Expenditure (₹ Crore)
            </h2>
            <p className="text-xs text-[#0B2942]/70">Comparison of sanctioned budget against actual cumulative expenditure</p>
          </div>

          {budgetVsActualData.length > 0 ? (
            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={budgetVsActualData} margin={{ top: 15, right: 15, left: -5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={colors.gridline} vertical={false} />
                  <XAxis dataKey="name" stroke={colors.gridline} tick={{ fontSize: 11, fill: colors.textNavy, fontWeight: 600 }} />
                  <YAxis stroke={colors.gridline} tick={{ fontSize: 11, fill: colors.textNavy }} tickFormatter={(v) => `₹${v}Cr`} />
                  <Tooltip
                    cursor={{ fill: 'rgba(11, 61, 102, 0.04)' }}
                    contentStyle={customTooltipStyle}
                    formatter={(val: number, name: string) => [
                      formatCurrency(val),
                      name === 'sanctionedBudget' ? 'Sanctioned Budget' : 'Actual Expenditure',
                    ]}
                  />
                  <Legend verticalAlign="top" wrapperStyle={{ fontSize: 11, color: colors.textNavy, fontWeight: 600 }} />
                  <Bar dataKey="sanctionedBudget" name="Sanctioned Budget" fill={colors.navy} radius={[2, 2, 0, 0]} />
                  <Bar dataKey="actualExpenditure" name="Actual Expenditure" fill={colors.orange} radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-60 flex items-center justify-center text-xs text-slate-500">
              Financial data not available.
            </div>
          )}
        </div>

        {/* Regional / State Distribution */}
        <div className="lg:col-span-5 bg-white p-5 rounded-lg border border-[#D9DEE3] shadow-xs space-y-3">
          <div className="border-b border-[#D9DEE3] pb-2.5">
            <h2 className="text-sm font-bold text-[#0B3D66] flex items-center gap-1.5">
              <MapPin className="h-4 w-4 text-[#0B3D66]" />
              Regional & State Distribution
            </h2>
            <p className="text-xs text-[#0B2942]/70">Project volume distribution across Indian states and regions</p>
          </div>

          {stateDistributionData.length > 0 ? (
            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stateDistributionData} margin={{ top: 15, right: 15, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={colors.gridline} vertical={false} />
                  <XAxis dataKey="state" stroke={colors.gridline} tick={{ fontSize: 10, fill: colors.textNavy, fontWeight: 600 }} />
                  <YAxis allowDecimals={false} stroke={colors.gridline} tick={{ fontSize: 11, fill: colors.textNavy }} />
                  <Tooltip
                    cursor={{ fill: 'rgba(11, 61, 102, 0.04)' }}
                    contentStyle={customTooltipStyle}
                    formatter={(val: number) => [`${val} Projects`, 'Count']}
                  />
                  <Bar dataKey="count" fill={colors.navy} radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-60 flex items-center justify-center text-xs text-slate-500">
              State distribution data not available.
            </div>
          )}
        </div>
      </div>

      {/* ROW 3: Early Warning Summary & Priority Projects Table */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Early Warning Summary */}
        <div className="lg:col-span-4 bg-white p-5 rounded-lg border border-[#D9DEE3] shadow-xs space-y-3">
          <div className="border-b border-[#D9DEE3] pb-2.5">
            <h2 className="text-sm font-bold text-[#0B3D66] flex items-center gap-1.5">
              <AlertTriangle className="h-4 w-4 text-[#B03A2E]" />
              Early Warning Summary
            </h2>
            <p className="text-xs text-[#0B2942]/70">Active warning alerts classified by severity level</p>
          </div>

          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={earlyWarningData} margin={{ top: 15, right: 15, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={colors.gridline} vertical={false} />
                <XAxis dataKey="severity" stroke={colors.gridline} tick={{ fontSize: 11, fill: colors.textNavy, fontWeight: 600 }} />
                <YAxis allowDecimals={false} stroke={colors.gridline} tick={{ fontSize: 11, fill: colors.textNavy }} />
                <Tooltip
                  cursor={{ fill: 'rgba(176, 58, 46, 0.04)' }}
                  contentStyle={customTooltipStyle}
                  formatter={(val: number) => [`${val} Alerts`, 'Severity Count']}
                />
                <Bar dataKey="count" radius={[2, 2, 0, 0]}>
                  {earlyWarningData.map((entry, index) => (
                    <Cell key={`cell-early-warn-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="border-t border-[#D9DEE3] pt-2 flex items-center justify-between text-xs">
            <span className="text-[#0B2942] font-medium">Total Active Alerts:</span>
            <span className="font-bold text-[#B03A2E] font-mono">
              {(data.recent_alerts || []).length}
            </span>
          </div>
        </div>

        {/* Priority Infrastructure Projects Requiring Attention Table */}
        <div className="lg:col-span-8 bg-white p-5 rounded-lg border border-[#D9DEE3] shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-[#D9DEE3] pb-2.5">
            <div>
              <h2 className="text-sm font-bold text-[#0B3D66]">Recent Critical Infrastructure Projects</h2>
              <p className="text-xs text-[#0B2942]/70">Priority project list requiring executive intervention</p>
            </div>
            <Link
              to="/projects?risk_level=HIGH"
              className="text-xs font-bold text-[#0B3D66] hover:underline flex items-center gap-1"
            >
              <span>View All Projects</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border border-[#D9DEE3]">
              <thead>
                <tr className="bg-[#0B3D66] text-white font-bold">
                  <th className="py-2.5 px-3 border-r border-[#0B3D66]">Code</th>
                  <th className="py-2.5 px-3 border-r border-[#0B3D66]">Project Name</th>
                  <th className="py-2.5 px-3 border-r border-[#0B3D66]">Sector</th>
                  <th className="py-2.5 px-3 border-r border-[#0B3D66]">Risk</th>
                  <th className="py-2.5 px-3 border-r border-[#0B3D66]">Delay Prob</th>
                  <th className="py-2.5 px-3 border-r border-[#0B3D66]">Progress</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D9DEE3]">
                {data.top_high_risk_projects.slice(0, 4).map((p) => (
                  <tr key={p.id} className="hover:bg-[#F4F6F8] transition-colors">
                    <td className="py-2 px-3 font-mono font-bold text-[#0B3D66]">{p.project_code}</td>
                    <td className="py-2 px-3 font-bold text-[#0B2942]">{p.project_name}</td>
                    <td className="py-2 px-3 text-[#0B2942]/80">{p.sector}</td>
                    <td className="py-2 px-3">
                      <RiskBadge
                        level={p.prediction?.risk_level || 'HIGH'}
                        score={p.prediction?.risk_score}
                        size="sm"
                      />
                    </td>
                    <td className="py-2 px-3 font-bold text-[#E8862C]">
                      {p.prediction?.delay_probability || 0}%
                    </td>
                    <td className="py-2 px-3 font-bold text-[#1E8449]">
                      {p.latest_monitoring?.physical_progress || 0}%
                    </td>
                    <td className="py-2 px-3 text-right">
                      <Link
                        to={`/projects/${p.id}`}
                        className="inline-flex items-center gap-1 rounded bg-[#0B3D66] text-white px-2 py-0.5 text-[11px] font-bold hover:bg-[#0B2942] transition-colors"
                      >
                        <span>View</span>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
