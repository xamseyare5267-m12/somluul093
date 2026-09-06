import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Users, ShieldAlert, FileSignature, HardDrive, Search, UserMinus, ShieldCheck,
  Trash2, RefreshCw, ChevronLeft, ChevronRight, Ban, Unlock, AlertTriangle, File, Calendar,
  History, Clock
} from 'lucide-react';
import { AdminStats, Profile, FileMetadata, ActivityLog } from '../types';
import { useLanguage } from './LanguageContext';

interface AdminDashboardProps {
  authToken: string;
  onPreviewFile: (file: FileMetadata) => void;
  onShowToast: (message: string, type: 'success' | 'error') => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  authToken,
  onPreviewFile,
  onShowToast,
}) => {
  const { t } = useLanguage();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [activeTab, setActiveTab] = useState<'users' | 'files' | 'logs'>('users');

  // System Audit Logs State
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [logsSearch, setLogsSearch] = useState('');
  const [isLogsLoading, setIsLogsLoading] = useState(false);

  // Users Moderation Table State
  const [users, setUsers] = useState<Profile[]>([]);
  const [usersSearch, setUsersSearch] = useState('');
  const [usersPage, setUsersPage] = useState(1);
  const [usersTotalPages, setUsersTotalPages] = useState(1);
  const [isUsersLoading, setIsUsersLoading] = useState(false);

  // Files Moderation Table State
  const [files, setFiles] = useState<FileMetadata[]>([]);
  const [filesSearch, setFilesSearch] = useState('');
  const [filesPage, setFilesPage] = useState(1);
  const [filesTotalPages, setFilesTotalPages] = useState(1);
  const [isFilesLoading, setIsFilesLoading] = useState(false);

  // Confirmation Modals State
  const [targetUser, setTargetUser] = useState<Profile | null>(null);
  const [confirmAction, setConfirmAction] = useState<'block' | 'unblock' | 'purge_files' | 'delete_user' | null>(null);
  const [targetFile, setTargetFile] = useState<FileMetadata | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Global user profiles mapping for looking up file owners
  const [allProfiles, setAllProfiles] = useState<Record<string, Profile>>({});

  const fetchStats = async () => {
    try {
      const response = await axios.get('/api/admin/stats', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      setStats(response.data.stats);
    } catch (err) {
      console.error('Error fetching admin stats', err);
    }
  };

  const fetchUsers = async () => {
    setIsUsersLoading(true);
    try {
      const response = await axios.get('/api/admin/users', {
        headers: { Authorization: `Bearer ${authToken}` },
        params: {
          search: usersSearch,
          page: usersPage,
          limit: 8,
        },
      });
      setUsers(response.data.data);
      setUsersTotalPages(response.data.totalPages);

      // Seed allProfiles mapping
      const updatedMapping = { ...allProfiles };
      response.data.data.forEach((p: Profile) => {
        updatedMapping[p.id] = p;
      });
      setAllProfiles(updatedMapping);
    } catch (err) {
      console.error('Error fetching registered users', err);
    } finally {
      setIsUsersLoading(false);
    }
  };

  const fetchFiles = async () => {
    setIsFilesLoading(true);
    try {
      const response = await axios.get('/api/files', {
        headers: { Authorization: `Bearer ${authToken}` },
        params: {
          search: filesSearch,
          page: filesPage,
          limit: 8,
        },
      });
      setFiles(response.data.data);
      setFilesTotalPages(response.data.totalPages);
    } catch (err) {
      console.error('Error fetching admin files', err);
    } finally {
      setIsFilesLoading(false);
    }
  };

  const fetchLogs = async () => {
    setIsLogsLoading(true);
    try {
      const response = await axios.get('/api/admin/logs', {
        headers: { Authorization: `Bearer ${authToken}` },
        params: {
          search: logsSearch,
        },
      });
      setLogs(response.data);
    } catch (err) {
      console.error('Error fetching admin activity logs', err);
    } finally {
      setIsLogsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [usersSearch, usersPage]);

  useEffect(() => {
    fetchFiles();
  }, [filesSearch, filesPage]);

  useEffect(() => {
    if (activeTab === 'logs') {
      fetchLogs();
    }
  }, [logsSearch, activeTab]);

  // Action Triggers
  const triggerUserAction = (user: Profile, action: 'block' | 'unblock' | 'purge_files' | 'delete_user') => {
    setTargetUser(user);
    setConfirmAction(action);
  };

  const triggerFileDelete = (file: FileMetadata) => {
    setTargetFile(file);
  };

  const executeUserAction = async () => {
    if (!targetUser || !confirmAction) return;

    setIsProcessing(true);
    try {
      if (confirmAction === 'block' || confirmAction === 'unblock') {
        const response = await axios.post(`/api/admin/users/${targetUser.id}/toggle-block`, {}, {
          headers: { Authorization: `Bearer ${authToken}` },
        });
        onShowToast(response.data.message, 'success');
      } else if (confirmAction === 'purge_files') {
        const response = await axios.delete(`/api/admin/users/${targetUser.id}/files`, {
          headers: { Authorization: `Bearer ${authToken}` },
        });
        onShowToast(response.data.message, 'success');
      } else if (confirmAction === 'delete_user') {
        const response = await axios.delete(`/api/admin/users/${targetUser.id}`, {
          headers: { Authorization: `Bearer ${authToken}` },
        });
        onShowToast(response.data.message, 'success');
      }

      setTargetUser(null);
      setConfirmAction(null);
      fetchStats();
      fetchUsers();
      fetchFiles();
    } catch (err: any) {
      const errMsg = err.response?.data?.error || 'Administrative command failed.';
      onShowToast(errMsg, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const executeFileDelete = async () => {
    if (!targetFile) return;

    setIsProcessing(true);
    try {
      await axios.delete(`/api/files/${targetFile.id}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      onShowToast(`File ${targetFile.original_name} was removed from the system.`, 'success');
      setTargetFile(null);
      fetchStats();
      fetchFiles();
    } catch (err: any) {
      const errMsg = err.response?.data?.error || 'Failed to remove file.';
      onShowToast(errMsg, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // Helper formatting
  const formatSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatDate = (isoStr: string): string => {
    return new Date(isoStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getOwnerLabel = (userId: string) => {
    const p = allProfiles[userId];
    if (p) return `${p.first_name} ${p.last_name} (${p.email})`;
    return `User (ID: ${userId.substring(0, 6)}...)`;
  };

  return (
    <div id="admin-dashboard-root" className="space-y-8 fade-in-up">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white font-sans flex items-center gap-2">
          {t('admin_cmd_title')}
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {t('admin_cmd_desc')}
        </p>
      </div>

      {/* STATS COUNT BAR */}
      <div id="admin-stats-grid" className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card: Total Users */}
        <div className="bg-white dark:bg-[var(--sl-bg-card)] border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">{t('admin_users_label')}</span>
            <Users size={18} className="text-indigo-500 shrink-0" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold font-mono text-gray-900 dark:text-white mt-3">
            {stats ? stats.totalUsers : 0}
          </h2>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{t('admin_users_count_suffix')}</p>
        </div>

        {/* Card: Blocked Users */}
        <div className="bg-white dark:bg-[var(--sl-bg-card)] border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">{t('admin_suspended_label')}</span>
            <ShieldAlert size={18} className="text-red-500 shrink-0" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold font-mono text-gray-900 dark:text-white mt-3">
            {stats ? stats.blockedUsers : 0}
          </h2>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{t('admin_suspended_count_suffix')}</p>
        </div>

        {/* Card: Files Count */}
        <div className="bg-white dark:bg-[var(--sl-bg-card)] border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">{t('admin_global_files_label')}</span>
            <FileSignature size={18} className="text-purple-500 shrink-0" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold font-mono text-gray-900 dark:text-white mt-3">
            {stats ? stats.totalFiles : 0}
          </h2>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{t('admin_files_count_suffix')}</p>
        </div>

        {/* Card: Total Storage */}
        <div className="bg-white dark:bg-[var(--sl-bg-card)] border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">{t('admin_physical_size_label')}</span>
            <HardDrive size={18} className="text-emerald-500 shrink-0" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold font-mono text-gray-900 dark:text-white mt-3">
            {stats ? formatSize(stats.totalSize) : '0 B'}
          </h2>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{t('admin_size_count_suffix')}</p>
        </div>
      </div>

      {/* TABS & MODERATION TABLES */}
      <div id="admin-tabs" className="bg-white dark:bg-[var(--sl-bg-card)] border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm overflow-hidden transition-colors duration-300">
        {/* Navigation Tabs */}
        <div className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-[var(--sl-bg-card)] flex px-4">
          <button
            id="admin-tab-users"
            onClick={() => setActiveTab('users')}
            className={`px-4 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'users'
                ? 'border-[var(--somluul-primary)] text-indigo-600 dark:border-blue-400'
                : 'border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'
            }`}
          >
            <Users size={14} />
            {t('admin_tab_users')}
          </button>
          <button
            id="admin-tab-files"
            onClick={() => setActiveTab('files')}
            className={`px-4 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'files'
                ? 'border-[var(--somluul-primary)] text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'
            }`}
          >
            <FileSignature size={14} />
            {t('admin_tab_files')} ({stats ? stats.totalFiles : 0})
          </button>
          <button
            id="admin-tab-logs"
            onClick={() => setActiveTab('logs')}
            className={`px-4 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'logs'
                ? 'border-[var(--somluul-primary)] text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'
            }`}
          >
            <History size={14} />
            {t('admin_tab_logs')}
          </button>
        </div>

        {/* TAB CONTENT: USERS MODERATION */}
        {activeTab === 'users' && (
          <div>
            {/* Search filter users */}
            <div className="p-4 border-b border-gray-100 dark:border-gray-800">
              <div className="relative max-w-md">
                <Search className="absolute left-3.5 top-3.5 text-gray-400" size={16} />
                <input
                  id="admin-search-users"
                  type="text"
                  placeholder={t('admin_search_users_placeholder')}
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-[var(--sl-bg-muted)] border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  value={usersSearch}
                  onChange={(e) => { setUsersSearch(e.target.value); setUsersPage(1); }}
                />
              </div>
            </div>

            {/* Users table */}
            <div className="overflow-x-auto">
              <table id="admin-users-table" className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-800 text-xs font-bold uppercase tracking-wider text-gray-400 bg-gray-50/20 dark:bg-gray-800/20">
                    <th className="px-6 py-4">{t('admin_col_user')}</th>
                    <th className="px-6 py-4">{t('admin_col_status')}</th>
                    <th className="px-6 py-4">{t('admin_col_joined')}</th>
                    <th className="px-6 py-4 text-right">{t('admin_col_actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-sm">
                  {isUsersLoading ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-gray-400">
                        <RefreshCw className="animate-spin inline mr-2" size={16} /> Loading users database...
                      </td>
                    </tr>
                  ) : users.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-gray-400">
                        No registered system users matched your filters.
                      </td>
                    </tr>
                  ) : (
                    users.map((user) => (
                      <tr id={`user-row-${user.id}`} key={user.id} className="hover:bg-gray-50/30 dark:hover:bg-gray-850/20 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-indigo-50 dark:bg-[var(--sl-bg-muted)] text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold font-sans">
                              {user.first_name[0]}{user.last_name[0]}
                            </div>
                            <div>
                              <p className="font-semibold text-gray-950 dark:text-white">
                                {user.first_name} {user.last_name}
                              </p>
                              <p className="text-xs text-gray-400 dark:text-gray-500 font-mono mt-0.5">
                                {user.email}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {user.blocked ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold tracking-wide bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-400 border border-red-100 dark:border-red-900/30">
                              <Ban size={12} /> {t('admin_btn_block')}ed
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold tracking-wide bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30">
                              <ShieldCheck size={12} /> Active
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-xs text-gray-500 dark:text-gray-400 font-mono">
                          {formatDate(user.created_at)}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            {user.blocked ? (
                              <button
                                id={`user-unblock-${user.id}`}
                                onClick={() => triggerUserAction(user, 'unblock')}
                                className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                              >
                                <Unlock size={12} /> {t('admin_btn_unblock')}
                              </button>
                            ) : (
                              <button
                                id={`user-block-${user.id}`}
                                onClick={() => triggerUserAction(user, 'block')}
                                className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                              >
                                <Ban size={12} /> {t('admin_btn_block')}
                              </button>
                            )}

                            <button
                              id={`user-purge-${user.id}`}
                              onClick={() => triggerUserAction(user, 'purge_files')}
                              className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 dark:bg-[var(--sl-bg-muted)] dark:hover:bg-gray-800 dark:text-gray-300 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                              title="Delete all user files from disk"
                            >
                              <Trash2 size={12} /> {t('admin_btn_purge_files')}
                            </button>

                            <button
                              id={`user-delete-${user.id}`}
                              onClick={() => triggerUserAction(user, 'delete_user')}
                              className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-950/30 dark:text-red-400 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                              title="Completely delete profile"
                            >
                              <UserMinus size={12} /> {t('admin_btn_delete_user')}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Users Pagination */}
            {users.length > 0 && usersTotalPages > 1 && (
              <div id="admin-users-pagination" className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
                <span className="text-xs text-gray-500 dark:text-gray-400 font-semibold">
                  {t('storage_showing_page')} <strong className="text-gray-900 dark:text-white font-mono">{usersPage}</strong> {t('storage_page_of')} <strong className="text-gray-900 dark:text-white font-mono">{usersTotalPages}</strong>
                </span>
                <div className="flex gap-2">
                  <button
                    disabled={usersPage === 1}
                    onClick={() => setUsersPage(prev => Math.max(1, prev - 1))}
                    className="p-2 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-500 disabled:opacity-40 hover:bg-gray-50 cursor-pointer"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <button
                    disabled={usersPage === usersTotalPages}
                    onClick={() => setUsersPage(prev => Math.min(usersTotalPages, prev + 1))}
                    className="p-2 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-500 disabled:opacity-40 hover:bg-gray-50 cursor-pointer"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB CONTENT: FILES MODERATION */}
        {activeTab === 'files' && (
          <div>
            {/* Search filter files */}
            <div className="p-4 border-b border-gray-100 dark:border-gray-800">
              <div className="relative max-w-md">
                <Search className="absolute left-3.5 top-3.5 text-gray-400" size={16} />
                <input
                  id="admin-search-files"
                  type="text"
                  placeholder={t('admin_search_files_placeholder')}
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-[var(--sl-bg-muted)] border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  value={filesSearch}
                  onChange={(e) => { setFilesSearch(e.target.value); setFilesPage(1); }}
                />
              </div>
            </div>

            {/* Global Files table */}
            <div className="overflow-x-auto">
              <table id="admin-files-table" className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-800 text-xs font-bold uppercase tracking-wider text-gray-400 bg-gray-50/20 dark:bg-gray-800/20">
                    <th className="px-6 py-4">{t('admin_col_filename')}</th>
                    <th className="px-6 py-4">{t('admin_col_owner')}</th>
                    <th className="px-6 py-4">{t('admin_col_size')}</th>
                    <th className="px-6 py-4">MIME Type</th>
                    <th className="px-6 py-4 text-right">{t('admin_col_actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-sm">
                  {isFilesLoading ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-gray-400">
                        <RefreshCw className="animate-spin inline mr-2" size={16} /> {t('admin_reading_files')}
                      </td>
                    </tr>
                  ) : files.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                        {t('admin_no_files_found')}
                      </td>
                    </tr>
                  ) : (
                    files.map((file) => (
                      <tr id={`admin-file-row-${file.id}`} key={file.id} className="hover:bg-gray-50/30 dark:hover:bg-gray-850/20 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="p-2 bg-gray-50 dark:bg-[var(--sl-bg-muted)] text-gray-400 dark:text-gray-500 rounded-lg shrink-0">
                              <File size={16} />
                            </div>
                            <span
                              className="font-semibold text-gray-900 dark:text-white truncate cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400 max-w-[200px]"
                              onClick={() => onPreviewFile(file)}
                              title={t('storage_preview')}
                            >
                              {file.original_name}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-xs font-medium text-gray-500 dark:text-gray-400">
                          {getOwnerLabel(file.user_id)}
                        </td>
                        <td className="px-6 py-4 text-xs text-gray-500 dark:text-gray-400 font-mono">
                          {formatSize(file.file_size)}
                        </td>
                        <td className="px-6 py-4 text-xs font-mono text-gray-400 dark:text-gray-500">
                          {file.mime_type}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            id={`admin-delete-file-${file.id}`}
                            onClick={() => triggerFileDelete(file)}
                            className="p-2 text-red-600 hover:text-white hover:bg-red-600 rounded-lg transition-colors cursor-pointer inline-flex items-center"
                            title={t('storage_delete_permanently')}
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Files Pagination */}
            {files.length > 0 && filesTotalPages > 1 && (
              <div id="admin-files-pagination" className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
                <span className="text-xs text-gray-500 dark:text-gray-400 font-semibold">
                  {t('storage_showing_page')} <strong className="text-gray-900 dark:text-white font-mono">{filesPage}</strong> {t('storage_page_of')} <strong className="text-gray-900 dark:text-white font-mono">{filesTotalPages}</strong>
                </span>
                <div className="flex gap-2">
                  <button
                    disabled={filesPage === 1}
                    onClick={() => setFilesPage(prev => Math.max(1, prev - 1))}
                    className="p-2 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-500 disabled:opacity-40 hover:bg-gray-50 cursor-pointer"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <button
                    disabled={filesPage === filesTotalPages}
                    onClick={() => setFilesPage(prev => Math.min(filesTotalPages, prev + 1))}
                    className="p-2 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-500 disabled:opacity-40 hover:bg-gray-50 cursor-pointer"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB CONTENT: SYSTEM AUDIT LOGS */}
        {activeTab === 'logs' && (
          <div>
            {/* Search filter logs */}
            <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row items-center gap-3 justify-between bg-white dark:bg-[var(--sl-bg-card)]">
              <div className="relative flex-1 w-full max-w-md">
                <Search className="absolute left-3.5 top-3 text-gray-400 dark:text-gray-500" size={16} />
                <input
                  id="search-admin-logs"
                  type="text"
                  placeholder={t('admin_search_logs_placeholder')}
                  className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-[var(--sl-bg-muted)] border border-gray-200 dark:border-gray-700 rounded-xl text-xs text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  value={logsSearch}
                  onChange={(e) => setLogsSearch(e.target.value)}
                />
              </div>
              <button
                onClick={fetchLogs}
                disabled={isLogsLoading}
                className="flex items-center gap-2 px-3 py-2 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl text-xs font-semibold text-gray-600 dark:text-gray-300 transition-colors disabled:opacity-50 cursor-pointer"
              >
                <RefreshCw size={12} className={isLogsLoading ? "animate-spin" : ""} />
                {t('storage_refresh_btn')}
              </button>
            </div>

            {isLogsLoading ? (
              <div className="py-12 flex flex-col items-center justify-center text-gray-400 space-y-2">
                <RefreshCw className="animate-spin text-indigo-500" size={24} />
                <p className="text-xs font-medium">{t('admin_loading_logs')}</p>
              </div>
            ) : logs.length === 0 ? (
              <div className="py-16 text-center">
                <div className="w-12 h-12 bg-gray-50 dark:bg-[var(--sl-bg-muted)] rounded-2xl flex items-center justify-center text-gray-400 mx-auto mb-4 border border-gray-100 dark:border-gray-800">
                  <Clock size={20} />
                </div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white font-sans">
                  {t('admin_no_logs')}
                </h3>
                <p className="text-xs text-gray-400 mt-1 max-w-xs mx-auto">
                  {t('admin_no_logs_desc')}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-[var(--sl-bg-card)] text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider font-mono">
                      <th className="py-3 px-6">{t('admin_col_initiator')}</th>
                      <th className="py-3 px-6">{t('admin_col_action_trigger')}</th>
                      <th className="py-3 px-6">{t('admin_col_operational_details')}</th>
                      <th className="py-3 px-6 text-right">{t('storage_date_header')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-gray-850">
                    {logs.slice().reverse().map((log) => (
                      <tr key={log.id} className="hover:bg-gray-50/50 dark:hover:bg-[#1e273a]/10 transition-all text-xs">
                        <td className="py-3.5 px-6 font-semibold text-gray-900 dark:text-white">
                          <div className="flex flex-col">
                            <span className="font-medium font-sans">{log.user_email}</span>
                            <span className="text-[10px] text-gray-400 font-mono">ID: {log.user_id.substring(0, 8)}...</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-6">
                          <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            log.action === 'upload' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400' :
                            log.action === 'delete' ? 'bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-400' :
                            log.action === 'profile_update' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400' :
                            'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-400'
                          }`}>
                            {log.action}
                          </span>
                        </td>
                        <td className="py-3.5 px-6 text-gray-500 dark:text-gray-400 font-medium max-w-sm truncate" title={log.details}>
                          {log.details}
                        </td>
                        <td className="py-3.5 px-6 text-right font-mono text-[11px] text-gray-400 dark:text-gray-500">
                          {new Date(log.created_at).toLocaleString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit'
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* RECENT FEED LOGS */}
      {stats && (
        <div id="admin-logs" className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Section: Recent user signups */}
          <div className="bg-white dark:bg-[var(--sl-bg-card)] border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-sm">
            <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2 pb-2 border-b border-gray-50 dark:border-gray-800">
              <Calendar size={14} /> Recent Member Registrations
            </h3>
            {stats.recentUsers.length === 0 ? (
              <p className="text-xs text-gray-400">No recent registrants logged.</p>
            ) : (
              <div className="space-y-3">
                {stats.recentUsers.map((user) => (
                  <div id={`recent-user-${user.id}`} key={user.id} className="flex items-center justify-between text-xs py-1 border-b border-gray-50 dark:border-gray-800/40 last:border-0 pb-2">
                    <span className="font-semibold text-gray-800 dark:text-gray-200">
                      {user.first_name} {user.last_name}
                    </span>
                    <span className="text-gray-400 font-mono">
                      {user.email}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section: Recent global file uploads */}
          <div className="bg-white dark:bg-[var(--sl-bg-card)] border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-sm">
            <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2 pb-2 border-b border-gray-50 dark:border-gray-800">
              <FileSignature size={14} /> Recent Global File Ingress
            </h3>
            {stats.recentUploads.length === 0 ? (
              <p className="text-xs text-gray-400">No uploaded files logged.</p>
            ) : (
              <div className="space-y-3">
                {stats.recentUploads.map((file) => (
                  <div id={`recent-file-${file.id}`} key={file.id} className="flex items-center justify-between text-xs py-1 border-b border-gray-50 dark:border-gray-800/40 last:border-0 pb-2">
                    <span
                      className="font-semibold text-gray-800 dark:text-gray-200 truncate max-w-[180px] hover:text-indigo-500 cursor-pointer"
                      onClick={() => onPreviewFile(file)}
                    >
                      {file.original_name}
                    </span>
                    <span className="text-gray-400 font-mono">
                      {formatSize(file.file_size)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* USER ACTION CONFIRMATION OVERLAY */}
      {targetUser && confirmAction && (
        <div id="user-action-confirm-overlay" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div id="user-action-confirm-card" className="w-full max-w-md bg-white dark:bg-[var(--sl-bg-card)] border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 border-b border-gray-100 dark:border-gray-800 pb-3 text-red-600 dark:text-red-400">
              <AlertTriangle size={24} />
              <h3 className="text-base font-bold font-sans">
                {confirmAction === 'block' && 'Confirm User Suspension'}
                {confirmAction === 'unblock' && 'Confirm User Reinstatement'}
                {confirmAction === 'purge_files' && 'Confirm Mass File Deletion'}
                {confirmAction === 'delete_user' && 'Confirm Profile Deletion'}
              </h3>
            </div>

            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
              {confirmAction === 'block' && (
                <span>
                  Are you sure you want to suspend <strong className="text-gray-900 dark:text-white font-sans">{targetUser.first_name} {targetUser.last_name}</strong>? They will be blocked from logging into the platform immediately.
                </span>
              )}
              {confirmAction === 'unblock' && (
                <span>
                  Are you sure you want to reinstate access for <strong className="text-gray-900 dark:text-white font-sans">{targetUser.first_name} {targetUser.last_name}</strong>?
                </span>
              )}
              {confirmAction === 'purge_files' && (
                <span>
                  Are you sure you want to <strong className="text-red-600 font-semibold font-sans">permanently erase all uploaded files</strong> belonging to <strong className="text-gray-900 dark:text-white font-sans">{targetUser.first_name} {targetUser.last_name}</strong>? This clears disk usage immediately and cannot be undone.
                </span>
              )}
              {confirmAction === 'delete_user' && (
                <span>
                  Are you sure you want to <strong className="text-red-600 font-semibold font-sans">completely delete the account and files</strong> of <strong className="text-gray-900 dark:text-white font-sans">{targetUser.first_name} {targetUser.last_name}</strong>? This profile credential and storage folder will be destroyed permanently.
                </span>
              )}
            </p>

            <div className="flex justify-end gap-3 pt-2">
              <button
                id="cancel-user-action-btn"
                disabled={isProcessing}
                onClick={() => { setTargetUser(null); setConfirmAction(null); }}
                className="px-4 py-2 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#1f293d] rounded-xl text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                id="confirm-user-action-btn"
                disabled={isProcessing}
                onClick={executeUserAction}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold shadow-md cursor-pointer flex items-center gap-1.5"
              >
                {isProcessing ? <RefreshCw className="animate-spin" size={14} /> : 'Proceed with Action'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FILE ACTION CONFIRMATION OVERLAY */}
      {targetFile && (
        <div id="file-action-confirm-overlay" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div id="file-action-confirm-card" className="w-full max-w-md bg-white dark:bg-[var(--sl-bg-card)] border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 border-b border-gray-100 dark:border-gray-800 pb-3 text-red-600 dark:text-red-400">
              <AlertTriangle size={24} />
              <h3 className="text-base font-bold font-sans">Forced Content Purge</h3>
            </div>

            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
              Are you sure you want to enforce global deletion of <strong className="text-gray-900 dark:text-white font-sans">{targetFile.original_name}</strong>? This file will be destroyed from the user storage and database records instantly.
            </p>

            <div className="flex justify-end gap-3 pt-2">
              <button
                id="cancel-file-purge-btn"
                disabled={isProcessing}
                onClick={() => setTargetFile(null)}
                className="px-4 py-2 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#1f293d] rounded-xl text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                id="confirm-file-purge-btn"
                disabled={isProcessing}
                onClick={executeFileDelete}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold shadow-md cursor-pointer flex items-center gap-1.5"
              >
                {isProcessing ? <RefreshCw className="animate-spin" size={14} /> : 'Purge Content'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
