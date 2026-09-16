import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, ExternalLink, HelpCircle, FileText, Phone } from 'lucide-react';
import { GovLogo } from './GovLogo';

export const GovFooter: React.FC = () => {
  return (
    <footer className="bg-[#0B1F33] text-slate-300 font-sans border-t-4 border-[#E87500]">
      {/* Top Footer Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 grid grid-cols-1 md:grid-cols-4 gap-8">
        {/* Brand & Purpose */}
        <div className="md:col-span-2 space-y-4">
          <div className="flex items-center gap-3">
            <GovLogo size="md" />
            <div>
              <h2 className="text-lg font-bold text-white tracking-wide">PRAGATI</h2>
              <p className="text-xs text-slate-400">
                Predictive Risk Assessment for Government Asset Tracking & Intervention
              </p>
            </div>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed max-w-lg">
            PRAGATI is an AI-powered integrated project monitoring and early-warning platform designed for government project monitoring officers to enable proactive intervention, schedule tracking, and financial governance.
          </p>
          <div className="flex items-center gap-2 text-[11px] text-[#E87500] font-semibold bg-[#003B6F]/40 px-3 py-1.5 rounded border border-[#005A9C]/40 w-fit">
            <ShieldCheck className="h-4 w-4" />
            <span>Smart India Hackathon Prototype — Demonstration Data</span>
          </div>
        </div>

        {/* Quick Links */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-100 mb-3 border-b border-slate-700 pb-1">
            Portal Navigation
          </h3>
          <ul className="space-y-2 text-xs">
            <li>
              <Link to="/" className="hover:text-amber-400 transition-colors">
                Public Portal Home
              </Link>
            </li>
            <li>
              <Link to="/projects" className="hover:text-amber-400 transition-colors">
                Project Directory
              </Link>
            </li>
            <li>
              <Link to="/dashboard" className="hover:text-amber-400 transition-colors">
                Monitoring Dashboard
              </Link>
            </li>
            <li>
              <Link to="/alerts" className="hover:text-amber-400 transition-colors">
                Early Warning Centre
              </Link>
            </li>
            <li>
              <Link to="/model-insights" className="hover:text-amber-400 transition-colors">
                Risk Intelligence
              </Link>
            </li>
          </ul>
        </div>

        {/* Resources & Support */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-100 mb-3 border-b border-slate-700 pb-1">
            Governance & Support
          </h3>
          <ul className="space-y-2 text-xs">
            <li>
              <Link to="/reports" className="hover:text-amber-400 transition-colors">
                Reports & Publications
              </Link>
            </li>
            <li>
              <Link to="/about" className="hover:text-amber-400 transition-colors">
                System Overview & Methodology
              </Link>
            </li>
            <li>
              <Link to="/help" className="hover:text-amber-400 transition-colors">
                Help & Documentation
              </Link>
            </li>
            <li>
              <a
                href="https://www.digitalindia.gov.in/"
                target="_blank"
                rel="noreferrer"
                className="hover:text-amber-400 transition-colors flex items-center gap-1"
              >
                <span>Digital India Reference</span>
                <ExternalLink className="h-2.5 w-2.5 opacity-60" />
              </a>
            </li>
          </ul>
        </div>
      </div>

      {/* Institutional Disclaimer & Copyright */}
      <div className="bg-[#050B14] py-4 px-4 sm:px-6 lg:px-8 border-t border-slate-800 text-[11px] text-slate-400">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3 text-center md:text-left">
          <p>
            © {new Date().getFullYear()} PRAGATI Platform • Designed for Indian Government Project Monitoring Officers.
          </p>
          <div className="flex items-center gap-4 text-[10px]">
            <span>Accessibility Standard: GIGW Compliant</span>
            <span>|</span>
            <span>Explainable AI Risk Engine v2.4</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
