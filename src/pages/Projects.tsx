import React, { useEffect, useState, useMemo, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Search,
  Filter,
  ArrowUpDown,
  ChevronRight,
  ChevronDown,
  FolderGit2,
  RefreshCw,
  Plus,
  TrendingUp,
  Sparkles,
  FolderPlus,
  X,
  UserCheck,
  Building2,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Download,
  FileText,
  MapPin,
  Layers,
  Activity,
  RotateCcw,
  Check,
} from 'lucide-react';
import { fetchProjects, fetchPaginatedProjects, createProject, fetchUsers, updateProject, fetchSectors, fetchStates, fetchStatuses, fetchRisks } from '../services/api';
import { Project, RiskLevel, UserProfile } from '../types';
import { RiskBadge } from '../components/RiskBadge';
import { StatusBadge } from '../components/StatusBadge';
import { useAuth } from '../context/AuthContext';

export const Projects: React.FC = () => {
  const { isAdmin } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [rawProjects, setRawProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Modal State for Project Creation
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [officers, setOfficers] = useState<UserProfile[]>([]);
  const [modalSubmitting, setModalSubmitting] = useState<boolean>(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [modalSuccess, setModalSuccess] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    project_name: '',
    project_code: '',
    sector: 'Highways',
    ministry: '',
    implementing_agency: '',
    state: '',
    original_cost: '',
    revised_cost: '',
    expenditure: '',
    physical_progress: '',
    original_completion_date: '',
    revised_completion_date: '',
    assigned_to: '',
  });

  // Filter States initialized from URL search params
  const initialSearch = searchParams.get('search') || '';
  const initialSectorParam = searchParams.get('sector');
  const initialSectors = initialSectorParam && initialSectorParam !== 'ALL'
    ? initialSectorParam.split(',').filter(Boolean)
    : [];

  const initialStateParam = searchParams.get('state');
  const initialStates = initialStateParam && initialStateParam !== 'ALL'
    ? initialStateParam.split(',').filter(Boolean)
    : [];

  const initialRiskParam = searchParams.get('risk_level');
  const initialRisks = initialRiskParam && initialRiskParam !== 'ALL'
    ? initialRiskParam.split(',').filter(Boolean)
    : [];

  const initialStatusParam = searchParams.get('status');
  const initialStatuses = initialStatusParam && initialStatusParam !== 'ALL'
    ? initialStatusParam.split(',').filter(Boolean)
    : [];

  const initialSort = searchParams.get('sort_by') || 'risk_desc';

  const [searchTerm, setSearchTerm] = useState<string>(initialSearch);
  const [selectedStates, setSelectedStates] = useState<string[]>(initialStates);
  const [selectedSectors, setSelectedSectors] = useState<string[]>(initialSectors);
  const [selectedRisks, setSelectedRisks] = useState<string[]>(initialRisks);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>(initialStatuses);
  const [sortBy, setSortBy] = useState<string>(initialSort);

  // Dropdown Popover States
  const [isStateOpen, setIsStateOpen] = useState<boolean>(false);
  const [isSectorOpen, setIsSectorOpen] = useState<boolean>(false);
  const [isStatusOpen, setIsStatusOpen] = useState<boolean>(false);
  const [stateSearchTerm, setStateSearchTerm] = useState<string>('');
  const [sectorSearchTerm, setSectorSearchTerm] = useState<string>('');

  const filterContainerRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (filterContainerRef.current && !filterContainerRef.current.contains(e.target as Node)) {
        setIsStateOpen(false);
        setIsSectorOpen(false);
        setIsStatusOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [availableSectors, setAvailableSectors] = useState<FilterOption[]>([]);
  const [availableStates, setAvailableStates] = useState<FilterOption[]>([]);
  const [availableStatuses, setAvailableStatuses] = useState<FilterOption[]>([]);
  const [availableRisks, setAvailableRisks] = useState<FilterOption[]>([]);

  const loadFilterOptions = async () => {
    try {
      const [sec, st, statuses, risks] = await Promise.all([fetchSectors(), fetchStates(), fetchStatuses(), fetchRisks()]);
      setAvailableSectors(sec);
      setAvailableStates(st);
      setAvailableStatuses(statuses);
      setAvailableRisks(risks);
    } catch (e) {
      console.error("Failed to load options", e);
    }
  };

  const loadProjects = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchPaginatedProjects({
        search: searchTerm,
        state: selectedStates.join(','),
        sector: selectedSectors.join(','),
        risk_level: selectedRisks.join(','),
        status: selectedStatuses.join(','),
        sort_by: sortBy,
        page: currentPage,
        limit: 50
      });
      setRawProjects(data.projects);
      setTotalPages(data.totalPages);
      setTotalCount(data.totalCount);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch projects');
    } finally {
      setLoading(false);
    }
  };

  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const loadOfficers = async () => {
    try {
      const allUsers = await fetchUsers();
      setOfficers(allUsers.filter((u) => u.role === 'officer'));
    } catch {
      // Fallback
    }
  };

  useEffect(() => {
    loadFilterOptions();
  }, []);

  // Reload projects whenever filters or page changes
  useEffect(() => {
    loadProjects();
  }, [searchTerm, selectedStates, selectedSectors, selectedRisks, selectedStatuses, sortBy, currentPage]);

  useEffect(() => {
    if (isAdmin) {
      loadOfficers();
    }
  }, [isAdmin]);

  // Sync active filters to URL search parameters
  useEffect(() => {
    const newParams: Record<string, string> = {};
    if (searchTerm.trim()) newParams.search = searchTerm.trim();
    if (selectedStates.length > 0) newParams.state = selectedStates.join(',');
    if (selectedSectors.length > 0) newParams.sector = selectedSectors.join(',');
    if (selectedRisks.length > 0) newParams.risk_level = selectedRisks.join(',');
    if (selectedStatuses.length > 0) newParams.status = selectedStatuses.join(',');
    if (sortBy !== 'risk_desc') newParams.sort_by = sortBy;
    setSearchParams(newParams, { replace: true });
  }, [searchTerm, selectedStates, selectedSectors, selectedRisks, selectedStatuses, sortBy]);
  // Use dynamically loaded filter options with counts from backend
  const availableStatesWithCount = availableStates;
  const availableSectorsWithCount = availableSectors;
  const availableStatusesWithCount = availableStatuses;
  
  // Also optionally expose risks if the UI uses them later
  const availableRisksWithCount = availableRisks;

  // Filtered projects are just the raw projects now, since the server does the filtering!
  const filteredProjects = rawProjects;

  // Toggle Handlers
  const toggleState = (st: string) => {
    setSelectedStates((prev) =>
      prev.includes(st) ? prev.filter((s) => s !== st) : [...prev, st]
    );
  };

  const toggleSector = (sec: string) => {
    setSelectedSectors((prev) =>
      prev.includes(sec) ? prev.filter((s) => s !== sec) : [...prev, sec]
    );
  };

  const toggleRisk = (risk: string) => {
    setSelectedRisks((prev) =>
      prev.includes(risk) ? prev.filter((r) => r !== risk) : [...prev, risk]
    );
  };

  const toggleStatus = (st: string) => {
    setSelectedStatuses((prev) =>
      prev.includes(st) ? prev.filter((s) => s !== st) : [...prev, st]
    );
  };

  const clearAllFilters = () => {
    setSearchTerm('');
    setSelectedStates([]);
    setSelectedSectors([]);
    setSelectedRisks([]);
    setSelectedStatuses([]);
    setSortBy('risk_desc');
  };

  const activeFilterCount =
    (searchTerm.trim() ? 1 : 0) +
    selectedStates.length +
    selectedSectors.length +
    selectedRisks.length +
    selectedStatuses.length;

  const handleReassignOfficer = async (projectId: string, officerId: string) => {
    try {
      setUpdatingId(projectId);
      const targetVal = officerId.trim() ? officerId.trim() : null;
      await updateProject(projectId, { assigned_to: targetVal });
      setRawProjects((prev) =>
        prev.map((p) => (p.id === projectId ? { ...p, assigned_to: targetVal } : p))
      );
    } catch (err: any) {
      alert(err.message || 'Failed to reassign officer');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleExportCSV = () => {
    if (filteredProjects.length === 0) return;
    const headers = ['Project Code', 'Project Name', 'Sector', 'Ministry', 'State', 'Status', 'Risk Level', 'Physical Progress %', 'Expenditure (Cr)'];
    const rows = filteredProjects.map((p) => [
      p.project_code,
      `"${p.project_name.replace(/"/g, '""')}"`,
      p.sector,
      p.ministry,
      p.state,
      p.project_status,
      p.prediction?.risk_level || 'LOW',
      p.latest_monitoring?.physical_progress || 0,
      p.latest_monitoring?.expenditure || 0,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `PRAGATI_Project_Monitoring_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleOpenModal = () => {
    setIsModalOpen(true);
    setModalError(null);
    setModalSuccess(null);
    loadOfficers();
  };

  const handleModalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    setModalSuccess(null);

    if (!formData.project_name.trim() || !formData.project_code.trim()) {
      setModalError('Project name and project code are required.');
      return;
    }

    setModalSubmitting(true);
    try {
      await createProject({
        project_name: formData.project_name.trim(),
        project_code: formData.project_code.trim(),
        sector: formData.sector,
        ministry: formData.ministry.trim() || 'Ministry of Infrastructure',
        implementing_agency: formData.implementing_agency.trim() || 'Nodal Agency',
        state: formData.state.trim() || 'Multi-State',
        original_cost: Number(formData.original_cost) || 100,
        revised_cost: Number(formData.revised_cost) || Number(formData.original_cost) || 100,
        expenditure: Number(formData.expenditure) || 0,
        physical_progress: Number(formData.physical_progress) || 0,
        original_completion_date: formData.original_completion_date || '2026-12-31',
        revised_completion_date: formData.revised_completion_date || '2027-06-30',
        assigned_to: formData.assigned_to || null,
      });

      setModalSuccess('Project successfully registered!');
      setTimeout(() => {
        setIsModalOpen(false);
        loadProjects();
      }, 1200);
    } catch (err: any) {
      setModalError(err.message || 'Failed to create project');
    } finally {
      setModalSubmitting(false);
    }
  };

  return (
    <div id="projects-page" className="space-y-6 pb-12 font-sans">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#D9E1E8] pb-4">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded bg-blue-50 px-2.5 py-1 text-xs font-bold text-[#003B6F] border border-blue-200 mb-1">
            <FolderGit2 className="h-4 w-4" />
            <span>National Infrastructure Inventory</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#003B6F] font-serif">
            Project Monitoring Directory
          </h1>
          <p className="text-xs text-[#667085]">
            Track implementation progress, financial performance, schedule health and emerging risks.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 rounded bg-white text-[#003B6F] border border-[#D9E1E8] hover:bg-[#F5F7FA] px-3.5 py-2 text-xs font-bold shadow-xs transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export CSV</span>
          </button>

          {isAdmin && (
            <button
              onClick={handleOpenModal}
              className="inline-flex items-center gap-1.5 rounded bg-[#003B6F] hover:bg-[#005A9C] px-3.5 py-2 text-xs font-bold text-white shadow-xs transition-colors"
            >
              <FolderPlus className="h-3.5 w-3.5" />
              <span>Add Project</span>
            </button>
          )}

          <button
            onClick={loadProjects}
            className="p-2 rounded bg-white border border-[#D9E1E8] text-slate-600 hover:bg-[#F5F7FA]"
            title="Refresh"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Multi-Criteria Filter and Search Panel */}
      <div ref={filterContainerRef} className="bg-white p-4 sm:p-5 rounded-lg border border-[#D9E1E8] shadow-xs space-y-3 relative">
        {/* Search Bar */}
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by project ID, name, sector, ministry, state..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded border border-[#D9E1E8] bg-[#F5F7FA] pl-8 pr-8 py-2 text-xs text-[#172033] focus:border-[#005A9C] focus:bg-white focus:outline-hidden"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                title="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Multi-Select Toolbar Controls */}
        <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-1 text-slate-600 font-bold mr-1">
            <Filter className="h-3.5 w-3.5 text-slate-400" />
            <span>Filters:</span>
          </div>

          {/* 1. STATE MULTI-SELECT DROPDOWN */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setIsStateOpen(!isStateOpen);
                setIsSectorOpen(false);
                setIsStatusOpen(false);
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded border text-xs font-semibold transition-colors ${
                selectedStates.length > 0
                  ? 'bg-blue-50 text-[#003B6F] border-blue-300 font-bold'
                  : 'bg-white text-slate-700 border-[#D9E1E8] hover:bg-slate-50'
              }`}
            >
              <MapPin className="h-3.5 w-3.5 text-[#005A9C]" />
              <span>
                State: {selectedStates.length === 0 ? 'All' : `${selectedStates.length} selected`}
              </span>
              <ChevronDown className="h-3 w-3 text-slate-400" />
            </button>

            {isStateOpen && (
              <div className="absolute left-0 top-full mt-1.5 w-64 bg-white rounded-lg border border-[#D9E1E8] shadow-lg z-30 p-2.5 space-y-2">
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                  <span className="font-bold text-[#003B6F]">Select States</span>
                  {selectedStates.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedStates([])}
                      className="text-[11px] text-red-600 hover:underline"
                    >
                      Clear
                    </button>
                  )}
                </div>

                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Find state..."
                    value={stateSearchTerm}
                    onChange={(e) => setStateSearchTerm(e.target.value)}
                    className="w-full pl-7 pr-2 py-1 text-[11px] rounded border border-slate-200 bg-slate-50 focus:bg-white focus:outline-hidden"
                  />
                </div>

                <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
                  {availableStatesWithCount
                    .filter((s) => s.name.toLowerCase().includes(stateSearchTerm.toLowerCase()))
                    .map((item) => {
                      const isSelected = selectedStates.includes(item.name);
                      return (
                        <label
                          key={item.name}
                          onClick={() => toggleState(item.name)}
                          className="flex items-center justify-between p-1.5 rounded hover:bg-slate-50 cursor-pointer text-xs select-none"
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}}
                              className="rounded border-slate-300 text-[#003B6F] focus:ring-0"
                            />
                            <span className={isSelected ? 'font-bold text-[#003B6F]' : 'text-slate-700'}>
                              {item.name}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                            {item.count}
                          </span>
                        </label>
                      );
                    })}
                </div>
              </div>
            )}
          </div>

          {/* 2. SECTOR / PROJECT TYPE MULTI-SELECT DROPDOWN */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setIsSectorOpen(!isSectorOpen);
                setIsStateOpen(false);
                setIsStatusOpen(false);
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded border text-xs font-semibold transition-colors ${
                selectedSectors.length > 0
                  ? 'bg-blue-50 text-[#003B6F] border-blue-300 font-bold'
                  : 'bg-white text-slate-700 border-[#D9E1E8] hover:bg-slate-50'
              }`}
            >
              <Layers className="h-3.5 w-3.5 text-[#005A9C]" />
              <span>
                Sector: {selectedSectors.length === 0 ? 'All' : `${selectedSectors.length} selected`}
              </span>
              <ChevronDown className="h-3 w-3 text-slate-400" />
            </button>

            {isSectorOpen && (
              <div className="absolute left-0 top-full mt-1.5 w-64 bg-white rounded-lg border border-[#D9E1E8] shadow-lg z-30 p-2.5 space-y-2">
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                  <span className="font-bold text-[#003B6F]">Select Project Types</span>
                  {selectedSectors.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedSectors([])}
                      className="text-[11px] text-red-600 hover:underline"
                    >
                      Clear
                    </button>
                  )}
                </div>

                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Find sector..."
                    value={sectorSearchTerm}
                    onChange={(e) => setSectorSearchTerm(e.target.value)}
                    className="w-full pl-7 pr-2 py-1 text-[11px] rounded border border-slate-200 bg-slate-50 focus:bg-white focus:outline-hidden"
                  />
                </div>

                <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
                  {availableSectorsWithCount
                    .filter((s) => s.name.toLowerCase().includes(sectorSearchTerm.toLowerCase()))
                    .map((item) => {
                      const isSelected = selectedSectors.includes(item.name);
                      return (
                        <label
                          key={item.name}
                          onClick={() => toggleSector(item.name)}
                          className="flex items-center justify-between p-1.5 rounded hover:bg-slate-50 cursor-pointer text-xs select-none"
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}}
                              className="rounded border-slate-300 text-[#003B6F] focus:ring-0"
                            />
                            <span className={isSelected ? 'font-bold text-[#003B6F]' : 'text-slate-700'}>
                              {item.name}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                            {item.count}
                          </span>
                        </label>
                      );
                    })}
                </div>
              </div>
            )}
          </div>

          {/* 3. STATUS MULTI-SELECT DROPDOWN */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setIsStatusOpen(!isStatusOpen);
                setIsStateOpen(false);
                setIsSectorOpen(false);
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded border text-xs font-semibold transition-colors ${
                selectedStatuses.length > 0
                  ? 'bg-blue-50 text-[#003B6F] border-blue-300 font-bold'
                  : 'bg-white text-slate-700 border-[#D9E1E8] hover:bg-slate-50'
              }`}
            >
              <Activity className="h-3.5 w-3.5 text-[#005A9C]" />
              <span>
                Status: {selectedStatuses.length === 0 ? 'All' : `${selectedStatuses.length} selected`}
              </span>
              <ChevronDown className="h-3 w-3 text-slate-400" />
            </button>

            {isStatusOpen && (
              <div className="absolute left-0 top-full mt-1.5 w-56 bg-white rounded-lg border border-[#D9E1E8] shadow-lg z-30 p-2.5 space-y-2">
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                  <span className="font-bold text-[#003B6F]">Select Status</span>
                  {selectedStatuses.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedStatuses([])}
                      className="text-[11px] text-red-600 hover:underline"
                    >
                      Clear
                    </button>
                  )}
                </div>

                <div className="space-y-1">
                  {availableStatusesWithCount.map((item) => {
                    const isSelected = selectedStatuses.includes(item.name);
                    return (
                      <label
                        key={item.name}
                        onClick={() => toggleStatus(item.name)}
                        className="flex items-center justify-between p-1.5 rounded hover:bg-slate-50 cursor-pointer text-xs select-none"
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            className="rounded border-slate-300 text-[#003B6F] focus:ring-0"
                          />
                          <span className={isSelected ? 'font-bold text-[#003B6F]' : 'text-slate-700'}>
                            {item.name}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                          {item.count}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* 4. RISK LEVEL MULTI-SELECT TOGGLES */}
          <div className="flex items-center gap-1.5 pl-1 border-l border-slate-200">
            <span className="text-slate-500 font-medium">Risk:</span>
            {[
              { label: 'HIGH', bgActive: 'bg-red-600 text-white border-red-600', text: 'High' },
              { label: 'MEDIUM', bgActive: 'bg-amber-600 text-white border-amber-600', text: 'Medium' },
              { label: 'LOW', bgActive: 'bg-emerald-600 text-white border-emerald-600', text: 'Low' },
            ].map((riskItem) => {
              const isSelected = selectedRisks.includes(riskItem.label);
              const countMatch = availableRisksWithCount.find(r => r.name.toUpperCase() === riskItem.label);
              const displayCount = countMatch ? countMatch.count : 0;
              return (
                <button
                  key={riskItem.label}
                  type="button"
                  onClick={() => toggleRisk(riskItem.label)}
                  className={`px-2.5 py-1 rounded text-[11px] font-bold border transition-colors ${
                    isSelected
                      ? riskItem.bgActive
                      : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  {riskItem.text} ({displayCount})
                </button>
              );
            })}
          </div>

          {/* 5. SORT BY SELECT */}
          <div className="flex items-center gap-1 ml-auto">
            <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" />
            <span className="text-slate-500 font-medium">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="rounded border border-[#D9E1E8] bg-white px-2 py-1 text-xs text-slate-800"
            >
              <option value="risk_desc">Risk Score: High to Low</option>
              <option value="risk_asc">Risk Score: Low to High</option>
              <option value="cost_desc">Cost: Highest First</option>
              <option value="progress_asc">Progress: Lowest First</option>
              <option value="progress_desc">Progress: Highest First</option>
              <option value="name_asc">Project Name: A to Z</option>
            </select>
          </div>
        </div>

        {/* ACTIVE FILTERS CHIPS & LIVE STATUS BAR */}
        {activeFilterCount > 0 && (
          <div className="flex flex-wrap items-center gap-2 pt-2.5 border-t border-slate-100 text-xs">
            <span className="text-slate-500 font-medium">Active Filters ({activeFilterCount}):</span>

            {searchTerm && (
              <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[11px] border border-slate-200">
                <span>Keyword: "{searchTerm}"</span>
                <button type="button" onClick={() => setSearchTerm('')} className="hover:text-red-600">
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}

            {selectedStates.map((st) => (
              <span
                key={`chip-st-${st}`}
                className="inline-flex items-center gap-1 bg-blue-50 text-[#003B6F] px-2 py-0.5 rounded text-[11px] font-semibold border border-blue-200"
              >
                <span>State: {st}</span>
                <button type="button" onClick={() => toggleState(st)} className="hover:text-red-600">
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}

            {selectedSectors.map((sec) => (
              <span
                key={`chip-sec-${sec}`}
                className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-800 px-2 py-0.5 rounded text-[11px] font-semibold border border-indigo-200"
              >
                <span>Sector: {sec}</span>
                <button type="button" onClick={() => toggleSector(sec)} className="hover:text-red-600">
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}

            {selectedStatuses.map((st) => (
              <span
                key={`chip-status-${st}`}
                className="inline-flex items-center gap-1 bg-sky-50 text-sky-800 px-2 py-0.5 rounded text-[11px] font-semibold border border-sky-200"
              >
                <span>Status: {st}</span>
                <button type="button" onClick={() => toggleStatus(st)} className="hover:text-red-600">
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}

            {selectedRisks.map((r) => (
              <span
                key={`chip-risk-${r}`}
                className="inline-flex items-center gap-1 bg-rose-50 text-rose-800 px-2 py-0.5 rounded text-[11px] font-semibold border border-rose-200"
              >
                <span>Risk: {r}</span>
                <button type="button" onClick={() => toggleRisk(r)} className="hover:text-red-600">
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}

            <button
              type="button"
              onClick={clearAllFilters}
              className="inline-flex items-center gap-1 text-[11px] font-bold text-red-600 hover:text-red-700 hover:underline ml-auto"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Reset All Filters</span>
            </button>
          </div>
        )}

        {/* Real-time Project Counter Indicator */}
        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
          <div>
            Showing <strong className="text-[#003B6F]">{filteredProjects.length}</strong> of{' '}
            <strong>{rawProjects.length}</strong> total projects
            {rawProjects.length > filteredProjects.length && (
              <span className="text-amber-700 ml-1">
                ({rawProjects.length - filteredProjects.length} filtered out)
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Projects Enterprise Data Table */}
      <div className="bg-white rounded-lg border border-[#D9E1E8] shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-slate-500 text-xs">
            <RefreshCw className="h-6 w-6 animate-spin text-[#003B6F] mx-auto mb-2" />
            <span>Loading infrastructure telemetry...</span>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-[#C62828] text-xs">
            <p>{error}</p>
            <button onClick={loadProjects} className="mt-2 font-bold underline">
              Retry Connection
            </button>
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs space-y-2">
            <p className="font-bold text-[#172033] text-sm">No projects match your active filter selection.</p>
            <p className="text-slate-500">
              Try deselecting some filters or search keywords to broaden your results.
            </p>
            {activeFilterCount > 0 && (
              <button
                type="button"
                onClick={clearAllFilters}
                className="mt-2 inline-flex items-center gap-1.5 rounded bg-[#003B6F] px-3.5 py-1.5 text-xs font-bold text-white hover:bg-[#005A9C] transition-colors"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Clear All Filters</span>
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#003B6F] text-white font-bold">
                  <th className="py-2.5 px-3 border-r border-[#005A9C]">Project ID</th>
                  <th className="py-2.5 px-3 border-r border-[#005A9C]">Project Name</th>
                  <th className="py-2.5 px-3 border-r border-[#005A9C]">Department / State</th>
                  <th className="py-2.5 px-3 border-r border-[#005A9C]">Physical Progress</th>
                  <th className="py-2.5 px-3 border-r border-[#005A9C]">Financial Progress</th>
                  <th className="py-2.5 px-3 border-r border-[#005A9C]">Schedule</th>
                  <th className="py-2.5 px-3 border-r border-[#005A9C]">Risk Score</th>
                  <th className="py-2.5 px-3 border-r border-[#005A9C]">Assigned Officer</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D9E1E8]">
                {filteredProjects.map((p) => {
                  const mon = p.latest_monitoring;
                  const pred = p.prediction;
                  const feat = p.features;

                  return (
                    <tr key={p.id} className="hover:bg-[#F5F7FA] transition-colors">
                      <td className="py-2.5 px-3 font-mono font-bold text-[#003B6F]">
                        {p.project_code}
                      </td>

                      <td className="py-2.5 px-3">
                        <div className="space-y-0.5">
                          <div className="font-bold text-[#172033] line-clamp-1">{p.project_name}</div>
                          <div className="text-[10px] text-slate-500">{p.implementing_agency}</div>
                        </div>
                      </td>

                      <td className="py-2.5 px-3">
                        <div className="space-y-0.5">
                          <span className="font-semibold text-slate-800">{p.sector}</span>
                          <div className="text-[10px] text-slate-500">{p.state}</div>
                        </div>
                      </td>

                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1.5">
                          <div className="w-16 h-2 rounded bg-slate-200 overflow-hidden">
                            <div
                              className="h-full bg-[#138808]"
                              style={{ width: `${mon?.physical_progress || 0}%` }}
                            />
                          </div>
                          <span className="font-bold text-[#138808]">
                            {mon?.physical_progress || 0}%
                          </span>
                        </div>
                      </td>

                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1.5">
                          <div className="w-16 h-2 rounded bg-slate-200 overflow-hidden">
                            <div
                              className="h-full bg-[#005A9C]"
                              style={{ width: `${mon?.financial_progress || 0}%` }}
                            />
                          </div>
                          <span className="font-bold text-[#005A9C]">
                            {mon?.financial_progress || 0}%
                          </span>
                        </div>
                      </td>

                      <td className="py-2.5 px-3">
                        <StatusBadge status={p.project_status} size="sm" />
                      </td>

                      <td className="py-2.5 px-3">
                        <RiskBadge
                          level={pred?.risk_level || 'LOW'}
                          score={pred?.risk_score}
                          size="sm"
                        />
                      </td>

                      <td className="py-2.5 px-3">
                        {isAdmin ? (
                          <select
                            value={p.assigned_to || ''}
                            disabled={updatingId === p.id}
                            onChange={(e) => handleReassignOfficer(p.id, e.target.value)}
                            className="rounded border border-[#D9E1E8] bg-white py-0.5 px-1 text-[11px] font-medium text-slate-700 max-w-[130px] truncate"
                          >
                            <option value="">Unassigned</option>
                            {officers.map((off) => (
                              <option key={off.id} value={off.id}>
                                {off.name}
                              </option>
                            ))}
                          </select>
                        ) : p.is_demo ? (
                          <span className="text-[10px] text-amber-800 font-bold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                            Demo Data
                          </span>
                        ) : (
                          <span className="text-[10px] text-emerald-800 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                            Assigned
                          </span>
                        )}
                      </td>

                      <td className="py-2.5 px-3 text-right">
                        <Link
                          to={`/projects/${p.id}`}
                          className="inline-flex items-center gap-1 rounded bg-[#003B6F] text-white px-2.5 py-1 text-[11px] font-bold hover:bg-[#005A9C] transition-colors"
                        >
                          <span>Details</span>
                          <ChevronRight className="h-3 w-3" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Controls */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 sm:px-6 mt-4">
            <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-slate-700">
                  Showing <span className="font-medium">{(currentPage - 1) * 50 + 1}</span> to{' '}
                  <span className="font-medium">{Math.min(currentPage * 50, totalCount)}</span> of{' '}
                  <span className="font-medium">{totalCount}</span> results
                </p>
              </div>
              <div>
                <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center rounded-l-md px-2 py-2 text-slate-400 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                  >
                    <span className="sr-only">Previous</span>
                    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
                    </svg>
                  </button>
                  <span className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-slate-700 ring-1 ring-inset ring-slate-300 focus:outline-offset-0">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="relative inline-flex items-center rounded-r-md px-2 py-2 text-slate-400 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                  >
                    <span className="sr-only">Next</span>
                    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                    </svg>
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Admin Add Project Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full border border-slate-300 space-y-4 shadow-xl text-xs">
            <div className="flex items-center justify-between border-b pb-2">
              <h2 className="text-sm font-bold text-[#003B6F]">Register Infrastructure Project</h2>
              <button onClick={() => setIsModalOpen(false)}>
                <X className="h-4 w-4" />
              </button>
            </div>

            {modalError && <div className="text-red-600 bg-red-50 p-2 rounded">{modalError}</div>}
            {modalSuccess && <div className="text-emerald-600 bg-emerald-50 p-2 rounded">{modalSuccess}</div>}

            <form onSubmit={handleModalSubmit} className="space-y-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Project Name *</label>
                <input
                  type="text"
                  required
                  value={formData.project_name}
                  onChange={(e) => setFormData({ ...formData, project_name: e.target.value })}
                  className="w-full rounded border border-[#D9E1E8] p-1.5"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Project Code *</label>
                <input
                  type="text"
                  required
                  value={formData.project_code}
                  onChange={(e) => setFormData({ ...formData, project_code: e.target.value })}
                  className="w-full rounded border border-[#D9E1E8] p-1.5"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 rounded border border-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalSubmitting}
                  className="px-3 py-1.5 rounded bg-[#003B6F] text-white font-bold"
                >
                  {modalSubmitting ? 'Saving...' : 'Register Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
