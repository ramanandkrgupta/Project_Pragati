import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Bell, User, LogOut, ShieldAlert, Sparkles, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { GovLogo } from './GovLogo';
import { AccessibilityControls } from './AccessibilityControls';

interface GovHeaderProps {
  highRiskCount?: number;
  newAlertCount?: number;
}

export const GovHeader: React.FC<GovHeaderProps> = ({
  highRiskCount = 0,
  newAlertCount = 0,
}) => {
  const navigate = useNavigate();
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const [searchVal, setSearchVal] = useState('');

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchVal.trim()) {
      navigate(`/projects?search=${encodeURIComponent(searchVal.trim())}`);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="w-full flex flex-col shadow-md z-30 font-sans">
      {/* Top Government Utility Bar */}
      <div className="bg-[#0B1F33] text-slate-200 px-4 sm:px-6 lg:px-8 py-1.5 border-b border-slate-800 text-xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-[#E87500]" />
            <span className="font-semibold text-slate-100 tracking-wide text-[11px] sm:text-xs">
              Government Project Monitoring Platform
            </span>
            <span className="hidden md:inline-block text-slate-500 font-mono text-[10px]">
              • Smart India Hackathon Prototype
            </span>
          </div>

          <AccessibilityControls />
        </div>
      </div>

      {/* Main Institutional Brand Header */}
      <div className="bg-white border-b border-[#D9E1E8] px-4 sm:px-6 lg:px-8 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* PRAGATI Brand Logo & Full Title */}
          <Link to="/" className="flex items-center gap-3.5 group">
            <GovLogo size="md" />
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-[#003B6F] font-serif">
                  PRAGATI
                </h1>
                <span className="hidden sm:inline-flex items-center rounded-sm bg-[#E87500]/10 px-1.5 py-0.5 text-[10px] font-extrabold text-[#E87500] border border-[#E87500]/30 tracking-wider uppercase">
                  Monitor • Predict • Intervene
                </span>
              </div>
              <p className="text-[11px] sm:text-xs font-semibold text-[#667085] tracking-tight">
                Predictive Risk Assessment for Government Asset Tracking & Intervention
              </p>
            </div>
          </Link>

          {/* Right Action Tools & Officer Session Profile */}
          <div className="flex items-center gap-3">
            {/* Global Search Bar */}
            <form onSubmit={handleSearchSubmit} className="relative hidden lg:block w-64 lg:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search projects, department, code..."
                value={searchVal}
                onChange={(e) => setSearchVal(e.target.value)}
                className="w-full rounded-md border border-[#D9E1E8] bg-[#F5F7FA] pl-8 pr-3 py-1.5 text-xs text-[#172033] placeholder-slate-400 transition-all focus:border-[#005A9C] focus:bg-white focus:outline-hidden"
              />
            </form>

            {/* Early Warning Notification Bell */}
            <Link
              to="/alerts"
              id="header-alert-bell"
              className="relative p-2 rounded-md text-[#172033] hover:bg-[#F5F7FA] border border-[#D9E1E8] transition-colors"
              title="Early Warning Centre"
            >
              <Bell className="h-4 w-4 text-[#003B6F]" />
              {newAlertCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#C62828] px-1 text-[9px] font-extrabold text-white">
                  {newAlertCount}
                </span>
              )}
            </Link>

            {/* Officer Login / Profile Card */}
            {isAuthenticated && user ? (
              <div className="flex items-center gap-2.5 pl-3 border-l border-[#D9E1E8]">
                <div className="hidden sm:flex flex-col text-right">
                  <span className="text-xs font-bold text-[#172033]">
                    {user.name.split(' ')[0]}
                  </span>
                  <span className="text-[10px] font-medium text-[#667085]">
                    {isAdmin ? 'Administrator' : 'Monitoring Officer'}
                  </span>
                </div>

                <div
                  className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[10px] font-extrabold uppercase border ${
                    isAdmin
                      ? 'bg-indigo-50 text-indigo-800 border-indigo-200'
                      : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  }`}
                >
                  <ShieldCheck className="h-3 w-3" />
                  <span>{user.role}</span>
                </div>

                <button
                  onClick={handleLogout}
                  className="p-1.5 rounded-md text-slate-500 hover:text-[#C62828] hover:bg-red-50 transition-colors"
                  title="Sign Out"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                id="btn-header-officer-login"
                className="flex items-center gap-1.5 rounded-md bg-[#003B6F] px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-[#005A9C] transition-colors"
              >
                <User className="h-3.5 w-3.5" />
                <span>Officer Login</span>
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
