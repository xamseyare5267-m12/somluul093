import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  FileText, Image, Video, HardDrive, Search, Filter, ArrowUpDown,
  Plus, Eye, Download, Trash2, ChevronLeft, ChevronRight, AlertTriangle, File, HelpCircle, RefreshCw,
  History, Clock, ShieldCheck
} from 'lucide-react';
import { DragDropUpload } from './DragDropUpload';
import { FileMetadata, UserStats, ActivityLog } from '../types';
import { useLanguage } from './LanguageContext';

interface UserDashboardProps {
  authToken: string;
  onPreviewFile: (file: FileMetadata) => void;
  onDownloadFile: (file: FileMetadata) => void;
  onShowToast: (message: string, type: 'success' | 'error') => void;
}

export const UserDashboard: React.FC<UserDashboardProps> = ({
  authToken,
  onPreviewFile,
  onDownloadFile,
  onShowToast,
}) => {
  const { t } = useLanguage();
  // Stats
  const [stats, setStats] = useState<UserStats | null>(null);
  
  // Tabs: files or logs
  const [activeSubTab, setActiveSubTab] = useState<'files' | 'logs'>('files');
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [isLogsLoading, setIsLogsLoading] = useState(false);

  // File Listing State
  const [files, setFiles] = useState<FileMetadata[]>([]);
  const [totalFilesCount, setTotalFilesCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  // Filters & Controls
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('date_desc');
  const [category, setCategory] = useState<'all' | 'image' | 'video' | 'document'>('all');
  const [showUploadModal, setShowUploadModal] = useState(false);

  // Deletion Confirmation Modal
  const [fileToDelete, setFileToDelete] = useState<FileMetadata | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchStats = async () => {
    try {
      const response = await axios.get('/api/files/stats', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      setStats(response.data.stats);
    } catch (err) {
      console.error('Error fetching dashboard statistics', err);
    }
  };

  const fetchLogs = async () => {
    setIsLogsLoading(true);
    try {
      const response = await axios.get('/api/logs', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      setLogs(response.data);
    } catch (err) {
      console.error('Error fetching activity logs', err);
    } finally {
      setIsLogsLoading(false);
    }
  };

  const fetchFiles = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get('/api/files', {
        headers: { Authorization: `Bearer ${authToken}` },
        params: {
          search,
          sort,
          page: currentPage,
          limit: 8,
        },
      });

      let loadedFiles: FileMetadata[] = response.data.data;

      // Category filter on the client-side to ensure seamless, lightning-fast transitions
      if (category !== 'all') {
        if (category === 'image') {
          loadedFiles = loadedFiles.filter(f => f.mime_type.startsWith('image/'));
        } else if (category === 'video') {
          loadedFiles = loadedFiles.filter(f => f.mime_type.startsWith('video/'));
        } else if (category === 'document') {
          loadedFiles = loadedFiles.filter(f => !f.mime_type.startsWith('image/') && !f.mime_type.startsWith('video/'));
        }
      }

      setFiles(loadedFiles);
      setTotalFilesCount(response.data.total);
      setTotalPages(response.data.totalPages);
    } catch (err) {
      console.error('Error fetching user files', err);
      onShowToast('Could not reload your file system. Please refresh.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Trigger loading files, stats, and logs
  useEffect(() => {
    fetchStats();
    if (activeSubTab === 'files') {
      fetchFiles();
    } else {
      fetchLogs();
    }
  }, [search, sort, category, currentPage, activeSubTab]);

  const handleUploadComplete = () => {
    fetchStats();
    fetchFiles();
    fetchLogs();
  };

  const handleDeleteTrigger = (file: FileMetadata) => {
    setFileToDelete(file);
  };

  const executeDelete = async () => {
    if (!fileToDelete) return;

    setIsDeleting(true);
    try {
      await axios.delete(`/api/files/${fileToDelete.id}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      onShowToast('File deleted successfully.', 'success');
      setFileToDelete(null);
      fetchStats();
      fetchFiles();
      fetchLogs();
    } catch (err: any) {
      const errMsg = err.response?.data?.error || 'Failed to delete file.';
      onShowToast(errMsg, 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  // Helper formats
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

  const getFileIcon = (mime: string) => {
    if (mime.startsWith('image/')) return <Image className="text-emerald-500" size={20} />;
    if (mime.startsWith('video/')) return <Video className="text-purple-500" size={20} />;
    if (mime === 'application/pdf') return <FileText className="text-red-500" size={20} />;
    return <File className="text-indigo-500" size={20} />;
  };

  return (
    <div id="user-dashboard-root" className="space-y-8 fade-in-up">
      {/* Top Banner section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white font-sans">
            {t('storage_personal_title')}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {t('storage_personal_desc')}
          </p>
        </div>
        <button
          id="open-upload-modal-btn"
          onClick={() => setShowUploadModal(!showUploadModal)}
          className="flex items-center justify-center gap-2 bg-[var(--somluul-primary)] hover:brightness-110 text-white px-4 py-2.5 rounded-xl text-sm font-semibold shadow-lg shadow-blue-500/15 shrink-0 transition-all cursor-pointer"
        >
          <Plus size={18} />
          {showUploadModal ? t('storage_collapse_btn') : t('storage_upload_btn')}
        </button>
      </div>

      {/* DRIVE AND LOGS SUB-TABS */}
      <div className="flex border-b border-gray-200 dark:border-gray-800 pb-px">
        <button
          id="subtab-files-btn"
          onClick={() => setActiveSubTab('files')}
          className={`flex items-center gap-2 px-6 py-3 border-b-2 text-sm font-semibold transition-all cursor-pointer ${
            activeSubTab === 'files'
              ? 'border-[var(--somluul-primary)] text-indigo-600 dark:border-indigo-500 dark:text-indigo-400 font-bold'
              : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <HardDrive size={16} />
          <span>{t('storage_my_files')}</span>
        </button>
        <button
          id="subtab-logs-btn"
          onClick={() => setActiveSubTab('logs')}
          className={`flex items-center gap-2 px-6 py-3 border-b-2 text-sm font-semibold transition-all cursor-pointer ${
            activeSubTab === 'logs'
              ? 'border-[var(--somluul-primary)] text-indigo-600 dark:border-indigo-500 dark:text-indigo-400 font-bold'
              : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <History size={16} />
          <span>{t('storage_activity_logs')}</span>
        </button>
      </div>

      {activeSubTab === 'files' ? (
        <>
          {/* Upload Zone (Expandable) */}
          {showUploadModal && (
            <div id="upload-panel" className="bg-white dark:bg-[var(--sl-bg-card)] border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-sm transition-all">
              <div className="flex items-center justify-between mb-4 border-b border-gray-100 dark:border-gray-800 pb-3">
                <h2 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t('storage_dropbox_uploader')}
                </h2>
                <button
                  id="close-upload-panel-btn"
                  onClick={() => setShowUploadModal(false)}
                  className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  {t('storage_cancel')}
                </button>
              </div>
              <DragDropUpload
                authToken={authToken}
                onUploadSuccess={handleUploadComplete}
                onShowToast={onShowToast}
              />
            </div>
          )}

          {/* METRIC CARD BAR */}
          <div id="metric-cards" className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Card: Total Storage */}
            <div className="bg-white dark:bg-[var(--sl-bg-card)] border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-sm transition-colors duration-300">
              <div className="flex items-center justify-between gap-2 text-gray-400">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">{t('storage_used_label')}</span>
                <HardDrive size={18} className="text-indigo-500 shrink-0" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold font-mono text-gray-900 dark:text-white mt-3">
                {stats ? formatSize(stats.totalSize) : '0 B'}
              </h2>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">of 5.0 GB limit (Free)</p>
            </div>

            {/* Card: Total Files */}
            <div className="bg-white dark:bg-[var(--sl-bg-card)] border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-sm transition-colors duration-300">
              <div className="flex items-center justify-between gap-2 text-gray-400">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">{t('storage_total_files_label')}</span>
                <File size={18} className="text-gray-500 shrink-0" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold font-mono text-gray-900 dark:text-white mt-3">
                {stats ? stats.totalFiles : 0}
              </h2>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">all formats combined</p>
            </div>

            {/* Card: Images count */}
            <div className="bg-white dark:bg-[var(--sl-bg-card)] border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-sm transition-colors duration-300">
              <div className="flex items-center justify-between gap-2 text-gray-400">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">{t('storage_images_label')}</span>
                <Image size={18} className="text-emerald-500 shrink-0" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold font-mono text-gray-900 dark:text-white mt-3">
                {stats ? stats.imagesCount : 0}
              </h2>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">PNG, JPG, WEBP, GIF</p>
            </div>

            {/* Card: Videos count */}
            <div className="bg-white dark:bg-[var(--sl-bg-card)] border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-sm transition-colors duration-300">
              <div className="flex items-center justify-between gap-2 text-gray-400">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">{t('storage_videos_label')}</span>
                <Video size={18} className="text-purple-500 shrink-0" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold font-mono text-gray-900 dark:text-white mt-3">
                {stats ? stats.videosCount : 0}
              </h2>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">MP4 clips</p>
            </div>

            {/* Card: Documents count */}
            <div className="bg-white dark:bg-[var(--sl-bg-card)] border border-gray-200 dark:border-gray-800 rounded-2xl p-5 col-span-2 lg:col-span-1 shadow-sm transition-colors duration-300">
              <div className="flex items-center justify-between gap-2 text-gray-400">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">{t('storage_documents_label')}</span>
                <FileText size={18} className="text-red-500 shrink-0" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold font-mono text-gray-900 dark:text-white mt-3">
                {stats ? stats.documentsCount : 0}
              </h2>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">PDF, DOCX formats</p>
            </div>
          </div>

          {/* FILTER & EXPLORER HEADER */}
          <div id="explorer-section" className="bg-white dark:bg-[var(--sl-bg-card)] border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm overflow-hidden transition-colors duration-300">
            {/* Filter bar */}
            <div className="p-4 sm:p-5 border-b border-gray-100 dark:border-gray-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3.5 top-3 text-gray-400 dark:text-gray-500" size={18} />
                <input
                  id="search-files"
                  type="text"
                  placeholder={t('storage_search_placeholder')}
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-[var(--sl-bg-muted)] border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                />
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {/* Category selection Tabs */}
                <div className="flex bg-gray-50 dark:bg-[var(--sl-bg-muted)] p-1 rounded-xl border border-gray-200 dark:border-gray-700">
                  <button
                    id="filter-cat-all"
                    onClick={() => { setCategory('all'); setCurrentPage(1); }}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                      category === 'all'
                        ? 'bg-white dark:bg-[var(--sl-bg-card)] text-gray-900 dark:text-white shadow-sm'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    {t('storage_cat_all')}
                  </button>
                  <button
                    id="filter-cat-image"
                    onClick={() => { setCategory('image'); setCurrentPage(1); }}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                      category === 'image'
                        ? 'bg-white dark:bg-[var(--sl-bg-card)] text-gray-900 dark:text-white shadow-sm'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    {t('storage_cat_images')}
                  </button>
                  <button
                    id="filter-cat-document"
                    onClick={() => { setCategory('document'); setCurrentPage(1); }}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                      category === 'document'
                        ? 'bg-white dark:bg-[var(--sl-bg-card)] text-gray-900 dark:text-white shadow-sm'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    {t('storage_cat_docs')}
                  </button>
                  <button
                    id="filter-cat-video"
                    onClick={() => { setCategory('video'); setCurrentPage(1); }}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                      category === 'video'
                        ? 'bg-white dark:bg-[var(--sl-bg-card)] text-gray-900 dark:text-white shadow-sm'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    {t('storage_cat_videos')}
                  </button>
                </div>

                {/* Sort Selection */}
                <div className="flex items-center gap-1.5 bg-gray-50 dark:bg-[var(--sl-bg-muted)] px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-xs">
                  <ArrowUpDown size={14} className="text-gray-400" />
                  <select
                    id="sort-files"
                    className="bg-transparent border-none text-gray-700 dark:text-gray-300 focus:outline-none font-semibold cursor-pointer"
                    value={sort}
                    onChange={(e) => { setSort(e.target.value); setCurrentPage(1); }}
                  >
                    <option value="date_desc" className="bg-white dark:bg-[var(--sl-bg-muted)]">{t('storage_sort_newest')}</option>
                    <option value="date_asc" className="bg-white dark:bg-[var(--sl-bg-muted)]">{t('storage_sort_oldest')}</option>
                    <option value="name_asc" className="bg-white dark:bg-[var(--sl-bg-muted)]">{t('storage_sort_name_asc')}</option>
                    <option value="name_desc" className="bg-white dark:bg-[var(--sl-bg-muted)]">{t('storage_sort_name_desc')}</option>
                    <option value="size_desc" className="bg-white dark:bg-[var(--sl-bg-muted)]">{t('storage_sort_size_desc')}</option>
                    <option value="size_asc" className="bg-white dark:bg-[var(--sl-bg-muted)]">{t('storage_sort_size_asc')}</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Files Grid */}
            <div className="p-5">
              {isLoading ? (
                /* Skeleton State */
                <div id="explorer-loading" className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="border border-gray-100 dark:border-gray-800 rounded-2xl p-4 space-y-3 animate-pulse bg-gray-50/50 dark:bg-[#1d273a]/20">
                      <div className="w-10 h-10 bg-gray-200 dark:bg-gray-800 rounded-xl" />
                      <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-3/4" />
                      <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded w-1/2" />
                    </div>
                  ))}
                </div>
              ) : files.length === 0 ? (
                /* Empty State */
                <div id="explorer-empty" className="py-16 text-center">
                  <div className="w-16 h-16 bg-gray-50 dark:bg-[var(--sl-bg-muted)] rounded-2xl flex items-center justify-center text-gray-400 mx-auto mb-4 border border-gray-100 dark:border-gray-800">
                    <HelpCircle size={28} />
                  </div>
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white font-sans">
                    {t('storage_no_files')}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-xs mx-auto">
                    {search ? t('storage_no_files_desc') : 'Drag and drop files to start building your secure cloud drive.'}
                  </p>
                </div>
              ) : (
                /* Main Grid cards list */
                <div id="explorer-grid" className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {files.map((file) => (
                    <div
                      id={`file-card-${file.id}`}
                      key={file.id}
                      className="group relative border border-gray-200 dark:border-gray-800 rounded-2xl p-4 bg-white hover:bg-gray-50/50 dark:bg-[var(--sl-bg-card)] dark:hover:bg-[#1e273a]/50 transition-all duration-200 shadow-sm flex flex-col justify-between"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl group-hover:bg-indigo-50 dark:group-hover:bg-blue-950/40 transition-colors">
                          {getFileIcon(file.mime_type)}
                        </div>

                        {/* Quick action buttons overlay */}
                        <div className="flex gap-1 bg-white/90 dark:bg-[var(--sl-bg-card)]/90 backdrop-blur-sm border border-gray-100 dark:border-gray-800 rounded-lg p-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                          <button
                            id={`file-preview-${file.id}`}
                            onClick={() => onPreviewFile(file)}
                            className="p-1.5 text-gray-500 hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md cursor-pointer"
                            title="Preview"
                          >
                            <Eye size={14} />
                          </button>
                          <button
                            id={`file-download-${file.id}`}
                            onClick={() => onDownloadFile(file)}
                            className="p-1.5 text-gray-500 hover:text-emerald-600 dark:text-gray-400 dark:hover:text-emerald-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md cursor-pointer"
                            title="Download"
                          >
                            <Download size={14} />
                          </button>
                          <button
                            id={`file-delete-${file.id}`}
                            onClick={() => handleDeleteTrigger(file)}
                            className="p-1.5 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>

                      <div>
                        <h4
                          className="text-sm font-semibold text-gray-900 dark:text-white truncate cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400 font-sans"
                          onClick={() => onPreviewFile(file)}
                          title={file.original_name}
                        >
                          {file.original_name}
                        </h4>
                        <div className="flex justify-between text-xs text-gray-400 dark:text-gray-500 font-mono mt-1.5">
                          <span>{formatSize(file.file_size)}</span>
                          <span>{formatDate(file.created_at)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Explorer Pagination Footer */}
            {files.length > 0 && totalPages > 1 && (
              <div id="explorer-pagination" className="px-5 py-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
                <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                  {t('storage_showing_page')} <strong className="text-gray-900 dark:text-white font-mono">{currentPage}</strong> {t('storage_page_of')} <strong className="text-gray-900 dark:text-white font-mono">{totalPages}</strong>
                </span>

                <div className="flex gap-2">
                  <button
                    id="prev-page-btn"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    className="p-2 border border-gray-200 dark:border-gray-700 text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg disabled:opacity-40 transition-colors cursor-pointer"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    id="next-page-btn"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    className="p-2 border border-gray-200 dark:border-gray-700 text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg disabled:opacity-40 transition-colors cursor-pointer"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      ) : (
        /* ACTIVITY LOGS TAB */
        <div id="logs-panel" className="bg-white dark:bg-[var(--sl-bg-card)] border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm overflow-hidden transition-all p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-150 dark:border-gray-800 pb-5 mb-5">
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white font-sans flex items-center gap-2">
                <History className="text-indigo-500" size={20} />
                <span>{t('storage_activity_history')}</span>
              </h2>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                {t('storage_activity_desc')}
              </p>
            </div>
            <button
              onClick={fetchLogs}
              disabled={isLogsLoading}
              className="flex items-center gap-2 px-3 py-1.5 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl text-xs font-semibold text-gray-600 dark:text-gray-300 transition-colors disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw size={14} className={isLogsLoading ? "animate-spin" : ""} />
              {t('storage_refresh_btn')}
            </button>
          </div>

          {isLogsLoading ? (
            <div className="py-12 flex flex-col items-center justify-center text-gray-400 space-y-2">
              <RefreshCw className="animate-spin text-indigo-500" size={28} />
              <p className="text-xs font-medium">{t('storage_loading_history')}</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="py-16 text-center">
              <div className="w-16 h-16 bg-gray-50 dark:bg-[var(--sl-bg-muted)] rounded-2xl flex items-center justify-center text-gray-400 mx-auto mb-4 border border-gray-100 dark:border-gray-800">
                <Clock size={28} />
              </div>
              <h3 className="text-base font-semibold text-gray-900 dark:text-white font-sans">
                {t('storage_no_activity')}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-xs mx-auto">
                {t('storage_no_activity_desc')}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-800 text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider font-mono">
                    <th className="py-3 px-4">{t('storage_action_header')}</th>
                    <th className="py-3 px-4">{t('storage_details_header')}</th>
                    <th className="py-3 px-4 text-right">{t('storage_date_header')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-850">
                  {logs.slice().reverse().map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50/50 dark:hover:bg-[#1e273a]/20 transition-all text-sm">
                      <td className="py-4 px-4 font-medium text-gray-900 dark:text-white">
                        <div className="flex items-center gap-3">
                          <span className={`p-2 rounded-xl flex items-center justify-center ${
                            log.action === 'upload' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400' :
                            log.action === 'delete' ? 'bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400' :
                            log.action === 'profile_update' ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400' :
                            'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/30 dark:text-indigo-400'
                          }`}>
                            {log.action === 'upload' && <Plus size={16} />}
                            {log.action === 'delete' && <Trash2 size={16} />}
                            {log.action === 'profile_update' && <ShieldCheck size={16} />}
                            {log.action !== 'upload' && log.action !== 'delete' && log.action !== 'profile_update' && <History size={16} />}
                          </span>
                          <span className="capitalize font-semibold tracking-wide font-sans">
                            {log.action === 'upload' && t('storage_action_upload')}
                            {log.action === 'delete' && t('storage_action_delete')}
                            {log.action === 'profile_update' && t('storage_action_profile')}
                            {log.action !== 'upload' && log.action !== 'delete' && log.action !== 'profile_update' && log.action}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-gray-500 dark:text-gray-400 font-medium font-sans">
                        {log.details}
                      </td>
                      <td className="py-4 px-4 text-right font-mono text-xs text-gray-400 dark:text-gray-500">
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

      {/* CONFIRMATION DELETION MODAL */}
      {fileToDelete && (
        <div id="delete-confirm-overlay" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div id="delete-confirm-card" className="w-full max-w-md bg-white dark:bg-[var(--sl-bg-card)] border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 border-b border-gray-100 dark:border-gray-800 pb-3 text-red-600 dark:text-red-400">
              <AlertTriangle size={24} />
              <h3 className="text-base font-bold font-sans">{t('storage_confirm_delete')}</h3>
            </div>
            
            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
              {t('storage_delete_warning')} (<strong className="text-gray-900 dark:text-white font-sans">{fileToDelete.original_name}</strong>)
            </p>

            <div className="flex justify-end gap-3 pt-2">
              <button
                id="cancel-delete-btn"
                disabled={isDeleting}
                onClick={() => setFileToDelete(null)}
                className="px-4 py-2 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#1f293d] rounded-xl text-xs font-semibold cursor-pointer"
              >
                {t('storage_cancel')}
              </button>
              <button
                id="confirm-delete-btn"
                disabled={isDeleting}
                onClick={executeDelete}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-red-500/15 cursor-pointer flex items-center gap-1.5"
              >
                {isDeleting ? <RefreshCw className="animate-spin" size={14} /> : t('storage_delete_permanently')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
