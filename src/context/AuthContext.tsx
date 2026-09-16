import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { supabase } from '../services/supabaseClient';
import {
  getStoredToken,
  getStoredUser,
  saveAuthSession,
  clearAuthSession,
} from '../services/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isOfficer: boolean;
  loading: boolean;
  login: (email: string, password: string, selectedRole?: UserRole) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  logout: () => Promise<void>;
  loginDemo: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const isLocalMode = !supabaseUrl || supabaseUrl.includes('placeholder');

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => getStoredUser());
  const [token, setToken] = useState<string | null>(() => getStoredToken());
  const [loading, setLoading] = useState<boolean>(true);

  const fetchProfileRole = async (userId: string, email: string, defaultName: string): Promise<User> => {
    if (isLocalMode) {
      try {
        const res = await fetch(`/api/auth/me?email=${encodeURIComponent(email)}`);
        if (res.ok) {
          const data = await res.json();
          return data as User;
        }
      } catch (err) {
        console.warn('Local profile fetch failed:', err);
      }
      return {
        id: userId,
        email,
        name: defaultName,
        role: 'officer',
        created_at: new Date().toISOString(),
      };
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('role, name')
        .eq('id', userId)
        .maybeSingle();

      const role: UserRole = (data?.role as UserRole) || 'officer';
      const name = data?.name || defaultName || email.split('@')[0];

      return {
        id: userId,
        email,
        name,
        role,
        created_at: new Date().toISOString(),
      };
    } catch {
      return {
        id: userId,
        email,
        name: defaultName,
        role: 'officer',
        created_at: new Date().toISOString(),
      };
    }
  };

  useEffect(() => {
    const initSession = async () => {
      if (isLocalMode) {
        // If in local mode, we just rely on localStorage (already loaded in useState).
        setLoading(false);
        return;
      }

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session && session.user) {
          const accessToken = session.access_token;
          const userObj = await fetchProfileRole(
            session.user.id,
            session.user.email || '',
            session.user.user_metadata?.name || 'User'
          );
          setUser(userObj);
          setToken(accessToken);
          saveAuthSession(accessToken, userObj);
        } else {
          clearAuthSession();
          setUser(null);
          setToken(null);
        }
      } catch (err) {
        console.warn('[AuthContext] Session init error:', err);
      } finally {
        setLoading(false);
      }
    };

    initSession();

    if (!isLocalMode) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (session && session.user) {
          const accessToken = session.access_token;
          const userObj = await fetchProfileRole(
            session.user.id,
            session.user.email || '',
            session.user.user_metadata?.name || 'User'
          );
          setUser(userObj);
          setToken(accessToken);
          saveAuthSession(accessToken, userObj);
        } else {
          clearAuthSession();
          setUser(null);
          setToken(null);
        }
        setLoading(false);
      });

      return () => {
        subscription.unsubscribe();
      };
    }
  }, []);

  const login = async (email: string, password: string, selectedRole?: UserRole) => {
    setLoading(true);
    try {
      if (isLocalMode) {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email.trim(), password })
        });
        
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.detail || 'Invalid email or password.');
        }
        
        const data = await res.json();
        const userObj = data.user;
        
        if (selectedRole) {
          if (selectedRole === 'admin' && userObj.role !== 'admin') {
            throw new Error('These credentials belong to a Project Officer account. Please select Officer.');
          }
          if (selectedRole === 'officer' && userObj.role === 'admin') {
            throw new Error('These credentials belong to an Administrator account. Please select Admin.');
          }
        }
        
        setUser(userObj);
        setToken(data.access_token);
        saveAuthSession(data.access_token, userObj);
        return;
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error || !data.session || !data.user) {
        throw new Error('Invalid email or password.');
      }

      const userObj = await fetchProfileRole(
        data.user.id,
        data.user.email || email,
        data.user.user_metadata?.name || 'User'
      );

      if (selectedRole) {
        if (selectedRole === 'admin' && userObj.role !== 'admin') {
          await supabase.auth.signOut().catch(() => {});
          clearAuthSession();
          setUser(null);
          setToken(null);
          throw new Error('These credentials belong to a Project Officer account. Please select Officer.');
        }

        if (selectedRole === 'officer' && userObj.role === 'admin') {
          await supabase.auth.signOut().catch(() => {});
          clearAuthSession();
          setUser(null);
          setToken(null);
          throw new Error('These credentials belong to an Administrator account. Please select Admin.');
        }
      }

      const accessToken = data.session.access_token;
      setUser(userObj);
      setToken(accessToken);
      saveAuthSession(accessToken, userObj);
    } finally {
      setLoading(false);
    }
  };

  const register = async (name: string, email: string, password: string) => {
    setLoading(true);
    try {
      if (isLocalMode) {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: name.trim(), email: email.trim(), password })
        });
        
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.detail || 'Registration failed.');
        }
        
        const data = await res.json();
        const userObj = data.user;
        setUser(userObj);
        setToken(data.access_token);
        saveAuthSession(data.access_token, userObj);
        return;
      }

      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            name: name.trim(),
          },
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data.session && data.user) {
        const accessToken = data.session.access_token;
        const userObj = await fetchProfileRole(data.user.id, data.user.email || email, name);
        setUser(userObj);
        setToken(accessToken);
        saveAuthSession(accessToken, userObj);
      }
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (email: string) => {
    if (isLocalMode) return;
    const redirectTo = `${window.location.origin}/reset-password`;
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo,
    });
    if (error) {
      throw new Error(error.message);
    }
  };

  const updatePassword = async (password: string) => {
    if (isLocalMode) return;
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      throw new Error(error.message);
    }
  };

  const logout = async () => {
    try {
      if (!isLocalMode) {
        await supabase.auth.signOut();
      }
    } catch (err) {
      console.warn('[AuthContext] Sign out warning:', err);
    } finally {
      clearAuthSession();
      setUser(null);
      setToken(null);
    }
  };

  const loginDemo = async () => {
    setLoading(true);
    try {
      let data: any = null;
      try {
        const res = await fetch('/api/auth/demo-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });
        const text = await res.text();
        if (text && text.trim()) {
          data = JSON.parse(text);
        }
      } catch (netErr) {
        console.warn('[AuthContext] Demo API fetch fallback notice:', netErr);
      }

      const demoUser: User = data?.user || {
        id: 'usr-demo-officer',
        name: 'Demo Project Officer',
        email: 'demo@projectsentinel.ai',
        role: 'officer',
        created_at: new Date().toISOString(),
      };
      const authToken = data?.access_token || 'demo-local-fallback-token';

      if (!isLocalMode && data?.access_token && data?.refresh_token && data?.access_token !== 'demo-local-fallback-token') {
        try {
          await supabase.auth.setSession({
            access_token: data.access_token,
            refresh_token: data.refresh_token,
          });
        } catch (sbErr) {
          console.warn('[AuthContext] Supabase setSession notice:', sbErr);
        }
      }

      setUser(demoUser);
      setToken(authToken);
      saveAuthSession(authToken, demoUser);
    } finally {
      setLoading(false);
    }
  };

  const isAuthenticated = !!token && !!user;
  const isAdmin = user?.role === 'admin';
  const isOfficer = user?.role === 'officer';

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated,
        isAdmin,
        isOfficer,
        loading,
        login,
        register,
        resetPassword,
        updatePassword,
        logout,
        loginDemo,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
