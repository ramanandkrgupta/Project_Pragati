import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ShieldAlert,
  Activity,
  AlertOctagon,
  BrainCircuit,
  FileText,
  Search,
  Database,
  Sparkles,
  ArrowRight,
  ChevronRight,
  TrendingUp,
  CheckCircle2,
  Bell,
  Building2,
  Calendar,
  Lock,
} from 'lucide-react';
import { fetchDashboard } from '../services/api';
import { DashboardSummary } from '../types';
import { useAuth } from '../context/AuthContext';

export const PublicHome: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const data = await fetchDashboard();
        setSummary(data);
      } catch {
        // Fallback demo summary if unauthenticated or network error
        setSummary({
          total_projects: 42,
          high_risk_projects: 8,
          delay_risk_projects: 14,
          cost_risk_projects: 9,
          avg_risk_score: 41,
          risk_distribution: { low: 20, medium: 14, high: 8 },
          risk_trends: [],
          top_high_risk_projects: [],
          sector_risk_summary: [],
          progress_divergence_projects: [],
          recent_alerts: [],
        });
      } finally {
        setLoading(false);
      }
    };
    loadStats();
  }, []);

  const services = [
    {
      title: 'Project Monitoring',
      desc: 'Track physical progress, financial expenditure, and schedule slippage across infrastructure projects.',
      icon: Activity,
      link: '/projects',
      tag: 'Core Telemetry',
      iconBg: 'bg-[#0B3D66] text-white',
    },
    {
      title: 'Early Warning Centre',
      desc: 'Automated detection of timeline delays, milestone slippage, and budget escalation alerts.',
      icon: AlertOctagon,
      link: '/alerts',
      tag: 'Prescriptive Action',
      iconBg: 'bg-[#E8862C] text-white',
    },
    {
      title: 'Risk Intelligence',
      desc: 'Explainable AI-assisted project risk scoring based on historical performance vectors.',
      icon: BrainCircuit,
      link: '/model-insights',
      tag: 'Explainable AI',
      iconBg: 'bg-[#1E3A8A] text-white',
    },
    {
      title: 'Project Reports',
      desc: 'Download sector-wise, ministry-wise, and state-wise performance and risk publications.',
      icon: FileText,
      link: '/reports',
      tag: 'Official Records',
      iconBg: 'bg-[#1E8449] text-white',
    },
    {
      title: 'Project Search',
      desc: 'Search, filter, and inspect infrastructure projects by department, location, and risk level.',
      icon: Search,
      link: '/projects',
      tag: 'Portfolio Explorer',
      iconBg: 'bg-[#0B3D66] text-white',
    },
    {
      title: 'Performance Analytics',
      desc: 'National monitoring dashboard featuring sector risk distribution and cost variance trends.',
      icon: TrendingUp,
      link: '/dashboard',
      tag: 'Executive Desk',
      iconBg: 'bg-[#0B3D66] text-white',
    },
    {
      title: 'Data Upload & Quality',
      desc: 'Secure batch ingestion workflow with validation checks for official project metrics.',
      icon: Database,
      link: '/upload',
      tag: 'Data Pipeline',
      iconBg: 'bg-[#1E8449] text-white',
    },
    {
      title: 'PRAGATI AI Copilot',
      desc: 'Institutional analytical assistant for grounded telemetry queries and evidence lookup.',
      icon: Sparkles,
      link: '/dashboard',
      tag: 'AI Assistance',
      iconBg: 'bg-[#E8862C] text-white',
    },
  ];

  const announcements = [
    {
      date: '12 Sep 2026',
      category: 'Reporting Deadline',
      title: 'Q2 Physical Progress Data Submission Deadline for Highway & Energy Infrastructure Projects.',
    },
    {
      date: '08 Sep 2026',
      category: 'System Update',
      title: 'PRAGATI Risk Intelligence Engine upgraded to Version 2.4 with enhanced cost variance detection.',
    },
    {
      date: '01 Sep 2026',
      category: 'Monitoring Update',
      title: 'New Early Warning protocol activated for Railway & Urban Development projects with >10% progress gap.',
    },
  ];

  return (
    <div className="space-y-12 pb-12 font-sans">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-[#0B1F33] via-[#003B6F] to-[#005A9C] text-white rounded-xl shadow-lg border border-[#005A9C]/40 p-6 sm:p-10 lg:p-12 relative overflow-hidden">
        <div className="max-w-3xl space-y-5 relative z-10">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#E87500]/20 px-3.5 py-1 text-xs font-bold text-amber-300 border border-[#E87500]/40">
            <ShieldAlert className="h-3.5 w-3.5" />
            <span>National Integrated Infrastructure Governance Platform</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight font-serif leading-tight">
            PRAGATI
          </h1>
          <p className="text-lg sm:text-xl font-medium text-slate-200">
            Predictive Risk Assessment for Government Asset Tracking & Intervention
          </p>

          <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
            Monitor projects. Detect risks early. Enable timely intervention. PRAGATI empowers government monitoring officers with explainable AI risk scoring, live progress telemetry, and prescriptive intervention workflows.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-3">
            {isAuthenticated ? (
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-2 rounded-md bg-[#E87500] hover:bg-[#c96500] text-slate-950 px-5 py-2.5 text-sm font-bold shadow-md transition-colors"
              >
                <span>Access Officer Dashboard</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            ) : (
              <Link
                to="/login"
                className="inline-flex items-center gap-2 rounded-md bg-[#E87500] hover:bg-[#c96500] text-slate-950 px-5 py-2.5 text-sm font-bold shadow-md transition-colors"
              >
                <span>Officer Login</span>
                <Lock className="h-4 w-4" />
              </Link>
            )}

            <Link
              to="/projects"
              className="inline-flex items-center gap-2 rounded-md bg-white/10 hover:bg-white/20 text-white border border-white/30 px-5 py-2.5 text-sm font-semibold transition-colors"
            >
              <span>Explore Projects Directory</span>
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* At a Glance Section */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#D9E1E8] pb-3">
          <div>
            <h2 className="text-xl font-bold text-[#003B6F]">At a Glance</h2>
            <p className="text-xs text-[#667085]">
              National infrastructure portfolio summary from live project telemetry.
            </p>
          </div>
          <span className="text-[11px] font-semibold text-[#138808] bg-emerald-50 px-2.5 py-1 rounded border border-emerald-200 w-fit">
            Demonstration Data Loaded
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="bg-white p-4 rounded-lg border border-[#D9E1E8] shadow-xs space-y-1">
            <span className="text-xs font-semibold text-[#667085]">Total Projects</span>
            <div className="text-2xl font-black text-[#003B6F]">
              {loading ? '...' : summary?.total_projects || 0}
            </div>
            <span className="text-[10px] text-slate-500">Under Tracking</span>
          </div>

          <div className="bg-white p-4 rounded-lg border border-[#D9E1E8] shadow-xs space-y-1">
            <span className="text-xs font-semibold text-[#667085]">Active Projects</span>
            <div className="text-2xl font-black text-[#005A9C]">
              {loading ? '...' : (summary?.total_projects || 0) - (summary?.high_risk_projects || 0)}
            </div>
            <span className="text-[10px] text-emerald-700 font-semibold">On-Going Monitoring</span>
          </div>

          <div className="bg-white p-4 rounded-lg border border-amber-200 shadow-xs space-y-1 bg-amber-50/40">
            <span className="text-xs font-semibold text-[#C98200]">Projects at Risk</span>
            <div className="text-2xl font-black text-[#C98200]">
              {loading ? '...' : summary?.risk_distribution?.medium || 0}
            </div>
            <span className="text-[10px] text-amber-800 font-semibold">Medium Risk Level</span>
          </div>

          <div className="bg-white p-4 rounded-lg border border-orange-200 shadow-xs space-y-1 bg-orange-50/40">
            <span className="text-xs font-semibold text-[#E87500]">Delayed Projects</span>
            <div className="text-2xl font-black text-[#E87500]">
              {loading ? '...' : summary?.delay_risk_projects || 0}
            </div>
            <span className="text-[10px] text-[#E87500] font-semibold">Schedule Slippage</span>
          </div>

          <div className="bg-white p-4 rounded-lg border border-rose-200 shadow-xs space-y-1 bg-rose-50/40">
            <span className="text-xs font-semibold text-[#C62828]">Critical Projects</span>
            <div className="text-2xl font-black text-[#C62828]">
              {loading ? '...' : summary?.high_risk_projects || 0}
            </div>
            <span className="text-[10px] text-[#C62828] font-bold">High/Critical Risk</span>
          </div>

          <div className="bg-white p-4 rounded-lg border border-[#D9E1E8] shadow-xs space-y-1">
            <span className="text-xs font-semibold text-[#667085]">Avg Risk Score</span>
            <div className="text-2xl font-black text-[#172033]">
              {loading ? '...' : `${(summary?.avg_risk_score || 0).toFixed(0)}%`}
            </div>
            <span className="text-[10px] text-slate-500">Model Telemetry</span>
          </div>
        </div>
      </section>

      {/* PRAGATI Services Grid */}
      <section className="space-y-4">
        <div className="border-b border-[#D9E1E8] pb-3">
          <h2 className="text-xl font-bold text-[#003B6F]">PRAGATI Services</h2>
          <p className="text-xs text-[#667085]">
            Integrated digital tools designed for infrastructure monitoring and early warning governance.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {services.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                className="bg-white p-5 rounded-lg border border-[#D9E1E8] hover:border-[#005A9C] shadow-xs hover:shadow-md transition-all flex flex-col justify-between group"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className={`p-2.5 rounded-md shadow-xs ${item.iconBg} transition-all`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="text-[10px] font-bold text-[#005A9C] bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                      {item.tag}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-[#172033]">{item.title}</h3>
                  <p className="text-xs text-[#667085] leading-relaxed">{item.desc}</p>
                </div>

                <div className="pt-4 mt-4 border-t border-slate-100">
                  <Link
                    to={item.link}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-[#003B6F] hover:text-[#005A9C] transition-colors"
                  >
                    <span>Access Service</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Announcements & Updates Section */}
      <section className="bg-white rounded-lg border border-[#D9E1E8] p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-[#D9E1E8] pb-3">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-[#E87500]" />
            <h2 className="text-lg font-bold text-[#003B6F]">Announcements & Updates</h2>
          </div>
          <span className="text-xs font-semibold text-slate-500">Government Notices</span>
        </div>

        <div className="divide-y divide-slate-100">
          {announcements.map((item, idx) => (
            <div key={idx} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-bold text-[#005A9C] bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                    {item.category}
                  </span>
                  <span className="text-slate-400">•</span>
                  <span className="text-slate-500 flex items-center gap-1 text-[11px]">
                    <Calendar className="h-3 w-3" />
                    {item.date}
                  </span>
                </div>
                <p className="text-xs font-semibold text-[#172033]">{item.title}</p>
              </div>

              <Link
                to="/reports"
                className="text-xs font-bold text-[#003B6F] hover:underline whitespace-nowrap"
              >
                Read Notice →
              </Link>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
