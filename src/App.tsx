import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { GovHeader } from './components/GovHeader';
import { MainNavigation } from './components/MainNavigation';
import { GovFooter } from './components/GovFooter';
import { PublicHome } from './pages/PublicHome';
import { About } from './pages/About';
import { Help } from './pages/Help';
import { Dashboard } from './pages/Dashboard';
import { Projects } from './pages/Projects';
import { ProjectDetail } from './pages/ProjectDetail';
import { EarlyWarnings } from './pages/EarlyWarnings';
import { ModelInsights } from './pages/ModelInsights';
import { Reports } from './pages/Reports';
import { DataUpload } from './pages/DataUpload';
import { UserManagement } from './pages/UserManagement';
import { Login } from './pages/Login';
import { ResetPassword } from './pages/ResetPassword';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AccessibilityProvider } from './context/AccessibilityContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { fetchDashboard } from './services/api';
import { AIAssistantChat } from './components/AIAssistantChat';

function MainLayout() {
  const [highRiskCount, setHighRiskCount] = useState<number>(0);
  const [newAlertCount, setNewAlertCount] = useState<number>(0);
  const { isAuthenticated } = useAuth();

  const loadSummaryStats = async () => {
    if (!isAuthenticated) return;
    try {
      const summary = await fetchDashboard();
      setHighRiskCount(summary.high_risk_projects);
      const newAlerts = (summary.recent_alerts || []).filter((a) => a.status === 'NEW').length;
      setNewAlertCount(newAlerts);
    } catch {
      // ignore fallback
    }
  };

  useEffect(() => {
    loadSummaryStats();
    const interval = setInterval(loadSummaryStats, 30000);
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  return (
    <div className="flex flex-col min-h-screen bg-[#F5F7FA] text-[#172033] font-sans">
      {/* Dual-Bar Government Header */}
      <GovHeader highRiskCount={highRiskCount} newAlertCount={newAlertCount} />

      {/* Main Government Navigation Bar */}
      <MainNavigation highRiskCount={highRiskCount} newAlertCount={newAlertCount} />

      {/* Main Content Area */}
      <main id="main-content" tabIndex={-1} className="flex-1 px-4 sm:px-6 lg:px-8 py-6 max-w-7xl w-full mx-auto focus:outline-hidden">
        <Routes>
          {/* Public Portal Routes */}
          <Route path="/" element={<PublicHome />} />
          <Route path="/about" element={<About />} />
          <Route path="/help" element={<Help />} />

          {/* Protected Monitoring Routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/projects"
            element={
              <ProtectedRoute>
                <Projects />
              </ProtectedRoute>
            }
          />
          <Route
            path="/projects/:id"
            element={
              <ProtectedRoute>
                <ProjectDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/alerts"
            element={
              <ProtectedRoute>
                <EarlyWarnings />
              </ProtectedRoute>
            }
          />
          <Route
            path="/model-insights"
            element={
              <ProtectedRoute>
                <ModelInsights />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports"
            element={
              <ProtectedRoute>
                <Reports />
              </ProtectedRoute>
            }
          />

          {/* RBAC Routes: Admin Only */}
          <Route
            path="/upload"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <DataUpload />
              </ProtectedRoute>
            }
          />
          <Route
            path="/users"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <UserManagement />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {/* Government Footer */}
      <GovFooter />

      {/* Floating PRAGATI AI Copilot */}
      <AIAssistantChat />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AccessibilityProvider>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/*" element={<MainLayout />} />
          </Routes>
        </AuthProvider>
      </AccessibilityProvider>
    </BrowserRouter>
  );
}
