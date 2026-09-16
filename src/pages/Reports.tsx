import React, { useState } from 'react';
import {
  FileText,
  Download,
  Printer,
  Filter,
  Search,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Building2,
} from 'lucide-react';
import { StatusBadge } from '../components/StatusBadge';

export const Reports: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchVal, setSearchVal] = useState<string>('');

  const reportItems = [
    {
      id: 'REP-2026-001',
      title: 'National Infrastructure Progress & Schedule Variance Summary',
      category: 'Project Performance',
      date: '01 Sep 2026',
      period: 'August 2026',
      size: '2.4 MB',
      status: 'PUBLISHED',
      desc: 'Comprehensive evaluation of 42 tracked infrastructure projects across Ministry of Road Transport, Railways, and Power.',
    },
    {
      id: 'REP-2026-002',
      title: 'High Risk Projects & Cost Escalation Early Warning Brief',
      category: 'Risk Reports',
      date: '28 Aug 2026',
      period: 'Q2 2026',
      size: '1.8 MB',
      status: 'PUBLISHED',
      desc: 'Explainable AI risk scoring report highlighting 8 projects exceeding 25% cost overrun thresholds.',
    },
    {
      id: 'REP-2026-003',
      title: 'Critical Early Warnings & Recommended Officer Interventions Matrix',
      category: 'Early Warning Reports',
      date: '20 Aug 2026',
      period: 'August 2026',
      size: '3.1 MB',
      status: 'PUBLISHED',
      desc: 'Action matrix outlining progress divergence warnings, milestone delays, and assigned department owners.',
    },
    {
      id: 'REP-2026-004',
      title: 'Ministry of Road Transport & Highways — Quarterly Progress Bulletin',
      category: 'Department Reports',
      date: '15 Aug 2026',
      period: 'Q2 2026',
      size: '4.2 MB',
      status: 'PUBLISHED',
      desc: 'Detailed physical vs financial expenditure analysis for highway corridors and bridge projects.',
    },
    {
      id: 'REP-2026-005',
      title: 'State-Wise Infrastructure Implementation & Milestone Performance',
      category: 'State Reports',
      date: '10 Aug 2026',
      period: 'Jul-Aug 2026',
      size: '2.9 MB',
      status: 'PUBLISHED',
      desc: 'Regional breakdown of infrastructure implementation across Maharashtra, Gujarat, Uttar Pradesh, and Tamil Nadu.',
    },
    {
      id: 'REP-2026-006',
      title: 'Monthly Project Governance & Financial Utilisation Bulletin',
      category: 'Monthly Monitoring',
      date: '01 Aug 2026',
      period: 'July 2026',
      size: '1.5 MB',
      status: 'PUBLISHED',
      desc: 'Monthly expenditure tracking against approved budgets across all active monitoring sectors.',
    },
  ];

  const categories = [
    'ALL',
    'Project Performance',
    'Risk Reports',
    'Early Warning Reports',
    'Department Reports',
    'State Reports',
    'Monthly Monitoring',
  ];

  const filtered = reportItems.filter((item) => {
    if (selectedCategory !== 'ALL' && item.category !== selectedCategory) return false;
    if (searchVal.trim()) {
      const q = searchVal.toLowerCase();
      return (
        item.title.toLowerCase().includes(q) ||
        item.id.toLowerCase().includes(q) ||
        item.desc.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handlePrintReport = (report: typeof reportItems[0]) => {
    window.print();
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#D9E1E8] pb-4">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded bg-blue-50 px-2.5 py-1 text-xs font-bold text-[#003B6F] border border-blue-200 mb-2">
            <FileText className="h-4 w-4" />
            <span>Official Publications</span>
          </div>
          <h1 className="text-2xl font-extrabold text-[#003B6F]">Reports & Publications</h1>
          <p className="text-xs text-[#667085]">
            Access monthly monitoring bulletins, risk assessment summaries, and state-wise performance publications.
          </p>
        </div>

        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-1.5 rounded-md bg-white text-[#003B6F] border border-[#D9E1E8] hover:bg-[#F5F7FA] px-3.5 py-2 text-xs font-bold shadow-xs transition-colors w-fit"
        >
          <Printer className="h-4 w-4" />
          <span>Print Document Index</span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-lg border border-[#D9E1E8] shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search reports by title, ID, or keyword..."
            value={searchVal}
            onChange={(e) => setSearchVal(e.target.value)}
            className="w-full rounded-md border border-[#D9E1E8] bg-[#F5F7FA] pl-8 pr-3 py-1.5 text-xs text-[#172033] focus:border-[#005A9C] focus:bg-white focus:outline-hidden"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto scrollbar-none pb-1 md:pb-0">
          <Filter className="h-4 w-4 text-slate-400 shrink-0" />
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-2.5 py-1 rounded text-xs font-semibold whitespace-nowrap transition-colors ${
                selectedCategory === cat
                  ? 'bg-[#003B6F] text-white'
                  : 'bg-[#F5F7FA] text-[#667085] hover:bg-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Document List */}
      <div className="space-y-3">
        {filtered.map((item) => (
          <div
            key={item.id}
            className="bg-white p-5 rounded-lg border border-[#D9E1E8] hover:border-[#005A9C] shadow-xs transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
          >
            <div className="space-y-1.5 max-w-3xl">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="font-mono font-bold text-slate-500">{item.id}</span>
                <span className="text-slate-300">•</span>
                <span className="font-bold text-[#005A9C] bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                  {item.category}
                </span>
                <span className="text-slate-300">•</span>
                <span className="text-slate-500 flex items-center gap-1 text-[11px]">
                  <Calendar className="h-3 w-3" />
                  {item.date} ({item.period})
                </span>
              </div>

              <h2 className="text-base font-bold text-[#172033]">{item.title}</h2>
              <p className="text-xs text-[#667085] leading-relaxed">{item.desc}</p>
            </div>

            <div className="flex items-center gap-3 shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100">
              <span className="text-[11px] font-mono text-slate-500 hidden sm:inline">
                {item.size}
              </span>

              <button
                onClick={() => handlePrintReport(item)}
                className="inline-flex items-center gap-1.5 rounded bg-[#003B6F] hover:bg-[#005A9C] text-white px-3 py-1.5 text-xs font-bold transition-colors shadow-xs"
              >
                <Download className="h-3.5 w-3.5" />
                <span>View & Print</span>
              </button>
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="bg-white p-12 text-center rounded-lg border border-[#D9E1E8] space-y-2">
            <FileText className="h-8 w-8 text-slate-400 mx-auto" />
            <p className="text-sm font-bold text-[#172033]">No reports match your current filter.</p>
            <p className="text-xs text-slate-500">Try adjusting your search criteria or category filter.</p>
          </div>
        )}
      </div>
    </div>
  );
};
