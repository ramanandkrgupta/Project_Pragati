import React, { useEffect, useState } from 'react';
import {
  BrainCircuit,
  CheckCircle2,
  Sliders,
  TrendingUp,
  Award,
  Zap,
  BarChart3,
  Layers,
  Sparkles,
  RefreshCw,
  ShieldAlert,
  Info,
  CheckSquare,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from 'recharts';
import { fetchModelInsights, simulatePrediction } from '../services/api';
import { ModelInsightsData, Prediction } from '../types';
import { RiskBadge } from '../components/RiskBadge';
import { useAccessibility } from '../context/AccessibilityContext';

export const ModelInsights: React.FC = () => {
  const [data, setData] = useState<ModelInsightsData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Interactive Simulator State
  const [simCost, setSimCost] = useState<number>(3500);
  const [simRevCost, setSimRevCost] = useState<number>(4500);
  const [simExp, setSimExp] = useState<number>(3200);
  const [simPhys, setSimPhys] = useState<number>(42);
  const [simTimelineExt, setSimTimelineExt] = useState<number>(18);
  const [simSector, setSimSector] = useState<string>('Highways');
  const [simResult, setSimResult] = useState<{ prediction: Prediction; alerts: any[] } | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetchModelInsights();
      setData(res);
    } catch (err: any) {
      setError(err.message || 'Failed to load model insights');
    } finally {
      setLoading(false);
    }
  };

  const [isSimulating, setIsSimulating] = useState(false);

  const runSimulation = async () => {
    setIsSimulating(true);
    try {
      const res = await simulatePrediction({
        original_cost: simCost,
        revised_cost: simRevCost,
        expenditure: simExp,
        physical_progress: simPhys,
        timeline_extension_months: simTimelineExt,
        sector: simSector,
      });
      setSimResult(res);
    } catch (err: any) {
      console.error('Simulation error', err);
    } finally {
      setIsSimulating(false);
    }
  };

  useEffect(() => {
    loadData();
    runSimulation();
  }, []);

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center font-sans">
        <RefreshCw className="h-8 w-8 animate-spin text-[#003B6F]" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 font-sans">
        <div className="rounded border border-rose-200 bg-rose-50 p-6 text-rose-800">
          <h3 className="font-bold">Failed to load model telemetry</h3>
          <p className="text-sm mt-1">{error}</p>
        </div>
      </div>
    );
  }

  const { isHighContrast } = useAccessibility();

  const colors = {
    navy: isHighContrast ? '#000080' : '#0B3D66',
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

  const importanceChartData = (data.feature_importance || []).map((f) => ({
    name: f.feature_name,
    importance: Math.round(f.importance * 100),
  }));

  return (
    <div id="model-insights-page" className="space-y-6 pb-12 font-sans">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#D9E1E8] pb-4">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded bg-blue-50 px-2.5 py-1 text-xs font-bold text-[#0B3D66] border border-blue-200 mb-1">
            <BrainCircuit className="h-4 w-4" />
            <span>Explainable AI Engine</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0B3D66] font-serif">
            Risk Intelligence
          </h1>
          <p className="text-xs text-[#0B2942]/70">
            Explainable AI-assisted project risk assessment.
          </p>
        </div>

        {/* Official Officer Disclaimer Banner */}
        <div className="bg-amber-50 border border-amber-300 text-amber-900 px-3.5 py-2 rounded text-xs font-bold flex items-center gap-2 max-w-sm">
          <Info className="h-4 w-4 text-[#E8862C] shrink-0" />
          <span>AI-generated assessment — officer review required.</span>
        </div>
      </div>

      {/* Model Benchmark Architecture Banner */}
      <div className="bg-white p-5 rounded-lg border border-[#D9DEE3] shadow-xs space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-[#0B2942]">Production AI Model Architecture</h2>
          <span className="text-xs font-bold text-[#1E8449] bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-200">
            Validated Accuracy: {(data.validation_accuracy * 100).toFixed(1)}%
          </span>
        </div>
        <p className="text-xs text-[#0B2942]/80 leading-relaxed">
          {data.justification}
        </p>
      </div>

      {/* Feature Importance Analysis Chart */}
      <div className="bg-white p-6 rounded-lg border border-[#D9DEE3] shadow-xs space-y-4">
        <div className="border-b border-[#D9DEE3] pb-3">
          <h2 className="text-base font-bold text-[#0B3D66]">Global Risk Drivers (Feature Importance)</h2>
          <p className="text-xs text-[#0B2942]/70">Shapley relative contribution to risk scores</p>
        </div>

        <div className="h-60">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={importanceChartData}
              layout="vertical"
              margin={{ top: 5, right: 20, left: 150, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={colors.gridline} />
              <XAxis type="number" unit="%" stroke={colors.gridline} tick={{ fontSize: 11, fill: colors.textNavy }} />
              <YAxis type="category" dataKey="name" stroke={colors.gridline} tick={{ fontSize: 11, fill: colors.textNavy }} width={140} />
              <Tooltip contentStyle={customTooltipStyle} formatter={(val: number) => [`${val}%`, 'Importance']} />
              <Bar dataKey="importance" fill={colors.navy} radius={[0, 2, 2, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Interactive Scenario Lab */}
      <div className="bg-white p-6 rounded-lg border border-[#D9E1E8] shadow-xs space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <Sliders className="h-5 w-5 text-[#4C51BF]" />
          <div>
            <h2 className="text-base font-bold text-[#172033]">Live AI Inference & What-If Scenario Lab</h2>
            <p className="text-xs text-[#667085]">Adjust project telemetry parameters in real time to observe live decision tree triggers and early warning generation</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 text-xs">
          {/* Controls */}
          <div className="lg:col-span-7 space-y-3 bg-[#F5F7FA] p-4 rounded border border-slate-200">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Sector Domain</label>
              <select
                value={simSector}
                onChange={(e) => setSimSector(e.target.value)}
                className="w-full rounded border border-[#D9E1E8] bg-white p-1.5"
              >
                <option value="Highways">Highways</option>
                <option value="Railways">Railways</option>
                <option value="Metro Rail">Metro Rail</option>
                <option value="Renewable Energy">Renewable Energy</option>
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-700 flex justify-between">
                <span>Original Cost:</span>
                <span className="font-mono text-[#005A9C]">₹{simCost} Cr</span>
              </label>
              <input
                type="range"
                min={500}
                max={10000}
                step={100}
                value={simCost}
                onChange={(e) => setSimCost(Number(e.target.value))}
                className="w-full"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 flex justify-between">
                <span>Revised Cost:</span>
                <span className="font-mono text-[#005A9C]">₹{simRevCost} Cr</span>
              </label>
              <input
                type="range"
                min={simCost}
                max={15000}
                step={100}
                value={simRevCost}
                onChange={(e) => setSimRevCost(Number(e.target.value))}
                className="w-full"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 flex justify-between">
                <span>Expenditure Disbursed:</span>
                <span className="font-mono text-[#4C51BF]">₹{simExp} Cr ({((simExp/simRevCost)*100).toFixed(0)}% Financial)</span>
              </label>
              <input
                type="range"
                min={0}
                max={simRevCost}
                step={100}
                value={simExp}
                onChange={(e) => setSimExp(Number(e.target.value))}
                className="w-full"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 flex justify-between">
                <span>Physical Ground Progress:</span>
                <span className="font-mono text-[#138808]">{simPhys}%</span>
              </label>
              <input
                type="range"
                min={0}
                max={100}
                step={1}
                value={simPhys}
                onChange={(e) => setSimPhys(Number(e.target.value))}
                className="w-full"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 flex justify-between">
                <span>Timeline Revision Slippage:</span>
                <span className="font-mono text-[#C98200]">+{simTimelineExt} Months</span>
              </label>
              <input
                type="range"
                min={0}
                max={48}
                step={1}
                value={simTimelineExt}
                onChange={(e) => setSimTimelineExt(Number(e.target.value))}
                className="w-full"
              />
            </div>
            <button
              onClick={runSimulation}
              disabled={isSimulating}
              className="mt-4 w-full bg-[#0B3D66] text-white py-2 rounded font-bold hover:bg-[#002B4A] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
            >
              {isSimulating ? <RefreshCw className="h-4 w-4 animate-spin" /> : <BrainCircuit className="h-4 w-4" />}
              {isSimulating ? "Simulating Scenario..." : "Run Simulation"}
            </button>
          </div>

          {/* Results Output */}
          <div className="lg:col-span-5 bg-white p-6 rounded-lg border border-slate-200 shadow-sm space-y-4">
            {isSimulating ? (
              <div className="h-full w-full flex flex-col items-center justify-center text-[#4C51BF] space-y-2 py-10">
                <RefreshCw className="h-6 w-6 animate-spin opacity-80" />
                <span className="text-sm font-bold opacity-80">Evaluating ML Risk...</span>
              </div>
            ) : simResult ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Simulated Prediction</span>
                    <h3 className="font-bold text-lg text-[#172033]">Live Risk Assessment</h3>
                  </div>
                  <div className={`px-3 py-1 rounded-full border text-xs font-bold flex items-center gap-1.5 ${
                    simResult.prediction.risk_level === 'HIGH' ? 'bg-rose-50 text-rose-700 border-rose-200' : 
                    simResult.prediction.risk_level === 'MEDIUM' ? 'bg-amber-50 text-amber-700 border-amber-200' : 
                    'bg-emerald-50 text-emerald-700 border-emerald-200'
                  }`}>
                    <ShieldAlert className="h-3 w-3" />
                    <span>{simResult.prediction.risk_level} RISK {simResult.prediction.risk_score}/100</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-center">
                  <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                    <span className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">Delay Prob</span>
                    <div className="text-2xl font-bold text-[#E53E3E] mt-1">
                      {simResult.prediction.delay_probability}%
                    </div>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                    <span className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">Cost Escalation</span>
                    <div className="text-2xl font-bold text-[#DD6B20] mt-1">
                      {simResult.prediction.cost_overrun_probability}%
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <span className="text-xs font-bold text-slate-700">Top Inferred Factor:</span>
                    <div className="mt-1 p-3 bg-white rounded border border-slate-200 text-sm text-slate-600 leading-relaxed shadow-sm">
                      {simResult.prediction.top_inferred_factor}
                    </div>
                  </div>
                  <div>
                    <span className="text-xs font-bold text-[#2B6CB0]">Prescriptive Action:</span>
                    <div className="mt-1 p-3 bg-blue-50 rounded border border-blue-200 text-sm text-[#2C5282] leading-relaxed shadow-sm">
                      {simResult.prediction.recommended_action}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-slate-400 text-center py-10">Calculating inference...</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
