import React from 'react';
import { HelpCircle, BookOpen, MessageSquare, FileText, Phone } from 'lucide-react';

export const Help: React.FC = () => {
  const faqs = [
    {
      q: 'How is the Risk Score calculated for a project?',
      a: 'The PRAGATI Risk Engine evaluates cost overrun probability, schedule variance (revised completion date vs original completion date), physical vs financial progress gap, and historical milestone delays.',
    },
    {
      q: 'What should an officer do when a CRITICAL Early Warning alert is triggered?',
      a: 'The officer should navigate to the Early Warning Centre, inspect the evidence and key risk drivers, update the alert status to ACKNOWLEDGED, and initiate prescribed corrective action with the implementing department.',
    },
    {
      q: 'Can officers upload new project data files?',
      a: 'Data Ingestion is restricted to Administrator roles to maintain data integrity. Administrators can upload CSV/Excel files via the Data & Analytics section.',
    },
    {
      q: 'How does PRAGATI AI Copilot generate answers?',
      a: 'PRAGATI AI Copilot uses Google GenAI grounded on live project telemetry stored in the database. It provides structured assessments, evidence, and recommended interventions.',
    },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-8 py-6 font-sans">
      <div className="border-b border-[#D9E1E8] pb-4">
        <div className="inline-flex items-center gap-1.5 rounded bg-blue-50 px-2.5 py-1 text-xs font-bold text-[#003B6F] border border-blue-200 mb-2">
          <HelpCircle className="h-4 w-4" />
          <span>Help & User Documentation</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#003B6F]">
          PRAGATI Help Desk & Guidelines
        </h1>
        <p className="text-sm text-[#667085] mt-1">
          User guides, monitoring workflows, and platform FAQs for officers.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-5 rounded-lg border border-[#D9E1E8] space-y-2 shadow-xs">
          <BookOpen className="h-5 w-5 text-[#005A9C]" />
          <h2 className="text-base font-bold text-[#172033]">Monitoring Officer Guide</h2>
          <p className="text-xs text-[#667085] leading-relaxed">
            Step-by-step documentation on portfolio tracking, risk filtering, early warning status transitions, and generating monthly monitoring reports.
          </p>
        </div>

        <div className="bg-white p-5 rounded-lg border border-[#D9E1E8] space-y-2 shadow-xs">
          <MessageSquare className="h-5 w-5 text-[#E87500]" />
          <h2 className="text-base font-bold text-[#172033]">PRAGATI AI Copilot Guide</h2>
          <p className="text-xs text-[#667085] leading-relaxed">
            Learn how to use prompt chips to query specific project risk drivers, schedule slippage, and financial exposure across ministries.
          </p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg border border-[#D9E1E8] space-y-4 shadow-xs">
        <h2 className="text-lg font-bold text-[#172033] border-b border-slate-100 pb-2">
          Frequently Asked Questions (FAQs)
        </h2>

        <div className="space-y-4">
          {faqs.map((item, idx) => (
            <div key={idx} className="space-y-1">
              <h3 className="text-xs font-bold text-[#003B6F] flex items-start gap-2">
                <span className="text-[#E87500]">Q{idx + 1}.</span>
                <span>{item.q}</span>
              </h3>
              <p className="text-xs text-slate-600 pl-6 leading-relaxed">{item.a}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
