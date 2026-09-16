import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Lock,
  Mail,
  User as UserIcon,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  Shield,
  ShieldCheck,
  Building2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';
import { GovLogo } from '../components/GovLogo';

type AuthMode = 'signin' | 'register' | 'forgot';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, register, resetPassword, loginDemo, isAuthenticated } = useAuth();

  const [mode, setMode] = useState<AuthMode>('signin');
  const [selectedRole, setSelectedRole] = useState<UserRole>('officer');
  const [email, setEmail] = useState<string>('officer@projectsentinel.ai');
  const [password, setPassword] = useState<string>('DemoSentinel2026!');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [name, setName] = useState<string>('');

  useEffect(() => {
    if (mode === 'signin') {
      if (selectedRole === 'officer') {
        setEmail('officer@projectsentinel.ai');
        setPassword('DemoSentinel2026!');
      } else if (selectedRole === 'admin') {
        setEmail('admin@projectsentinel.ai');
        setPassword('DemoSentinel2026!');
      }
    }
  }, [selectedRole, mode]);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const from = (location.state as any)?.from?.pathname || '/dashboard';

  useEffect(() => {
    if (isAuthenticated) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, from]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setLoading(true);

    try {
      if (mode === 'forgot') {
        if (!email.trim()) {
          setErrorMessage('Please enter your email address.');
          setLoading(false);
          return;
        }
        await resetPassword(email.trim());
        setSuccessMessage('Password reset link has been sent to your email.');
      } else if (mode === 'register') {
        if (!name.trim()) {
          setErrorMessage('Please enter your full name.');
          setLoading(false);
          return;
        }
        if (!email.trim() || !password) {
          setErrorMessage('Please provide both email and password.');
          setLoading(false);
          return;
        }
        if (password.length < 6) {
          setErrorMessage('Password must be at least 6 characters long.');
          setLoading(false);
          return;
        }
        if (password !== confirmPassword) {
          setErrorMessage('Passwords do not match.');
          setLoading(false);
          return;
        }

        await register(name.trim(), email.trim(), password);
        setSuccessMessage(
          'Account created successfully. Your account has been registered as a Project Officer.'
        );
        setSelectedRole('officer');
        setMode('signin');
        setPassword('');
        setConfirmPassword('');
      } else {
        if (!email.trim() || !password) {
          setErrorMessage('Please enter your email and password.');
          setLoading(false);
          return;
        }
        await login(email.trim(), password, selectedRole);
        navigate(from, { replace: true });
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Invalid credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoClick = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setLoading(true);
    try {
      await loginDemo();
      navigate(from, { replace: true });
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to authenticate with demo account.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F7FA] flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center space-y-2">
        <GovLogo size="lg" className="mx-auto" />
        <h1 className="text-3xl font-extrabold text-[#003B6F] font-serif tracking-tight">
          PRAGATI
        </h1>
        <p className="text-xs font-semibold text-[#667085]">
          Predictive Risk Assessment for Government Asset Tracking & Intervention
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white py-8 px-6 sm:px-8 border border-[#D9E1E8] shadow-md rounded-lg space-y-5">
          <div className="text-center">
            <h2 className="text-base font-extrabold text-[#003B6F]">
              {mode === 'signin' && 'Officer Authentication'}
              {mode === 'register' && 'Register Officer Account'}
              {mode === 'forgot' && 'Reset Password'}
            </h2>
          </div>

          {errorMessage && (
            <div className="rounded bg-rose-50 border border-rose-200 p-3 text-xs text-[#C62828] font-bold">
              {errorMessage}
            </div>
          )}

          {successMessage && (
            <div className="rounded bg-emerald-50 border border-emerald-200 p-3 text-xs text-[#138808] font-bold">
              {successMessage}
            </div>
          )}

          {mode === 'signin' && (
            <div className="grid grid-cols-2 gap-2 bg-[#F5F7FA] p-1 rounded border border-slate-200 text-xs font-bold">
              <button
                type="button"
                onClick={() => setSelectedRole('officer')}
                className={`py-1.5 rounded transition-all ${
                  selectedRole === 'officer'
                    ? 'bg-[#003B6F] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Project Officer
              </button>
              <button
                type="button"
                onClick={() => setSelectedRole('admin')}
                className={`py-1.5 rounded transition-all ${
                  selectedRole === 'admin'
                    ? 'bg-[#003B6F] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Administrator
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {mode === 'register' && (
              <div>
                <label className="block font-bold text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Officer Name"
                  className="w-full rounded border border-[#D9E1E8] p-2"
                />
              </div>
            )}

            <div>
              <label className="block font-bold text-slate-700 mb-1">Official Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="officer@gov.in"
                className="w-full rounded border border-[#D9E1E8] p-2"
              />
            </div>

            {mode !== 'forgot' && (
              <div>
                <label className="block font-bold text-slate-700 mb-1">Password</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded border border-[#D9E1E8] p-2"
                />
              </div>
            )}

            {mode === 'register' && (
              <div>
                <label className="block font-bold text-slate-700 mb-1">Confirm Password</label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded border border-[#D9E1E8] p-2"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded bg-[#003B6F] hover:bg-[#005A9C] text-white py-2 text-xs font-bold shadow-xs transition-colors"
            >
              {loading ? 'Authenticating...' : mode === 'signin' ? 'Officer Sign In' : 'Submit'}
            </button>
          </form>

          <div className="pt-3 border-t border-slate-100 text-center space-y-2 text-xs">
            <button
              onClick={handleDemoClick}
              disabled={loading}
              className="font-bold text-[#005A9C] hover:underline"
            >
              Access Demonstration Mode (Demo Login)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
