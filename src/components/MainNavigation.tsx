import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  Home,
  Info,
  FolderGit2,
  Activity,
  BrainCircuit,
  AlertOctagon,
  FileText,
  Database,
  HelpCircle,
  Lock,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface MainNavigationProps {
  highRiskCount?: number;
  newAlertCount?: number;
}

export const MainNavigation: React.FC<MainNavigationProps> = ({
  highRiskCount = 0,
  newAlertCount = 0,
}) => {
  const { isAuthenticated, isAdmin } = useAuth();

  const navItems = [
    { name: 'Home', path: '/', icon: Home, public: true },
    { name: 'About', path: '/about', icon: Info, public: true },
    {
      name: 'Projects',
      path: '/projects',
      icon: FolderGit2,
      badge: highRiskCount > 0 ? `${highRiskCount}` : null,
      badgeColor: 'bg-amber-500 text-slate-950',
      protected: true,
    },
    { name: 'Monitoring', path: '/dashboard', icon: Activity, protected: true },
    {
      name: 'Risk Intelligence',
      path: '/model-insights',
      icon: BrainCircuit,
      protected: true,
    },
    {
      name: 'Early Warnings',
      path: '/alerts',
      icon: AlertOctagon,
      badge: newAlertCount > 0 ? `${newAlertCount}` : null,
      badgeColor: 'bg-rose-600 text-white',
      protected: true,
    },
    { name: 'Reports', path: '/reports', icon: FileText, protected: true },
    {
      name: 'Data & Analytics',
      path: '/upload',
      icon: Database,
      adminOnly: true,
      protected: true,
    },
    { name: 'Help', path: '/help', icon: HelpCircle, public: true },
  ];

  return (
    <nav
      id="main-navigation-bar"
      className="bg-[#003B6F] text-white border-b-2 border-[#E87500] shadow-sm font-sans"
      aria-label="Main Navigation"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center space-x-1 overflow-x-auto scrollbar-none py-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            // Hide admin routes for non-admins
            if (item.adminOnly && !isAdmin) return null;

            return (
              <NavLink
                key={item.name}
                to={item.path}
                end={item.path === '/' || item.path === '/dashboard'}
                className={({ isActive }) =>
                  `flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                    isActive
                      ? 'bg-[#005A9C] text-white shadow-xs border-b-2 border-amber-400'
                      : 'text-slate-100 hover:bg-[#005A9C]/60 hover:text-white'
                  }`
                }
              >
                <Icon className="h-3.5 w-3.5 opacity-90" />
                <span>{item.name}</span>

                {item.badge && (
                  <span
                    className={`ml-1 rounded-full px-1.5 py-0.2 text-[9px] font-extrabold ${item.badgeColor}`}
                  >
                    {item.badge}
                  </span>
                )}

                {item.protected && !isAuthenticated && (
                  <Lock className="h-2.5 w-2.5 text-amber-300 opacity-70 ml-0.5" />
                )}
              </NavLink>
            );
          })}
        </div>
      </div>
    </nav>
  );
};
