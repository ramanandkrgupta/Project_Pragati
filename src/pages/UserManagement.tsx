import React, { useEffect, useState } from 'react';
import {
  Users,
  Shield,
  ShieldCheck,
  UserCheck,
  Search,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  ArrowUpRight,
  ArrowDownRight,
  UserPlus,
} from 'lucide-react';
import { fetchUsers, updateUserRole, fetchProjects } from '../services/api';
import { UserProfile, UserRole, Project } from '../types';
import { useAuth } from '../context/AuthContext';

export const UserManagement: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [search, setSearch] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const [usersData, projectsData] = await Promise.all([
        fetchUsers(),
        fetchProjects().catch(() => []),
      ]);
      setUsers(usersData);
      setProjects(projectsData);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to fetch user list');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRoleChange = async (targetUser: UserProfile, newRole: UserRole) => {
    if (targetUser.id === currentUser?.id) {
      alert('You cannot change your own administrative role.');
      return;
    }

    const confirmMsg =
      newRole === 'admin'
        ? `Promote "${targetUser.name}" to Administrator? They will receive full permissions to manage users and upload data.`
        : `Demote "${targetUser.name}" to Monitoring Officer? Their administrative privileges will be revoked.`;

    if (!window.confirm(confirmMsg)) return;

    setUpdatingId(targetUser.id);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const updated = await updateUserRole(targetUser.id, newRole);
      setUsers((prev) =>
        prev.map((u) => (u.id === targetUser.id ? { ...u, role: updated.role } : u))
      );
      setSuccessMessage(
        `Successfully updated ${targetUser.name}'s role to ${newRole.toUpperCase()}.`
      );
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update user role');
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.role.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div id="user-management-page" className="space-y-6 pb-12 font-sans">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#D9E1E8] pb-4">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded bg-blue-50 px-2.5 py-1 text-xs font-bold text-[#003B6F] border border-blue-200 mb-1">
            <Users className="h-4 w-4" />
            <span>Role-Based Access Control (RBAC)</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#003B6F] font-serif">
            Officer & Administrator Directory
          </h1>
          <p className="text-xs text-[#667085]">
            Manage user roles, administrative permissions, and officer project assignments.
          </p>
        </div>

        <button
          onClick={loadData}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded bg-white text-[#003B6F] border border-[#D9E1E8] hover:bg-[#F5F7FA] px-3.5 py-2 text-xs font-bold shadow-xs transition-colors"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-[#005A9C]' : ''}`} />
          <span>Refresh Directory</span>
        </button>
      </div>

      {/* Notifications */}
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

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-lg border border-[#D9E1E8] shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search officers by name, email, or role..."
            className="w-full rounded border border-[#D9E1E8] bg-[#F5F7FA] pl-8 pr-3 py-1.5 text-xs text-[#172033]"
          />
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-600 font-medium">
          <span>Total Officers: <strong className="text-[#003B6F]">{users.length}</strong></span>
          <span>•</span>
          <span>Admins: <strong className="text-[#005A9C]">{users.filter((u) => u.role === 'admin').length}</strong></span>
          <span>•</span>
          <span>Monitoring Officers: <strong className="text-[#138808]">{users.filter((u) => u.role === 'officer').length}</strong></span>
        </div>
      </div>

      {/* User Directory Table */}
      <div className="bg-white rounded-lg border border-[#D9E1E8] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#003B6F] text-white font-bold">
                <th className="py-2.5 px-3 border-r border-[#005A9C]">Officer Name</th>
                <th className="py-2.5 px-3 border-r border-[#005A9C]">Email Address</th>
                <th className="py-2.5 px-3 border-r border-[#005A9C]">Assigned Role</th>
                <th className="py-2.5 px-3 border-r border-[#005A9C]">Assigned Projects</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D9E1E8]">
              {filteredUsers.map((u) => {
                const isSelf = u.id === currentUser?.id;
                const userProjects = projects.filter((p) => p.assigned_to === u.id);

                return (
                  <tr key={u.id} className="hover:bg-[#F5F7FA] transition-colors">
                    <td className="py-2.5 px-3 font-bold text-[#172033]">
                      {u.name} {isSelf && <span className="text-[10px] text-[#005A9C] font-semibold">(You)</span>}
                    </td>

                    <td className="py-2.5 px-3 font-mono text-slate-600">{u.email}</td>

                    <td className="py-2.5 px-3 font-bold">
                      {u.role === 'admin' ? (
                        <span className="text-indigo-800 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                          Administrator
                        </span>
                      ) : (
                        <span className="text-[#138808] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          Monitoring Officer
                        </span>
                      )}
                    </td>

                    <td className="py-2.5 px-3 text-slate-600">
                      {u.role === 'admin' ? 'Portfolio Wide' : `${userProjects.length} Projects`}
                    </td>

                    <td className="py-2.5 px-3 text-right">
                      {isSelf ? (
                        <span className="text-slate-400 font-semibold text-[11px]">Active Session</span>
                      ) : u.role === 'officer' ? (
                        <button
                          onClick={() => handleRoleChange(u, 'admin')}
                          className="rounded bg-[#003B6F] text-white px-2.5 py-1 text-[10px] font-bold hover:bg-[#005A9C]"
                        >
                          Promote to Admin
                        </button>
                      ) : (
                        <button
                          onClick={() => handleRoleChange(u, 'officer')}
                          className="rounded border border-slate-300 bg-white px-2.5 py-1 text-[10px] font-bold text-slate-700 hover:bg-slate-50"
                        >
                          Demote to Officer
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
