import React, { useEffect, useState } from 'react';
import { 
  Building2, 
  Coins, 
  FileSpreadsheet, 
  TrendingUp, 
  Calendar,
  ChevronRight,
  Activity
} from 'lucide-react';
import { fetchAgencyWiseAnalytics, fetchSectorWiseAnalytics } from '../services/api';
import { AggregatedMetrics } from '../types';

export const MinistrySectorOverview: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'ministry' | 'sector'>('ministry');
  
  const [agencyData, setAgencyData] = useState<AggregatedMetrics[]>([]);
  const [sectorData, setSectorData] = useState<AggregatedMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [selectedItem, setSelectedItem] = useState<AggregatedMetrics | null>(null);

  useEffect(() => {
    Promise.all([
      fetchAgencyWiseAnalytics(),
      fetchSectorWiseAnalytics()
    ]).then(([agencies, sectors]) => {
      setAgencyData(agencies);
      setSectorData(sectors);
      setLoading(false);
      if (agencies.length > 0) {
        setSelectedItem(agencies[0]);
      }
    }).catch(err => {
      console.error(err);
      setError(err.message || 'Unknown error');
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (activeTab === 'ministry' && agencyData.length > 0) {
      setSelectedItem(agencyData[0]);
    } else if (activeTab === 'sector' && sectorData.length > 0) {
      setSelectedItem(sectorData[0]);
    }
  }, [activeTab, agencyData, sectorData]);

  const displayList = activeTab === 'ministry' ? agencyData : sectorData;

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2
    }).format(val);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-8">
      
      {/* Top Toggle Bar */}
      <div className="flex justify-center border-b border-slate-100 p-4">
        <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1">
          <button
            onClick={() => setActiveTab('ministry')}
            className={`px-6 py-2 rounded-md text-sm font-semibold transition-colors ${
              activeTab === 'ministry' 
                ? 'bg-[#E3A833] text-white shadow-sm' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Ministry-Wise
          </button>
          <button
            onClick={() => setActiveTab('sector')}
            className={`px-6 py-2 rounded-md text-sm font-semibold transition-colors ${
              activeTab === 'sector' 
                ? 'bg-[#E3A833] text-white shadow-sm' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Sector-Wise
          </button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row h-[400px]">
        
        {/* Left Sidebar List */}
        <div className="w-full md:w-1/3 border-r border-slate-100 flex flex-col">
          <div className="overflow-y-auto flex-1 p-2 custom-scrollbar">
            {loading ? (
              <div className="p-4 text-center text-slate-500">Loading...</div>
            ) : error ? (
              <div className="p-4 text-center text-red-500 text-sm">{error}</div>
            ) : displayList.length === 0 ? (
              <div className="p-4 text-center text-slate-500">No data found</div>
            ) : (
              displayList.map((item, idx) => {
                const isSelected = selectedItem?.name === item.name;
                return (
                  <button
                    key={idx}
                    onClick={() => setSelectedItem(item)}
                    className={`w-full text-left px-4 py-3 mb-1 rounded-lg flex items-center justify-between transition-colors ${
                      isSelected
                        ? 'bg-[#003B6F] text-white'
                        : 'bg-white hover:bg-slate-50 text-slate-700 shadow-sm border border-slate-100'
                    }`}
                  >
                    <span className="font-semibold text-sm truncate pr-2">{item.name}</span>
                    {isSelected && <ChevronRight className="w-4 h-4 flex-shrink-0" />}
                  </button>
                )
              })
            )}
          </div>
        </div>

        {/* Right Content Area */}
        <div className="w-full md:w-2/3 p-6 bg-slate-50/50 flex flex-col justify-center">
          {selectedItem ? (
            <div className="bg-white rounded-xl border border-[#003B6F]/10 shadow-lg overflow-hidden">
              <div className="bg-[#003B6F] px-6 py-4 text-center">
                <h3 className="text-xl font-bold text-white">{selectedItem.name} <span className="text-white/70 text-sm font-normal">(as of July, 2026)</span></h3>
              </div>
              
              <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
                
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
                    <FileSpreadsheet className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Project Count (No.)</p>
                    <p className="text-2xl font-bold text-slate-900">{selectedItem.projectCount}</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg">
                    <Coins className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Original Cost (in Cr.)</p>
                    <p className="text-2xl font-bold text-slate-900">{formatCurrency(selectedItem.originalCost)}</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="p-3 bg-rose-50 text-rose-600 rounded-lg">
                    <TrendingUp className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Latest Revised Cost (in Cr.)</p>
                    <p className="text-2xl font-bold text-slate-900">{formatCurrency(selectedItem.revisedCost)}</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
                    <Activity className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Expenditure (Cumm.) (in Cr.)</p>
                    <p className="text-2xl font-bold text-slate-900">{formatCurrency(selectedItem.expenditure)}</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="p-3 bg-amber-50 text-amber-600 rounded-lg">
                    <Calendar className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Completed During month (No.)</p>
                    <p className="text-2xl font-bold text-slate-900">{selectedItem.completedDuringMonth}</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="p-3 bg-sky-50 text-sky-600 rounded-lg">
                    <Building2 className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Newly Added (No.)</p>
                    <p className="text-2xl font-bold text-slate-900">{selectedItem.newlyAdded}</p>
                  </div>
                </div>

              </div>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center text-slate-400">
              Select an item to view details
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
