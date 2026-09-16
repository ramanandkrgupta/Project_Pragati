import React from 'react';
import { ShieldCheck, BrainCircuit, Activity, Database, CheckCircle2 } from 'lucide-react';

export const About: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto space-y-8 py-6 font-sans">
      <div className="border-b border-[#D9E1E8] pb-4">
        <div className="inline-flex items-center gap-1.5 rounded bg-blue-50 px-2.5 py-1 text-xs font-bold text-[#003B6F] border border-blue-200 mb-2">
          <ShieldCheck className="h-4 w-4" />
          <span>System Overview & Methodology</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#003B6F]">About PRAGATI Platform</h1>
        <p className="text-sm text-[#667085] mt-1">
          Predictive Risk Assessment for Government Asset Tracking & Intervention
        </p>
      </div>

      <div className="bg-white p-6 rounded-lg border border-[#D9E1E8] space-y-4 shadow-xs">
        <h2 className="text-lg font-bold text-[#172033]">Core Objectives</h2>
        <p className="text-xs text-slate-700 leading-relaxed">
          PRAGATI is designed to address early delay detection and financial overrun tracking across Indian infrastructure projects. Built with explainable machine learning models, PRAGATI converts complex project telemetry into actionable risk intelligence for monitoring officers.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-100">
          <div className="p-4 bg-[#F5F7FA] rounded border border-slate-200 space-y-2">
            <Activity className="h-5 w-5 text-[#003B6F]" />
            <h3 className="text-xs font-bold text-[#172033]">Continuous Telemetry</h3>
            <p className="text-[11px] text-slate-600">
              Tracks physical progress vs financial expenditure divergence every month.
            </p>
          </div>

          <div className="p-4 bg-[#F5F7FA] rounded border border-slate-200 space-y-2">
            <BrainCircuit className="h-5 w-5 text-[#E87500]" />
            <h3 className="text-xs font-bold text-[#172033]">Explainable AI Scoring</h3>
            <p className="text-[11px] text-slate-600">
              Calculates delay probability and highlights specific root cause risk drivers.
            </p>
          </div>

          <div className="p-4 bg-[#F5F7FA] rounded border border-slate-200 space-y-2">
            <Database className="h-5 w-5 text-[#138808]" />
            <h3 className="text-xs font-bold text-[#172033]">Data Ingestion & Quality</h3>
            <p className="text-[11px] text-slate-600">
              Multi-stage validation checking for missing values, duplicates, and progress gaps.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg border border-[#D9E1E8] space-y-4 shadow-xs">
        <h2 className="text-lg font-bold text-[#172033]">Governance Standards & Disclaimer</h2>
        <p className="text-xs text-slate-700 leading-relaxed">
          PRAGATI AI outputs serve as decision-support telemetry. All critical risk alerts, delay predictions, and recommended interventions require verification and official review by designated project monitoring officers.
        </p>

        <div className="space-y-2 text-xs text-slate-700">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-[#138808]" />
            <span>GIGW (Guidelines for Indian Government Websites) Compliant Layout</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-[#138808]" />
            <span>Role-Based Access Control (RBAC) for Officer vs Admin capabilities</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-[#138808]" />
            <span>Smart India Hackathon Prototype Implementation</span>
          </div>
        </div>
      </div>
    </div>
  );
};
