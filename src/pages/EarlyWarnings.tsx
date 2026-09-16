import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Coins,
  Filter,
  RefreshCw,
  ShieldAlert,
  ArrowUpRight,
  Sparkles,
  Search,
  CheckSquare,
} from 'lucide-react';
import { fetchAlerts, updateAlertStatus } from '../services/api';
import { Alert, AlertSeverity, AlertStatus } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { useAuth } from '../context/AuthContext';

export const EarlyWarnings: React.FC = () => {
  const { isAdmin } = useAuth();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const loadAlerts = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchAlerts({
        severity: severityFilter,
        status: statusFilter,
      });
      setAlerts(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load early warning alerts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAlerts();
  }, [severityFilter, statusFilter]);

  const handleStatusChange = async (alertId: string, newStatus: AlertStatus) => {
    try {
      const updated = await updateAlertStatus(alertId, newStatus);
      setAlerts((prev) => prev.map((a) => (a.id === alertId ? updated : a)));
    } catch (err: any) {
      alert('Failed to update alert: ' + err.message);
    }
  };

  const filteredAlerts = alerts.filter((a) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      a.project_name.toLowerCase().includes(q) ||
      a.project_code.toLowerCase().includes(q) ||
      a.message.toLowerCase().includes(q) ||
      a.sector.toLowerCase().includes(q)
    );
  });

  const highSeverityCount = alerts.filter((a) => a.severity === 'HIGH').length;
  const mediumSeverityCount = alerts.filter((a) => a.severity === 'MEDIUM').length;
  const newCount = alerts.filter((a) => a.status === 'NEW').length;
  const resolvedCount = alerts.filter((a) => a.status === 'RESOLVED').length;

  return (
    <div id="early-warnings-page" className="space-y-6 pb-12 font-sans">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#D9E1E8] pb-4">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded bg-rose-50 px-2.5 py-1 text-xs font-bold text-[#C62828] border border-rose-200 mb-1">
            <AlertOctagon className="h-4 w-4" />
            <span>Prescriptive Intervention Desk</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#003B6F] font-serif">
            Early Warning & Intervention Centre
          </h1>
          <p className="text-xs text-[#667085]">
            Automated bottleneck detection, schedule divergence alerts, and recommended corrective actions for officers.
          </p>
        </div>

        <button
          onClick={loadAlerts}
          className="inline-flex items-center gap-1.5 rounded bg-white text-[#003B6F] border border-[#D9E1E8] hover:bg-[#F5F7FA] px-3.5 py-2 text-xs font-bold shadow-xs transition-colors"
        >
          <RefreshCw className="h-3.5 w-3.5 text-[#005A9C]" />
          <span>Refresh Alerts</span>
        </button>
      </div>

      {/* Alert Status Summary Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-rose-50/50 p-4 rounded-lg border border-rose-200 shadow-xs space-y-1">
          <span className="text-[11px] font-bold text-[#C62828] uppercase">Critical Alerts</span>
          <div className="text-2xl font-black text-[#C62828]">{highSeverityCount}</div>
          <span className="text-[10px] text-rose-800 font-bold">High Severity Threshold</span>
        </div>

        <div className="bg-amber-50/50 p-4 rounded-lg border border-amber-200 shadow-xs space-y-1">
          <span className="text-[11px] font-bold text-[#C98200] uppercase">Medium Warnings</span>
          <div className="text-2xl font-black text-[#C98200]">{mediumSeverityCount}</div>
          <span className="text-[10px] text-amber-800 font-bold">Progress Divergence</span>
        </div>

        <div className="bg-blue-50/50 p-4 rounded-lg border border-blue-200 shadow-xs space-y-1">
          <span className="text-[11px] font-bold text-[#005A9C] uppercase">New Alerts</span>
          <div className="text-2xl font-black text-[#005A9C]">{newCount}</div>
          <span className="text-[10px] text-blue-800 font-bold">Requires Review</span>
        </div>

        <div className="bg-emerald-50/50 p-4 rounded-lg border border-emerald-200 shadow-xs space-y-1">
          <span className="text-[11px] font-bold text-[#138808] uppercase">Resolved Alerts</span>
          <div className="text-2xl font-black text-[#138808]">{resolvedCount}</div>
          <span className="text-[10px] text-[#138808] font-bold">Intervention Complete</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-lg border border-[#D9E1E8] shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search early warning alerts by project ID, name, or anomaly keyword..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded border border-[#D9E1E8] bg-[#F5F7FA] pl-8 pr-3 py-1.5 text-xs text-[#172033] focus:border-[#005A9C] focus:bg-white focus:outline-hidden"
            />
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="font-bold text-slate-600">Severity:</span>
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="rounded border border-[#D9E1E8] bg-white px-2 py-1"
            >
              <option value="ALL">All Severities</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="font-bold text-slate-600">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded border border-[#D9E1E8] bg-white px-2 py-1"
            >
              <option value="ALL">All Statuses</option>
              <option value="NEW">New</option>
              <option value="REVIEWED">Reviewed</option>
              <option value="RESOLVED">Resolved</option>
            </select>
          </div>
        </div>
      </div>

      {/* Alerts Feed */}
      {loading ? (
        <div className="py-16 text-center text-slate-500 text-xs">
          <RefreshCw className="h-6 w-6 animate-spin text-[#003B6F] mx-auto mb-2" />
          <span>Loading early warning telemetry...</span>
        </div>
      ) : error ? (
        <div className="p-8 text-center text-[#C62828] text-xs font-semibold">{error}</div>
      ) : filteredAlerts.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-lg border border-[#D9E1E8] space-y-2">
          <CheckCircle2 className="h-10 w-10 text-[#138808] mx-auto" />
          <h3 className="text-sm font-bold text-[#172033]">No active warnings match your current filters.</h3>
          <p className="text-xs text-slate-500">All project monitoring thresholds operating normally.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredAlerts.map((alert) => (
            <div
              key={alert.id}
              className={`bg-white p-5 rounded-lg border shadow-xs space-y-4 ${
                alert.severity === 'HIGH' ? 'border-rose-300' : 'border-[#D9E1E8]'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-xs text-[#003B6F]">{alert.project_code}</span>
                  <span className="text-slate-300">•</span>
                  <Link
                    to={`/projects/${alert.project_id}`}
                    className="font-bold text-sm text-[#172033] hover:text-[#005A9C]"
                  >
                    {alert.project_name}
                  </Link>
                </div>

                <div className="flex items-center gap-2">
                  <StatusBadge status={alert.status} size="sm" />
                  <span className="text-[11px] text-slate-500 font-mono">
                    {new Date(alert.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {/* Grid: Anomaly & Action Plan */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="p-3 bg-[#F5F7FA] rounded border border-slate-200 space-y-1">
                  <span className="text-[10px] font-bold text-[#C62828] uppercase">Detected Anomaly / Evidence</span>
                  <p className="font-semibold text-[#172033] leading-relaxed">{alert.message}</p>
                </div>

                <div className="p-3 bg-blue-50/70 rounded border border-blue-200 space-y-1">
                  <span className="text-[10px] font-bold text-[#005A9C] uppercase">Recommended Action Plan</span>
                  <p className="font-semibold text-blue-950 leading-relaxed">{alert.recommended_action}</p>
                </div>
              </div>

              {/* Status Update Buttons for Officers */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                <span className="text-slate-500">Sector: {alert.sector}</span>

                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-slate-500 font-bold">Update Status:</span>
                  {(['NEW', 'REVIEWED', 'RESOLVED'] as AlertStatus[]).map((st) => (
                    <button
                      key={st}
                      onClick={() => handleStatusChange(alert.id, st)}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors ${
                        alert.status === st
                          ? 'bg-[#003B6F] text-white border-[#003B6F]'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
