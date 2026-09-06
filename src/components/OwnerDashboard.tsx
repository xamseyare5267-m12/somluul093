import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { AppLogo } from './AppLogo';
import {
  Users, Shield, ShieldAlert, Ban, UserCheck, Trash2, Megaphone, Bell, MessageSquare,
  PhoneCall, AlertTriangle, BarChart3, DollarSign, Activity, HardDrive, Database, Key,
  Sliders, Settings, Flag, AlertCircle, RefreshCw, Globe, Palette, FileText, CheckCircle2,
  Lock, Eye, Server, RefreshCw as RefreshIcon, Save, Play, Power, ShieldCheck, Mail, Send, LogOut,
  Printer, Link, Plus, Image
} from 'lucide-react';

interface OwnerDashboardProps {
  authToken?: string;
  onLogout: () => void;
  onShowToast: (message: string, type: 'success' | 'error') => void;
}

export const OwnerDashboard: React.FC<OwnerDashboardProps> = ({
  authToken,
  onLogout,
  onShowToast
}) => {
  const api = {
    get: (url: string, extraConfig = {}) => axios.get(url, { ...extraConfig, headers: { Authorization: `Bearer ${authToken}`, ...((extraConfig as any).headers || {}) } }),
    post: (url: string, data?: any, extraConfig = {}) => axios.post(url, data, { ...extraConfig, headers: { Authorization: `Bearer ${authToken}`, ...((extraConfig as any).headers || {}) } }),
    delete: (url: string, extraConfig = {}) => axios.delete(url, { ...extraConfig, headers: { Authorization: `Bearer ${authToken}`, ...((extraConfig as any).headers || {}) } }),
  };

  const [activeSubTab, setActiveSubTab] = useState<'analytics' | 'users' | 'communication' | 'safety' | 'config' | 'infra' | 'printer' | 'web_owner'>('analytics');
  
  // Printer Management states
  const [printerConfig, setPrinterConfig] = useState({
    ip: '',
    port: 9100,
    whatsappToken: '',
    whatsappPhoneId: '',
    telegramToken: '',
    telegramChatId: '',
    facebookPageToken: '',
    facebookPageId: ''
  });
  const [printerAlerts, setPrinterAlerts] = useState<any[]>([]);
  const [printerLogs, setPrinterLogs] = useState<any[]>([]);
  const [testText, setTestText] = useState('Daabacaad Tijaabo ah oo ka timid SomLuul.\nMaareynta network printer-ka iyo socket printing!\n');
  const [isCheckingConnection, setIsCheckingConnection] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'unchecked' | 'online' | 'offline'>('unchecked');

  // Real stats state
  const [systemStats, setSystemStats] = useState({
    totalUsers: 142,
    adminsCount: 3,
    modsCount: 5,
    bannedCount: 2,
    groupsCount: 12,
    channelsCount: 8,
    activeCalls: 3,
    activeChats: 24,
    revenue: 5420,
    subscribers: 48,
    serverCPU: 14,
    serverRAM: 42,
    dbConnections: 8,
    storageUsed: 2.4, // GB
    maintenanceMode: false,
    forceUpdateActive: false,
    geminiKeyConfigured: false,
    supabaseConfigured: false
  });

  // User moderation
  const [users, setUsers] = useState<any[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [userFilter, setUserFilter] = useState<'all' | 'admin' | 'moderator' | 'normal'>('all');
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);

  // System notice / broadcast states
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcastTarget, setBroadcastTarget] = useState<'all' | 'admins' | 'moderators'>('all');
  const [pushTitle, setPushTitle] = useState('');
  const [pushBody, setPushBody] = useState('');

  // Remote config state
  const [remoteConfig, setRemoteConfig] = useState({
    secretClickTarget: 7,
    dotClickTarget: 30,
    editClickTarget: 5,
    invisibleAreaLocation: 'left-of-logo',
    dotLocation: 'top-right',
    appName: 'SomLuul',
    appLogo: '/somluul_logo.png'
  });

  // Feature flags
  const [featureFlags, setFeatureFlags] = useState({
    enableAiModeration: true,
    enableSpamDetection: true,
    enableAbuseDetection: true,
    enableVideoCalls: true,
    enablePaidSubscriptions: true,
    enableContentSafety: true
  });

  // Logs
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [securityLogs, setSecurityLogs] = useState<any[]>([]);

  // Web Landing + Design (real owner controls — no fake placeholders)
  const [landingSettings, setLandingSettings] = useState({
    heroTitle: "The Future of Social Media is Here",
    heroSubtext: "Connect with the world, chat, call, create content, earn money, grow your community, and build your business—all inside SomLuul.",
    heroImages: [] as string[],
    customLinks: [] as { id: string; label: string; url: string }[],
    longDescription: "",
    primaryColor: "#4f46e5",
    accentColor: "#42b72a",
    backgroundStyle: "default",
    footerText: "© SomLuul. All rights reserved.",
    siteTagline: "Social Multi-App",
    allowPublicSignup: true,
    maxPostImageMB: 10,
    maxPostVideoMB: 1024,
    maxImagesPerPost: 10,
    maxPostTextLength: 63206
  });
  const [isUploading, setIsUploading] = useState(false);
  const [newLinkLabel, setNewLinkLabel] = useState('');
  const [newLinkUrl, setNewLinkUrl] = useState('');

  const fetchLandingSettings = async () => {
    try {
      const res = await axios.get('/api/landing-settings');
      if (res.data) {
        setLandingSettings({
          heroTitle: res.data.heroTitle || '',
          heroSubtext: res.data.heroSubtext || '',
          heroImages: res.data.heroImages || [],
          customLinks: res.data.customLinks || [],
          longDescription: res.data.longDescription || '',
          primaryColor: res.data.primaryColor || '#4f46e5',
          accentColor: res.data.accentColor || '#42b72a',
          backgroundStyle: res.data.backgroundStyle || 'default',
          footerText: res.data.footerText || '© SomLuul. All rights reserved.',
          siteTagline: res.data.siteTagline || 'Social Multi-App',
          allowPublicSignup: res.data.allowPublicSignup !== false,
          maxPostImageMB: res.data.maxPostImageMB ?? 10,
          maxPostVideoMB: res.data.maxPostVideoMB ?? 1024,
          maxImagesPerPost: res.data.maxImagesPerPost ?? 10,
          maxPostTextLength: res.data.maxPostTextLength ?? 63206
        });
      }
    } catch (e) {
      console.warn('Failed to load landing settings in owner dashboard:', e);
    }
  };

  const handleUploadImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('image', file);

    setIsUploading(true);
    try {
      const res = await axios.post('/api/owner/upload-landing-image', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${authToken}`
        }
      });
      if (res.data.success && res.data.url) {
        setLandingSettings(prev => ({
          ...prev,
          heroImages: [...prev.heroImages, res.data.url]
        }));
        onShowToast('Sawirka waa la soo galiyay si guul leh!', 'success');
      } else {
        onShowToast('Cilad ayaa dhacday intii la soo galinayay sawirka.', 'error');
      }
    } catch (err: any) {
      onShowToast(err.response?.data?.error || 'Ma dhici karto in la soo galiyo sawirka.', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  // Fetch initial owner configuration & stats
  const fetchOwnerData = async () => {
    try {
      const statsRes = await api.get('/api/owner/stats');
      setSystemStats(statsRes.data);
      
      const configRes = await api.get('/api/remote-config');
      setRemoteConfig(configRes.data);
      
      const flagsRes = await api.get('/api/owner/feature-flags');
      setFeatureFlags(flagsRes.data);
      
      const logsRes = await api.get('/api/owner/logs');
      setAuditLogs(logsRes.data.auditLogs || []);
      setSecurityLogs(logsRes.data.securityLogs || []);

      // Fetch landing page settings
      fetchLandingSettings();
    } catch (e) {
      console.warn('Error pre-fetching owner configuration:', e);
    }
  };

  const fetchPrinterData = async () => {
    try {
      const res = await api.get('/api/owner/printer/config');
      if (res.data) {
        setPrinterConfig(res.data.config || { ip: '', port: 9100 });
        setPrinterAlerts(res.data.alerts || []);
        setPrinterLogs(res.data.logs || []);
      }
    } catch (e) {
      console.warn('Failed to load printer data:', e);
    }
  };

  const fetchUsersList = async () => {
    setIsLoadingUsers(true);
    try {
      const res = await api.get('/api/owner/users');
      setUsers(res.data.users || []);
    } catch (err) {
      onShowToast('Could not fetch user list.', 'error');
    } finally {
      setIsLoadingUsers(false);
    }
  };

  useEffect(() => {
    fetchOwnerData();
    fetchUsersList();
    fetchPrinterData();
    
    // Refresh real stats + printer from server (no random fake gauges)
    const interval = setInterval(() => {
      fetchOwnerData();
      fetchPrinterData();
    }, 8000);

    return () => clearInterval(interval);
  }, []);

  // API calls for moderation
  const handleToggleUserBan = async (userId: string) => {
    try {
      const res = await api.post(`/api/owner/users/${userId}/toggle-ban`);
      onShowToast(res.data.message, 'success');
      fetchUsersList();
      fetchOwnerData();
    } catch (e) {
      onShowToast('Operation failed.', 'error');
    }
  };

  const handleToggleUserVerification = async (userId: string) => {
    try {
      const res = await api.post(`/api/owner/users/${userId}/toggle-verify`);
      onShowToast(res.data.message, 'success');
      fetchUsersList();
    } catch (e) {
      onShowToast('Verification toggle failed.', 'error');
    }
  };

  const handleChangeUserRole = async (userId: string, newRole: string) => {
    try {
      const res = await api.post(`/api/owner/users/${userId}/change-role`, { role: newRole });
      onShowToast(res.data.message, 'success');
      fetchUsersList();
    } catch (e) {
      onShowToast('Failed to change user role.', 'error');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm('Ma ogoshay in aad gebi ahaanba tirtirto isticmaalahan?')) return;
    try {
      const res = await api.delete(`/api/owner/users/${userId}`);
      onShowToast(res.data.message, 'success');
      fetchUsersList();
      fetchOwnerData();
    } catch (e) {
      onShowToast('Failed to delete user.', 'error');
    }
  };

  // Broadcast settings
  const handleSendBroadcast = async () => {
    if (!broadcastMessage.trim()) {
      onShowToast('Fadlan qor fariinta broadcast-ka.', 'error');
      return;
    }
    try {
      const res = await api.post('/api/owner/broadcast', {
        message: broadcastMessage,
        target: broadcastTarget
      });
      onShowToast(res.data.message, 'success');
      setBroadcastMessage('');
      fetchOwnerData();
    } catch (e) {
      onShowToast('Broadcast failed.', 'error');
    }
  };

  const handleSendPushNotification = async () => {
    if (!pushTitle.trim() || !pushBody.trim()) {
      onShowToast('Fadlan buuxi cinwaanka iyo fariinta push notification-ka.', 'error');
      return;
    }
    try {
      const res = await api.post('/api/owner/push-notification', {
        title: pushTitle,
        body: pushBody
      });
      onShowToast(res.data.message, 'success');
      setPushTitle('');
      setPushBody('');
      fetchOwnerData();
    } catch (e) {
      onShowToast('Notification dispatch failed.', 'error');
    }
  };

  // Remote config updates
  const handleSaveRemoteConfig = async () => {
    try {
      const res = await api.post('/api/owner/remote-config', remoteConfig);
      onShowToast(res.data.message, 'success');
      window.dispatchEvent(new Event('remote-config-updated'));
    } catch (e) {
      onShowToast('Failed to update remote configuration.', 'error');
    }
  };

  // Toggle maintenance mode
  const handleToggleMaintenance = async () => {
    try {
      const res = await api.post('/api/owner/toggle-maintenance');
      setSystemStats(prev => ({ ...prev, maintenanceMode: !prev.maintenanceMode }));
      onShowToast(res.data.message, 'success');
    } catch (e) {
      onShowToast('Failed to toggle maintenance mode.', 'error');
    }
  };

  const handleToggleForceUpdate = async () => {
    try {
      const res = await api.post('/api/owner/toggle-force-update');
      setSystemStats(prev => ({ ...prev, forceUpdateActive: !prev.forceUpdateActive }));
      onShowToast(res.data.message, 'success');
    } catch (e) {
      onShowToast('Failed to toggle force update status.', 'error');
    }
  };

  const handleToggleFeatureFlag = async (flagKey: keyof typeof featureFlags) => {
    const updatedFlags = { ...featureFlags, [flagKey]: !featureFlags[flagKey] };
    try {
      const res = await api.post('/api/owner/feature-flags', updatedFlags);
      setFeatureFlags(updatedFlags);
      onShowToast(res.data.message, 'success');
    } catch (e) {
      onShowToast('Failed to update feature flag.', 'error');
    }
  };

  // Filter users list
  const filteredUsers = users.filter(u => {
    const query = userSearch.toLowerCase();
    const matchesSearch = 
      `${u.first_name || ''} ${u.last_name || ''}`.toLowerCase().includes(query) ||
      (u.email || '').toLowerCase().includes(query) ||
      (u.username || '').toLowerCase().includes(query) ||
      (u.phone || '').includes(query);
    
    if (userFilter === 'all') return matchesSearch;
    return matchesSearch && u.role === userFilter;
  });

  return (
    <div id="owner-dashboard-container" className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans antialiased">
      
      {/* Top Header */}
      <header className="bg-slate-950 border-b border-slate-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-600 to-amber-500 p-0.5 flex items-center justify-center">
            <div className="w-full h-full rounded-[10px] bg-slate-950 flex items-center justify-center font-black text-rose-500 text-lg">
              Ω
            </div>
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
              SomLuul Owner Portal
              <span className="text-[10px] font-mono font-bold bg-rose-500/10 text-rose-400 px-2.5 py-0.5 rounded-full border border-rose-500/20 uppercase tracking-widest">
                Owner Mode
              </span>
            </h1>
            <p className="text-xs text-slate-400 font-mono">Enterprise Governance Command Center</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-rose-500/10 text-rose-400 rounded-xl border border-rose-500/20 text-xs font-mono">
            <span className="animate-ping w-2 h-2 rounded-full bg-rose-500"></span>
            SECURE SESSION ACTIVE
          </div>
          <button
            onClick={onLogout}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl text-xs font-bold transition-all border border-slate-700 cursor-pointer"
          >
            <LogOut size={14} />
            Hooray Logout
          </button>
        </div>
      </header>

      {/* Main Layout Grid */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Navigation Sidebar */}
        <aside className="w-64 bg-slate-950 border-r border-slate-800 p-4 flex flex-col justify-between">
          <div className="space-y-1">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-3 mb-2.5 font-mono">Core Command</div>
            
            <button
              onClick={() => setActiveSubTab('analytics')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeSubTab === 'analytics'
                  ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900 border border-transparent'
              }`}
            >
              <BarChart3 size={15} />
              Realtime Analytics
            </button>

            <button
              onClick={() => setActiveSubTab('users')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeSubTab === 'users'
                  ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900 border border-transparent'
              }`}
            >
              <Users size={15} />
              User Directory ({users.length})
            </button>

            <button
              onClick={() => setActiveSubTab('communication')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeSubTab === 'communication'
                  ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900 border border-transparent'
              }`}
            >
              <Megaphone size={15} />
              Mass Communications
            </button>

            <div className="pt-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest px-3 mb-2.5 font-mono">Trust & Safety</div>

            <button
              onClick={() => setActiveSubTab('safety')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeSubTab === 'safety'
                  ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900 border border-transparent'
              }`}
            >
              <ShieldAlert size={15} />
              Security & Spam Logs
            </button>

            <button
              onClick={() => setActiveSubTab('config')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeSubTab === 'config'
                  ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900 border border-transparent'
              }`}
            >
              <Sliders size={15} />
              Remote Config & Flags
            </button>

            <button
              onClick={() => setActiveSubTab('infra')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeSubTab === 'infra'
                  ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900 border border-transparent'
              }`}
            >
              <Server size={15} />
              System Infrastructure
            </button>

            <button
              onClick={() => setActiveSubTab('printer')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeSubTab === 'printer'
                  ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900 border border-transparent'
              }`}
            >
              <Printer size={15} />
              Maareynta Printer-ka
              {printerAlerts.length > 0 && (
                <span className="ml-auto flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveSubTab('web_owner')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeSubTab === 'web_owner'
                  ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900 border border-transparent'
              }`}
            >
              <Globe size={15} />
              Web Owner (Bogga Hore)
            </button>
          </div>

          {/* Quick status box */}
          <div className="bg-slate-900/50 rounded-xl p-3 border border-slate-800 space-y-2 text-[10px] font-mono">
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Server Health</span>
              <span className="text-emerald-400 font-bold">ONLINE</span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-1">
              <div className="bg-emerald-500 h-1 rounded-full w-[95%]"></div>
            </div>
            <div className="flex justify-between items-center pt-1 text-slate-500">
              <span>Database state</span>
              <span className="text-emerald-400">POSTGRES ACTIVE</span>
            </div>
          </div>
        </aside>

        {/* Content Area */}
        <main className="flex-1 p-6 overflow-y-auto bg-slate-900 space-y-6">

          {/* VIEW: REALTIME ANALYTICS */}
          {activeSubTab === 'analytics' && (
            <div className="space-y-6 animate-fade-in">
              <h2 className="text-xl font-bold tracking-tight text-white">System Metrics & Dashboard</h2>
              
              {/* Top Row Stat Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 shadow-sm">
                  <div className="flex items-center justify-between text-slate-500">
                    <span className="text-xs font-bold uppercase tracking-wider font-mono">Total Users</span>
                    <Users size={18} className="text-indigo-500" />
                  </div>
                  <h3 className="text-2xl font-bold font-mono text-white mt-2">{systemStats.totalUsers}</h3>
                  <p className="text-[10px] text-slate-400 mt-1 font-mono">Admins: {systemStats.adminsCount} | Mods: {systemStats.modsCount}</p>
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 shadow-sm">
                  <div className="flex items-center justify-between text-slate-500">
                    <span className="text-xs font-bold uppercase tracking-wider font-mono">Active Streams</span>
                    <PhoneCall size={18} className="text-green-500" />
                  </div>
                  <h3 className="text-2xl font-bold font-mono text-white mt-2">{systemStats.activeCalls} Calls</h3>
                  <p className="text-[10px] text-slate-400 mt-1 font-mono">{systemStats.activeChats} active chat hubs</p>
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 shadow-sm">
                  <div className="flex items-center justify-between text-slate-500">
                    <span className="text-xs font-bold uppercase tracking-wider font-mono">Revenue (Gross)</span>
                    <DollarSign size={18} className="text-yellow-500" />
                  </div>
                  <h3 className="text-2xl font-bold font-mono text-white mt-2">${systemStats.revenue} USD</h3>
                  <p className="text-[10px] text-slate-400 mt-1 font-mono">{systemStats.subscribers} premium subscribers</p>
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 shadow-sm">
                  <div className="flex items-center justify-between text-slate-500">
                    <span className="text-xs font-bold uppercase tracking-wider font-mono">Infrastructure CPU</span>
                    <Activity size={18} className="text-rose-500" />
                  </div>
                  <h3 className="text-2xl font-bold font-mono text-white mt-2">{systemStats.serverCPU}%</h3>
                  <p className="text-[10px] text-slate-400 mt-1 font-mono">RAM Usage: {systemStats.serverRAM}%</p>
                </div>
              </div>

              {/* Graphic Display charts using simple premium styled blocks */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Real platform counters */}
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-white">Platform activity</h4>
                      <p className="text-xs text-slate-400">Live counts from database</p>
                    </div>
                    <span className="text-[10px] font-mono bg-indigo-500/15 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded-full font-bold">LIVE</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                      <p className="text-[10px] text-slate-400">Users</p>
                      <p className="text-xl font-black text-white">{systemStats?.totalUsers ?? 0}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                      <p className="text-[10px] text-slate-400">Chat rooms</p>
                      <p className="text-xl font-black text-white">{systemStats?.activeChats ?? 0}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                      <p className="text-[10px] text-slate-400">Groups</p>
                      <p className="text-xl font-black text-white">{systemStats?.groupsCount ?? 0}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                      <p className="text-[10px] text-slate-400">Revenue (completed)</p>
                      <p className="text-xl font-black text-white">${Number(systemStats?.revenue || 0).toFixed(2)}</p>
                    </div>
                  </div>
                </div>

                {/* System Status Table — real stack */}
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4">
                  <h4 className="text-sm font-bold text-white">Operational health</h4>
                  <div className="space-y-3 font-mono text-xs">
                    <div className="flex justify-between items-center p-2.5 bg-slate-900 rounded-xl border border-slate-800">
                      <span className="text-slate-400">Database (JSON / optional Supabase)</span>
                      <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Active
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-2.5 bg-slate-900 rounded-xl border border-slate-800">
                      <span className="text-slate-400">Server RAM (heap)</span>
                      <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span> {systemStats?.serverRAM ?? 0}%
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-2.5 bg-slate-900 rounded-xl border border-slate-800">
                      <span className="text-slate-400">Storage used</span>
                      <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span> {Number(systemStats?.storageUsed || 0).toFixed(2)} GB
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-2.5 bg-slate-900 rounded-xl border border-slate-800">
                      <span className="text-slate-400">API Gateway Endpoint Status</span>
                      <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span> 200 OK
                      </span>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* VIEW: USER MANAGEMENT */}
          {activeSubTab === 'users' && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-bold tracking-tight text-white">User Administration Center</h2>
                  <p className="text-xs text-slate-400">Control system security, promote administrators, verify or ban profiles.</p>
                </div>
                <button
                  onClick={fetchUsersList}
                  className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl border border-slate-700 transition-all cursor-pointer"
                  title="Refresh User List"
                >
                  <RefreshIcon size={14} className={isLoadingUsers ? 'animate-spin' : ''} />
                </button>
              </div>

              {/* Filtering / Search Bar */}
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  placeholder="Ku raadi magac, gmail, ama telefoon..."
                  className="flex-1 px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-rose-500"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                />
                <select
                  className="px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 font-semibold focus:outline-none focus:ring-1 focus:ring-rose-500 cursor-pointer"
                  value={userFilter}
                  onChange={(e) => setUserFilter(e.target.value as any)}
                >
                  <option value="all">Dhammaan Doorka (All Roles)</option>
                  <option value="admin">Admins</option>
                  <option value="moderator">Moderators</option>
                  <option value="normal">Normal Users</option>
                </select>
              </div>

              {/* Users Moderation Grid Table */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 bg-slate-950 text-[10px] font-bold text-slate-400 uppercase font-mono">
                        <th className="p-4">User</th>
                        <th className="p-4">Doorka (Role)</th>
                        <th className="p-4">Diiwaangelinta (Created)</th>
                        <th className="p-4">Contact Info</th>
                        <th className="p-4">Xaaladda (Status)</th>
                        <th className="p-4 text-right">Maamul (Actions)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 text-xs">
                      {filteredUsers.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-8 text-center text-slate-500">
                            Wax isticmaale ah oo laga helay meeshan ma jiraan.
                          </td>
                        </tr>
                      ) : (
                        filteredUsers.map((u) => (
                          <tr key={u.id} className="hover:bg-slate-900/50 transition-colors">
                            <td className="p-4 flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center font-bold text-slate-200">
                                {u.first_name ? u.first_name[0] : 'U'}
                              </div>
                              <div>
                                <div className="font-bold text-white flex items-center gap-1.5">
                                  {u.first_name} {u.last_name}
                                  {u.email_verified && (
                                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" title="Verified email"></span>
                                  )}
                                </div>
                                <div className="text-[10px] text-slate-400 font-mono">@{u.username || 'no_handle'}</div>
                              </div>
                            </td>
                            <td className="p-4 font-semibold font-mono">
                              <select
                                className="bg-slate-900 border border-slate-800 rounded px-2 py-1 text-[10px] text-slate-200 uppercase cursor-pointer"
                                value={u.role || 'normal'}
                                onChange={(e) => handleChangeUserRole(u.id, e.target.value)}
                              >
                                <option value="normal">User</option>
                                <option value="moderator">Moderator</option>
                                <option value="admin">Admin</option>
                              </select>
                            </td>
                            <td className="p-4 text-slate-400 font-mono text-[10px]">
                              {new Date(u.created_at || Date.now()).toLocaleDateString('so-SO')}
                            </td>
                            <td className="p-4 text-slate-400 font-mono text-[10px]">
                              <div>{u.email}</div>
                              <div>{u.phone || 'N/A'}</div>
                            </td>
                            <td className="p-4">
                              {u.blocked ? (
                                <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-red-500/10 text-red-400 border border-red-500/20 uppercase tracking-widest font-mono">BANNED</span>
                              ) : (
                                <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase tracking-widest font-mono">ACTIVE</span>
                              )}
                            </td>
                            <td className="p-4 text-right space-x-1.5">
                              <button
                                onClick={() => handleToggleUserBan(u.id)}
                                className={`p-1.5 rounded border transition-all cursor-pointer inline-flex items-center gap-1 text-[10px] font-bold uppercase ${
                                  u.blocked
                                    ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/20'
                                    : 'bg-red-500/10 hover:bg-red-500/20 text-red-400 border-red-500/20'
                                }`}
                                title={u.blocked ? 'Unban User' : 'Ban User'}
                              >
                                {u.blocked ? <UserCheck size={12} /> : <Ban size={12} />}
                                {u.blocked ? 'Unban' : 'Ban'}
                              </button>
                              
                              <button
                                onClick={() => handleDeleteUser(u.id)}
                                className="p-1.5 rounded bg-slate-900 hover:bg-red-950 border border-slate-800 hover:border-red-900 text-slate-400 hover:text-red-400 transition-all cursor-pointer inline-flex items-center gap-1 text-[10px]"
                                title="Purge user forever"
                              >
                                <Trash2 size={12} />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* VIEW: MASS COMMUNICATIONS */}
          {activeSubTab === 'communication' && (
            <div className="space-y-6 animate-fade-in">
              <h2 className="text-xl font-bold tracking-tight text-white">Broadcast & Public Relations console</h2>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Broadcast Hub */}
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4">
                  <div className="flex items-center gap-2 text-rose-400">
                    <Megaphone size={16} />
                    <h3 className="font-bold text-white text-sm uppercase tracking-wider font-mono">System-Wide Announcement</h3>
                  </div>
                  <p className="text-xs text-slate-400">
                    Dir fariin ogeysiis ah oo ka soo dhex muuqan doonta dashboard-ka dhammaan isticmaalayaasha nidaamka.
                  </p>
                  
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase font-mono mb-1">Target Group</label>
                      <select
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 cursor-pointer"
                        value={broadcastTarget}
                        onChange={(e) => setBroadcastTarget(e.target.value as any)}
                      >
                        <option value="all">Dhammaan Isticmaalayaasha (All Users)</option>
                        <option value="admins">Keliya Admins (Admins Only)</option>
                        <option value="moderators">Keliya Moderators (Moderators Only)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase font-mono mb-1">Announcement Message</label>
                      <textarea
                        rows={4}
                        placeholder="Qor fariinta broadcast-ka halkan..."
                        className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-rose-500 resize-none font-sans"
                        value={broadcastMessage}
                        onChange={(e) => setBroadcastMessage(e.target.value)}
                      />
                    </div>

                    <button
                      onClick={handleSendBroadcast}
                      className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs shadow transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Send size={14} />
                      Dir Ogeysiiska Broadcast
                    </button>
                  </div>
                </div>

                {/* Push Notification Dispatcher */}
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4">
                  <div className="flex items-center gap-2 text-rose-400">
                    <Bell size={16} />
                    <h3 className="font-bold text-white text-sm uppercase tracking-wider font-mono">Push Notification Dispatcher</h3>
                  </div>
                  <p className="text-xs text-slate-400">
                    Send secure instant push notifications to mobile and web user clients in real-time.
                  </p>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase font-mono mb-1">Notification Title</label>
                      <input
                        type="text"
                        placeholder="Ogeysiis Degdeg ah!"
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-rose-500"
                        value={pushTitle}
                        onChange={(e) => setPushTitle(e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase font-mono mb-1">Notification Body</label>
                      <textarea
                        rows={3}
                        placeholder="Faahfaahinta ogeysiiska rasmiga ah ee telefoonka lagu arki doono..."
                        className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-rose-500 resize-none font-sans"
                        value={pushBody}
                        onChange={(e) => setPushBody(e.target.value)}
                      />
                    </div>

                    <button
                      onClick={handleSendPushNotification}
                      className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs shadow transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Bell size={14} />
                      Send Push Notification
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* VIEW: SECURITY & LOGS */}
          {activeSubTab === 'safety' && (
            <div className="space-y-6 animate-fade-in">
              <h2 className="text-xl font-bold tracking-tight text-white">Trust, Safety & Security Audits</h2>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Security Logs list */}
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="font-bold text-white text-sm uppercase tracking-wider font-mono flex items-center gap-2 text-rose-500">
                      <Lock size={15} /> Security Audits & Intrusion Logs
                    </h3>
                    <span className="text-[10px] font-mono bg-rose-500/10 text-rose-400 border border-rose-500/20 px-2 py-0.5 rounded-full font-bold">ALERTS</span>
                  </div>
                  <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                    {securityLogs.length === 0 ? (
                      <div className="text-center py-8 text-xs text-slate-500">Intrusion detection has registered no severe threats.</div>
                    ) : (
                      securityLogs.map((log, idx) => (
                        <div key={idx} className="p-3 bg-rose-950/20 border border-rose-900/40 rounded-xl text-[11px] font-mono space-y-1">
                          <div className="flex justify-between font-bold text-rose-400">
                            <span>{log.event}</span>
                            <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                          </div>
                          <p className="text-slate-300">{log.details}</p>
                          <div className="text-[9px] text-slate-500">Origin IP: {log.ip_address} | Target: {log.target}</div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Audit Logs list */}
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="font-bold text-white text-sm uppercase tracking-wider font-mono flex items-center gap-2 text-indigo-400">
                      <FileText size={15} /> Administrative Action History
                    </h3>
                    <span className="text-[10px] font-mono bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded-full font-bold">AUDIT</span>
                  </div>
                  <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                    {auditLogs.length === 0 ? (
                      <div className="text-center py-8 text-xs text-slate-500">Administrative activity logging initialized.</div>
                    ) : (
                      auditLogs.map((log, idx) => (
                        <div key={idx} className="p-3 bg-slate-900 border border-slate-800 rounded-xl text-[11px] font-mono space-y-1">
                          <div className="flex justify-between font-bold text-slate-300">
                            <span>{log.actor_name}</span>
                            <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                          </div>
                          <p className="text-slate-400">{log.action_details}</p>
                          <div className="text-[9px] text-slate-500">Role: {log.actor_role}</div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* VIEW: REMOTE CONFIG & FLAGS */}
          {activeSubTab === 'config' && (
            <div className="space-y-6 animate-fade-in">
              <h2 className="text-xl font-bold tracking-tight text-white">System Remote Parameters & Feature Flags</h2>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* App Customization & Identity Card */}
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-white text-sm uppercase tracking-wider font-mono flex items-center gap-2 text-amber-500">
                      <Palette size={15} /> Magaca & Logada App-ka (App Identity)
                    </h3>
                    <button
                      onClick={handleSaveRemoteConfig}
                      className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-[10px] font-bold shadow flex items-center gap-1.5 cursor-pointer"
                    >
                      <Save size={12} /> Keydi Magaca & Logada
                    </button>
                  </div>
                  <p className="text-xs text-slate-400">Halkan ka beddel magaca rasmiga ah ee barnaamijka iyo sawirka logada ee dadka oo dhan u muuqanaya.</p>

                  <div className="space-y-4 text-xs">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase font-mono mb-1">Magaca App-ka (App Name)</label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500/50"
                        value={remoteConfig.appName || 'SomLuul'}
                        onChange={(e) => setRemoteConfig({ ...remoteConfig, appName: e.target.value })}
                        placeholder="Tusaale: SomLuul Pro, Dhambaal, jb."
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase font-mono mb-1">Ciwanka Logada (App Logo URL / Path)</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500/50"
                          value={remoteConfig.appLogo || '/somluul_logo.png'}
                          onChange={(e) => setRemoteConfig({ ...remoteConfig, appLogo: e.target.value })}
                          placeholder="Sawir kasta oo online ah ama path (e.g. /somluul_logo.png)"
                        />
                      </div>
                    </div>

                    {/* Logo Preview */}
                    <div className="p-3 bg-slate-900/40 border border-slate-800/60 rounded-xl flex items-center gap-3">
                      <AppLogo 
                        src={remoteConfig.appLogo} 
                        alt="Branding Preview" 
                        className="w-12 h-12 rounded-xl" 
                      />
                      <div>
                        <div className="text-[11px] font-bold text-white">Muqaalka Logada (Preview)</div>
                        <p className="text-[9px] text-slate-400">Cabbirka saxda ah waa 1:1 (Square). Sawirku wuu is-habayn doonaa.</p>
                      </div>
                    </div>

                    {/* Preset Logos */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase font-mono mb-1.5">Presets diyaar ah</label>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => setRemoteConfig({ ...remoteConfig, appLogo: '/somluul_logo.png' })}
                          className={`px-2.5 py-1.5 rounded-lg border text-[10px] font-bold transition-all ${
                            remoteConfig.appLogo === '/somluul_logo.png'
                              ? 'bg-amber-500/10 text-amber-400 border-amber-500/40'
                              : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                          }`}
                        >
                          Default SomLuul
                        </button>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-1">Ama geli URL logo ah meesha kore, ama soo geli sawir.</p>
                    </div>
                  </div>
                </div>

                {/* Remote configuration parameters */}
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-white text-sm uppercase tracking-wider font-mono flex items-center gap-2 text-rose-500">
                      <Sliders size={15} /> Security Gesture Thresholds
                    </h3>
                    <button
                      onClick={handleSaveRemoteConfig}
                      className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[10px] font-bold shadow flex items-center gap-1.5 cursor-pointer"
                    >
                      <Save size={12} /> Save Config
                    </button>
                  </div>
                  <p className="text-xs text-slate-400">Configure secret entry gestures and interactive dot behavior globally.</p>

                  <div className="space-y-3 text-xs">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase font-mono mb-1">Invisible click target (Clicks count)</label>
                      <input
                        type="number"
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white"
                        value={remoteConfig.secretClickTarget}
                        onChange={(e) => setRemoteConfig({ ...remoteConfig, secretClickTarget: parseInt(e.target.value) })}
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase font-mono mb-1">Secret dot click target (Clicks count)</label>
                      <input
                        type="number"
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white"
                        value={remoteConfig.dotClickTarget}
                        onChange={(e) => setRemoteConfig({ ...remoteConfig, dotClickTarget: parseInt(e.target.value) })}
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase font-mono mb-1">Edit button clicks target</label>
                      <input
                        type="number"
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white"
                        value={remoteConfig.editClickTarget}
                        onChange={(e) => setRemoteConfig({ ...remoteConfig, editClickTarget: parseInt(e.target.value) })}
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase font-mono mb-1">Invisible Area Location</label>
                      <select
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white cursor-pointer"
                        value={remoteConfig.invisibleAreaLocation}
                        onChange={(e) => setRemoteConfig({ ...remoteConfig, invisibleAreaLocation: e.target.value })}
                      >
                        <option value="left-of-logo">Bidixda Logoda (Left of Logo)</option>
                        <option value="right-of-logo">Midigta Logoda (Right of Logo)</option>
                        <option value="bottom-left-card">Geeska Hoose ee Bidix (Bottom-Left Card)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase font-mono mb-1">Dot Location</label>
                      <select
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white cursor-pointer"
                        value={remoteConfig.dotLocation}
                        onChange={(e) => setRemoteConfig({ ...remoteConfig, dotLocation: e.target.value })}
                      >
                        <option value="top-right">Geeska kore ee midig (Top Right Corner)</option>
                        <option value="top-left">Geeska kore ee bidix (Top Left Corner)</option>
                        <option value="bottom-right">Geeska hoose ee midig (Bottom Right Corner)</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Feature flags & System overrides */}
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-5">
                  <h3 className="font-bold text-white text-sm uppercase tracking-wider font-mono flex items-center gap-2 text-rose-500">
                    <Flag size={15} /> System Overrides & Feature Toggles
                  </h3>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3.5 bg-slate-900/50 rounded-xl border border-slate-800">
                      <div>
                        <div className="text-xs font-bold text-white">System Maintenance Mode</div>
                        <p className="text-[10px] text-slate-400">Lock general traffic to show a simple Maintenance message.</p>
                      </div>
                      <button
                        onClick={handleToggleMaintenance}
                        className={`w-12 h-6 rounded-full p-1 transition-all flex items-center cursor-pointer ${
                          systemStats.maintenanceMode ? 'bg-rose-600 justify-end' : 'bg-slate-800 justify-start'
                        }`}
                      >
                        <span className="w-4 h-4 rounded-full bg-white shadow"></span>
                      </button>
                    </div>

                    <div className="flex items-center justify-between p-3.5 bg-slate-900/50 rounded-xl border border-slate-800">
                      <div>
                        <div className="text-xs font-bold text-white">Force Application Update</div>
                        <p className="text-[10px] text-slate-400">Notify app users that a critical upgrade is required.</p>
                      </div>
                      <button
                        onClick={handleToggleForceUpdate}
                        className={`w-12 h-6 rounded-full p-1 transition-all flex items-center cursor-pointer ${
                          systemStats.forceUpdateActive ? 'bg-rose-600 justify-end' : 'bg-slate-800 justify-start'
                        }`}
                      >
                        <span className="w-4 h-4 rounded-full bg-white shadow"></span>
                      </button>
                    </div>

                    <div className="border-t border-slate-800 my-4 pt-4">
                      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 font-mono">Functional Feature Flags</div>
                      
                      <div className="space-y-3">
                        <label className="flex items-center justify-between cursor-pointer select-none">
                          <span className="text-xs text-slate-300">AI automated image and post moderation</span>
                          <input
                            type="checkbox"
                            className="rounded bg-slate-900 border-slate-800 text-rose-500"
                            checked={featureFlags.enableAiModeration}
                            onChange={() => handleToggleFeatureFlag('enableAiModeration')}
                          />
                        </label>
                        <label className="flex items-center justify-between cursor-pointer select-none">
                          <span className="text-xs text-slate-300">Content Safety — mamnuuc nude/sex/porn posts & uploads</span>
                          <input
                            type="checkbox"
                            className="rounded bg-slate-900 border-slate-800 text-rose-500"
                            checked={featureFlags.enableContentSafety !== false}
                            onChange={() => handleToggleFeatureFlag('enableContentSafety')}
                          />
                        </label>
                        <label className="flex items-center justify-between cursor-pointer select-none">
                          <span className="text-xs text-slate-300">Active real-time Spam prevention algorithms</span>
                          <input
                            type="checkbox"
                            className="rounded bg-slate-900 border-slate-800 text-rose-500"
                            checked={featureFlags.enableSpamDetection}
                            onChange={() => handleToggleFeatureFlag('enableSpamDetection')}
                          />
                        </label>
                        <label className="flex items-center justify-between cursor-pointer select-none">
                          <span className="text-xs text-slate-300">Direct active video call signaling systems</span>
                          <input
                            type="checkbox"
                            className="rounded bg-slate-900 border-slate-800 text-rose-500"
                            checked={featureFlags.enableVideoCalls}
                            onChange={() => handleToggleFeatureFlag('enableVideoCalls')}
                          />
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* VIEW: INFRASTRUCTURE & BACKUP */}
          {activeSubTab === 'infra' && (
            <div className="space-y-6 animate-fade-in">
              <h2 className="text-xl font-bold tracking-tight text-white">Server Infrastructure & Cloud Assets</h2>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Database state diagnostics */}
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4 col-span-2">
                  <h3 className="font-bold text-white text-sm uppercase tracking-wider font-mono flex items-center gap-2 text-rose-500">
                    <Database size={15} /> Database Cluster Control
                  </h3>
                  <p className="text-xs text-slate-400">Perform standard storage optimization, vacuum tables, and dispatch migrations.</p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-2">
                      <div className="text-xs font-bold text-white">Database Backup & Archive</div>
                      <p className="text-[10px] text-slate-400">Save a complete raw binary snapshot of the system state locally.</p>
                      <button
                        onClick={async () => {
                          try {
                            const res = await api.post('/api/owner/backup');
                            onShowToast(res.data.message, 'success');
                          } catch (e) {
                            onShowToast('Database snapshot execution failed.', 'error');
                          }
                        }}
                        className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <HardDrive size={12} /> Snapshot Backup
                      </button>
                    </div>

                    <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-2">
                      <div className="text-xs font-bold text-white">Restore Snapshot</div>
                      <p className="text-[10px] text-slate-400">Roll back active configurations to the last verified safe state.</p>
                      <button
                        onClick={async () => {
                          if (!window.confirm('Ma ogoshay in aad ku soo celiso xogti hore?')) return;
                          try {
                            const res = await api.post('/api/owner/restore');
                            onShowToast(res.data.message, 'success');
                          } catch (e) {
                            onShowToast('Database snapshot restoration failed.', 'error');
                          }
                        }}
                        className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <RefreshCw size={12} /> Rollback State
                      </button>
                    </div>
                  </div>
                </div>

                {/* API Keys management */}
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4">
                  <h3 className="font-bold text-white text-sm uppercase tracking-wider font-mono flex items-center gap-2 text-rose-500">
                    <Key size={15} /> Remote API Keys
                  </h3>
                  <p className="text-xs text-slate-400">View active system keys integrated in this cluster environment.</p>

                  <div className="space-y-3 font-mono text-[10px]">
                    <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-xl">
                      <div className="text-slate-400 font-bold uppercase tracking-wide">Gemini API Key</div>
                      <div className={`font-semibold mt-1 flex items-center gap-1.5 ${systemStats.geminiKeyConfigured ? 'text-emerald-400' : 'text-rose-400'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${systemStats.geminiKeyConfigured ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`}></span>
                        {systemStats.geminiKeyConfigured ? 'Waa Kiciyey (Configured & Active)' : 'Aan la kicin (Not Configured)'}
                      </div>
                    </div>
                    <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-xl">
                      <div className="text-slate-400 font-bold uppercase tracking-wide">PostgreSQL URL</div>
                      <div className="text-green-400 font-semibold mt-1">sqlite:///data/db.json (Active)</div>
                    </div>
                    <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-xl">
                      <div className="text-slate-400 font-bold uppercase tracking-wide">Supabase Cloud Sync (24/7 Free Backup)</div>
                      <div className={`font-semibold mt-1 flex items-center gap-1.5 ${systemStats.supabaseConfigured ? 'text-emerald-400' : 'text-amber-400'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${systemStats.supabaseConfigured ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`}></span>
                        {systemStats.supabaseConfigured ? 'Waa Ku Xiranyahay (Connected & Backed Up 24/7)' : 'Bypass (Local fallback used)'}
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* VIEW: NETWORK PRINTER CONTROL */}
          {activeSubTab === 'printer' && (
            <div className="space-y-6 animate-fade-in text-slate-100">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                    <Printer className="text-rose-500" />
                    Maareynta Network Printer-ka & TCP Sockets
                  </h2>
                  <p className="text-xs text-slate-400 font-mono">
                    Qaabeynta iyo tijaabinta daabacadaha ku xiran shabakada (Port 9100) oo leh Retry Mechanism iyo Firebase Alerts.
                  </p>
                </div>
                
                <button
                  onClick={async () => {
                    try {
                      await api.post('/api/owner/printer/clear-logs');
                      onShowToast('Logs-ka iyo Alerts-ka waa la tirtiray.', 'success');
                      fetchPrinterData();
                    } catch (e) {
                      onShowToast('Ku guuldareystay tirtirida logs-ka.', 'error');
                    }
                  }}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl text-xs font-bold transition-all border border-slate-700 cursor-pointer flex items-center gap-1.5"
                >
                  <Trash2 size={13} />
                  Tirtir Logs-ka
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* CONFIGURATION & TESTING (Left) */}
                <div className="lg:col-span-7 space-y-6">
                  
                  {/* CONFIG CARD */}
                  <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                      <h3 className="font-bold text-white text-sm uppercase tracking-wider font-mono flex items-center gap-2">
                        <Sliders size={16} className="text-rose-500" />
                        Qaabeynta Printer-ka (IP Configuration)
                      </h3>
                      
                      {connectionStatus === 'online' && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></span>
                          PRINTER ONLINE
                        </span>
                      )}
                      {connectionStatus === 'offline' && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 bg-rose-500 rounded-full"></span>
                          PRINTER OFFLINE
                        </span>
                      )}
                      {connectionStatus === 'unchecked' && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-850 text-slate-400 border border-slate-700 flex items-center gap-1">
                          UNCHECKED
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Printer IP Address</label>
                        <input
                          type="text"
                          value={printerConfig.ip}
                          onChange={(e) => setPrinterConfig(prev => ({ ...prev, ip: e.target.value }))}
                          placeholder="e.g. 10.0.0.25"
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-rose-500 transition-all font-mono"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Printer Port (Standard: 9100)</label>
                        <input
                          type="number"
                          value={printerConfig.port}
                          onChange={(e) => setPrinterConfig(prev => ({ ...prev, port: parseInt(e.target.value) || 9100 }))}
                          placeholder="9100"
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-rose-500 transition-all font-mono"
                        />
                      </div>
                    </div>

                    <div className="flex gap-3 pt-2">
                      <button
                        onClick={async () => {
                          try {
                            const res = await api.post('/api/owner/printer/config', printerConfig);
                            onShowToast(res.data.message, 'success');
                            fetchPrinterData();
                          } catch (e: any) {
                            onShowToast(e.response?.data?.error || 'Failed to save configuration.', 'error');
                          }
                        }}
                        className="flex-1 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-rose-950/20 cursor-pointer"
                      >
                        <Save size={14} />
                        Keydi Configuration
                      </button>

                      <button
                        onClick={async () => {
                          setIsCheckingConnection(true);
                          setConnectionStatus('unchecked');
                          try {
                            const res = await api.post('/api/owner/printer/test-connection', printerConfig);
                            if (res.data.isOnline) {
                              setConnectionStatus('online');
                              onShowToast('Printer-ku waa Online (TCP Port 9100 waa furan yahay).', 'success');
                            } else {
                              setConnectionStatus('offline');
                              onShowToast('Printer-ku waa Offline. Lama xiriiri karo.', 'error');
                            }
                          } catch (e) {
                            setConnectionStatus('offline');
                            onShowToast('Connection check-gu waa guuldareystay.', 'error');
                          } finally {
                            setIsCheckingConnection(false);
                          }
                        }}
                        disabled={isCheckingConnection}
                        className="py-2 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl text-xs font-bold transition-all border border-slate-700 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        {isCheckingConnection ? (
                          <RefreshIcon size={14} className="animate-spin text-rose-500" />
                        ) : (
                          <Activity size={14} />
                        )}
                        Hubi Connection-ka (Ping Check)
                      </button>
                    </div>
                  </div>

                  {/* PRINT TEST CARD */}
                  <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4">
                    <h3 className="font-bold text-white text-sm uppercase tracking-wider font-mono flex items-center gap-2 border-b border-slate-800 pb-3">
                      <Play size={16} className="text-rose-500" />
                      Tijaabi Daabacaada (Socket Write & Retry Testing)
                    </h3>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Qor Macluumaadka La Daabacayo (Text / ESC/POS commands)</label>
                      <textarea
                        rows={4}
                        value={testText}
                        onChange={(e) => setTestText(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-rose-500 transition-all font-mono"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      
                      {/* NORMAL TEST BUTTON */}
                      <button
                        onClick={async () => {
                          setIsPrinting(true);
                          try {
                            const res = await api.post('/api/owner/printer/print-test', {
                              ip: printerConfig.ip,
                              port: printerConfig.port,
                              text: testText,
                              simulateOffline: false
                            });
                            onShowToast(res.data.message, 'success');
                            setTimeout(fetchPrinterData, 1000); 
                          } catch (e: any) {
                            onShowToast(e.response?.data?.error || 'Print request failed.', 'error');
                          } finally {
                            setIsPrinting(false);
                          }
                        }}
                        disabled={isPrinting}
                        className="py-2.5 bg-slate-850 hover:bg-slate-800 border border-slate-750 text-slate-100 hover:text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        <Send size={13} className="text-rose-500" />
                        Daabac Tijaabo (Asynchronous)
                      </button>

                      {/* OFFLINE RETRY TEST */}
                      <button
                        onClick={async () => {
                          setIsPrinting(true);
                          try {
                            const res = await api.post('/api/owner/printer/print-test', {
                              ip: printerConfig.ip,
                              port: printerConfig.port,
                              text: testText,
                              simulateOffline: true
                            });
                            onShowToast(res.data.message, 'success');
                          } catch (e: any) {
                            onShowToast(e.response?.data?.error || 'Print failed.', 'error');
                          } finally {
                            setIsPrinting(false);
                          }
                        }}
                        disabled={isPrinting}
                        className="py-2.5 bg-rose-650/10 hover:bg-rose-650/20 text-rose-400 border border-rose-500/30 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        <AlertTriangle size={13} className="text-rose-500 animate-pulse" />
                        Tijaabi Offline Retry (Test)
                      </button>

                    </div>

                    <div className="p-3 bg-rose-500/5 border border-rose-500/10 rounded-xl space-y-1 text-[11px] text-slate-400 leading-relaxed font-sans">
                      <span className="font-bold text-rose-400 flex items-center gap-1">
                        <AlertCircle size={12} />
                        Sida loo tijaabiyo nidaamka "Retry Mechanism" iyo "Firebase warning":
                      </span>
                      Ku dhufo badhanka <strong className="text-rose-300">"Tijaabi Offline Retry (Test)"</strong>.
                      Server-ku wuxuu isku dayi doonaa inuu ku xirmo IP-ga printer-ka 3 jeer oo xiriir ah (isagoo sugaya 2s isku day kasta).
                      Dhamaan isku dayada wey guuldareysan doonaan, markuu dhameysto isku dayga 3-aad, wuxuu si toos ah u qori doonaa 
                      fariin digniin ah (Alert Log) oo loo diro database-ka Firebase, logs-kana kor ayuu u soo bixi doonaa isagoo cas!
                    </div>

                  </div>

                  {/* SOCIAL CLOUD PRINTING & APP KEYS CONFIGURATION */}
                  <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4">
                    <h3 className="font-bold text-white text-sm uppercase tracking-wider font-mono flex items-center gap-2 border-b border-slate-800 pb-3">
                      <Key size={16} className="text-rose-500" />
                      App Keys & Social Webhook Config
                    </h3>
                    <p className="text-xs text-slate-400">
                      Geli fureyaasha (API Keys/Tokens) ee Facebook, Telegram, iyo WhatsApp si aad u kiciyo daabacaad toos ah (Cloud Printing Flow) marka fariin ama dalab cusub ku soo dhaco.
                    </p>

                    <div className="space-y-4">
                      {/* WhatsApp Config */}
                      <div className="p-3 bg-emerald-950/20 border border-emerald-500/20 rounded-xl space-y-3">
                        <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs font-mono">
                          <MessageSquare size={14} />
                          WhatsApp Business API Keys
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">Phone Number ID</label>
                            <input
                              type="text"
                              value={printerConfig.whatsappPhoneId || ''}
                              onChange={(e) => setPrinterConfig(prev => ({ ...prev, whatsappPhoneId: e.target.value }))}
                              placeholder="e.g. 109554228965"
                              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition-all font-mono"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">Permanent Access Token</label>
                            <input
                              type="password"
                              value={printerConfig.whatsappToken || ''}
                              onChange={(e) => setPrinterConfig(prev => ({ ...prev, whatsappToken: e.target.value }))}
                              placeholder="EAAGxx..."
                              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition-all font-mono"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Telegram Config */}
                      <div className="p-3 bg-sky-950/20 border border-sky-500/20 rounded-xl space-y-3">
                        <div className="flex items-center gap-2 text-sky-400 font-bold text-xs font-mono">
                          <Send size={14} />
                          Telegram Bot API Keys
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">Bot Token (BotFather)</label>
                            <input
                              type="password"
                              value={printerConfig.telegramToken || ''}
                              onChange={(e) => setPrinterConfig(prev => ({ ...prev, telegramToken: e.target.value }))}
                              placeholder="123456:ABC-DEF..."
                              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-sky-500 transition-all font-mono"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">Telegram Chat/Group ID</label>
                            <input
                              type="text"
                              value={printerConfig.telegramChatId || ''}
                              onChange={(e) => setPrinterConfig(prev => ({ ...prev, telegramChatId: e.target.value }))}
                              placeholder="e.g. -1001984252"
                              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-sky-500 transition-all font-mono"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Facebook Config */}
                      <div className="p-3 bg-indigo-950/20 border border-indigo-500/20 rounded-xl space-y-3">
                        <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs font-mono">
                          <Globe size={14} />
                          Facebook Page Keys (Messenger)
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">Facebook Page ID</label>
                            <input
                              type="text"
                              value={printerConfig.facebookPageId || ''}
                              onChange={(e) => setPrinterConfig(prev => ({ ...prev, facebookPageId: e.target.value }))}
                              placeholder="e.g. 104482595821"
                              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-all font-mono"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">Page Access Token</label>
                            <input
                              type="password"
                              value={printerConfig.facebookPageToken || ''}
                              onChange={(e) => setPrinterConfig(prev => ({ ...prev, facebookPageToken: e.target.value }))}
                              placeholder="EAAKzz..."
                              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-all font-mono"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={async () => {
                        try {
                          await api.post('/api/owner/printer/config', printerConfig);
                          onShowToast('App Keys-ka iyo Configuration-ka si guul leh ayaa loo kaydiyay!', 'success');
                          fetchPrinterData();
                        } catch (e: any) {
                          onShowToast(e.response?.data?.error || 'Ku guuldareystay kaydinta App Keys-ka.', 'error');
                        }
                      }}
                      className="w-full py-2 bg-gradient-to-r from-emerald-600 via-sky-600 to-indigo-600 hover:opacity-90 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-lg cursor-pointer"
                    >
                      <Save size={14} />
                      Kaydi App Keys-ka & Webhooks
                    </button>
                  </div>

                  {/* WEBHOOK TEST TRIGGER */}
                  <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4">
                    <h3 className="font-bold text-white text-sm uppercase tracking-wider font-mono flex items-center gap-2 border-b border-slate-800 pb-3">
                      <Activity size={16} className="text-amber-500" />
                      Test Social Webhook Cloud Print
                    </h3>
                    <p className="text-xs text-slate-400">
                      Dooro nooca dukumeentiga laga soo kiciyay social channels si aad u tijaabiso habka daabacaada ee Cloud Printing:
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {/* WHATSAPP TEMPLATE PRINT */}
                      <button
                        onClick={async () => {
                          const payload = [
                            '================================',
                            '             SOMLUUL',
                            '          PRINTER TEST',
                            '================================',
                            `Date: ${new Date().toLocaleString()}`,
                            `Printer: ${printerConfig.ip}:${printerConfig.port}`,
                            'Status: Test print requested from Owner Dashboard',
                            '================================',
                            ''
                          ].join('\n');
                          setIsPrinting(true);
                          try {
                            const res = await api.post('/api/owner/printer/print-test', {
                              ip: printerConfig.ip,
                              port: printerConfig.port,
                              text: payload,
                              simulateOffline: false
                            });
                            onShowToast('Printer test sent successfully!', 'success');
                            setTimeout(fetchPrinterData, 1000);
                          } catch (e) {
                            onShowToast('Ku guuldareystay daabacaadda tijaabada.', 'error');
                          } finally {
                            setIsPrinting(false);
                          }
                        }}
                        className="py-3 px-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 rounded-xl text-[11px] font-bold flex flex-col items-center justify-center gap-1.5 transition-all text-center cursor-pointer"
                      >
                        <MessageSquare size={16} />
                        Printer Test Receipt
                      </button>

                      {/* TELEGRAM TEMPLATE PRINT */}
                      <button
                        onClick={async () => {
                          const payload = [
                            '================================',
                            '             SOMLUUL',
                            '          PRINTER TEST',
                            '================================',
                            `Date: ${new Date().toLocaleString()}`,
                            `Printer: ${printerConfig.ip}:${printerConfig.port}`,
                            'Status: Test print requested from Owner Dashboard',
                            '================================',
                            ''
                          ].join('\n');
                          setIsPrinting(true);
                          try {
                            const res = await api.post('/api/owner/printer/print-test', {
                              ip: printerConfig.ip,
                              port: printerConfig.port,
                              text: payload,
                              simulateOffline: false
                            });
                            onShowToast('Printer test sent successfully!', 'success');
                            setTimeout(fetchPrinterData, 1000);
                          } catch (e) {
                            onShowToast('Ku guuldareystay daabacaadda tijaabada.', 'error');
                          } finally {
                            setIsPrinting(false);
                          }
                        }}
                        className="py-3 px-2 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/20 text-sky-400 rounded-xl text-[11px] font-bold flex flex-col items-center justify-center gap-1.5 transition-all text-center cursor-pointer"
                      >
                        <Send size={16} />
                        Printer Test Ticket
                      </button>

                      {/* FACEBOOK TEMPLATE PRINT */}
                      <button
                        onClick={async () => {
                          const payload = [
                            '================================',
                            '             SOMLUUL',
                            '          PRINTER TEST',
                            '================================',
                            `Date: ${new Date().toLocaleString()}`,
                            `Printer: ${printerConfig.ip}:${printerConfig.port}`,
                            'Status: Test print requested from Owner Dashboard',
                            '================================',
                            ''
                          ].join('\n');
                          setIsPrinting(true);
                          try {
                            const res = await api.post('/api/owner/printer/print-test', {
                              ip: printerConfig.ip,
                              port: printerConfig.port,
                              text: payload,
                              simulateOffline: false
                            });
                            onShowToast('Printer test sent successfully!', 'success');
                            setTimeout(fetchPrinterData, 1000);
                          } catch (e) {
                            onShowToast('Ku guuldareystay tijaabada Facebook.', 'error');
                          } finally {
                            setIsPrinting(false);
                          }
                        }}
                        className="py-3 px-2 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 text-indigo-400 rounded-xl text-[11px] font-bold flex flex-col items-center justify-center gap-1.5 transition-all text-center cursor-pointer"
                      >
                        <Globe size={16} />
                        Facebook Receipt
                      </button>
                    </div>

                    <div className="p-3 bg-amber-500/5 border border-amber-500/10 rounded-xl text-[11px] text-slate-400 space-y-1 leading-relaxed">
                      <p className="font-bold text-amber-400 flex items-center gap-1">
                        <Activity size={12} />
                        Sida uu u shaqeeyo Cloud Print Webhook:
                      </p>
                      <p>
                        Marka fariin dalab cusub ah ay ku soo dhacdo mid ka mid ah kanaalada kore, nidaamka wuxuu isticmaalayaa fureyaasha kor ku xusan si uu u xaqiijiyo (verify), ka dibna wuxuu u beddelayaa koodh ESC/POS thermal format ah isagoo u diraya Cloud Printer-kaaga iyadoo la kaashanayo retry logic-ga.
                      </p>
                    </div>
                  </div>

                </div>

                {/* PRINTER LOGS & FIREBASE ALERTS (Right) */}
                <div className="lg:col-span-5 space-y-6">
                  
                  {/* FIREBASE ACTIVE ALERTS */}
                  <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4">
                    <h3 className="font-bold text-white text-sm uppercase tracking-wider font-mono flex items-center gap-2 text-rose-500 border-b border-slate-800 pb-3">
                      <ShieldAlert size={16} />
                      Firebase Active Alerts ({printerAlerts.length})
                    </h3>

                    {printerAlerts.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-8 text-center text-slate-500 border border-dashed border-slate-800 rounded-xl">
                        <CheckCircle2 size={32} className="text-emerald-500/40 mb-2" />
                        <p className="text-xs font-semibold">Wax Alerts Ah Kuma Jiraan Firebase</p>
                        <p className="text-[10px] text-slate-600 mt-1">Nidaamka printer-ku si caadi ah ayuu u shaqeynayaa.</p>
                      </div>
                    ) : (
                      <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
                        {printerAlerts.map((alert, idx) => (
                          <div key={alert.id || idx} className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl space-y-1 font-mono text-[10px]">
                            <div className="flex justify-between items-center">
                              <span className="text-rose-400 font-bold uppercase">⚠️ PRINTER_OFFLINE_ALERT</span>
                              <span className="text-slate-500">{new Date(alert.timestamp).toLocaleTimeString()}</span>
                            </div>
                            <p className="text-slate-300 font-bold mt-1">Host: {alert.printerIp}:{alert.port}</p>
                            <p className="text-slate-400 text-[9px] mt-0.5 line-clamp-2 italic">{alert.error}</p>
                            <div className="pt-1.5 flex justify-between items-center text-[9px] text-rose-500">
                              <span>Firebase Collection: <strong>printer_alerts</strong></span>
                              <span className="bg-rose-500 text-white font-bold px-1.5 py-0.2 rounded uppercase">Critical</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* LIVE PRINT LOGS */}
                  <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4">
                    <h3 className="font-bold text-white text-sm uppercase tracking-wider font-mono flex items-center gap-2 text-rose-500 border-b border-slate-800 pb-3">
                      <Activity size={16} />
                      Live Connection & Print History ({printerLogs.length})
                    </h3>

                    {printerLogs.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-8 text-center text-slate-500 border border-dashed border-slate-800 rounded-xl">
                        <FileText size={32} className="text-slate-700 mb-2" />
                        <p className="text-xs font-semibold">Taariikhda daabacaadu waa eber</p>
                        <p className="text-[10px] text-slate-600 mt-1">Fariimaha iyo isku-dayada halkan ayay ku kaydsami doonaan.</p>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                        {printerLogs.map((log, idx) => (
                          <div key={log.id || idx} className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl space-y-1 font-mono text-[10px]">
                            <div className="flex justify-between items-center">
                              <span className={`font-bold ${log.status === 'success' ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {log.status === 'success' ? '✓ SUCCESS' : '✗ FAILED'}
                              </span>
                              <span className="text-slate-500">{new Date(log.timestamp).toLocaleTimeString()}</span>
                            </div>
                            <p className="text-slate-300">IP: {log.printerIp} | Attempts: <strong className={log.attempts >= 3 ? 'text-amber-400' : 'text-slate-300'}>{log.attempts}/3</strong></p>
                            {log.error && (
                              <p className="text-rose-400/80 text-[9px] mt-0.5 break-all italic">{log.error}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                </div>

              </div>

              {/* TECHNICAL HOW-TO AND CODE (Bottom) */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 space-y-4">
                <h3 className="font-bold text-white text-sm uppercase tracking-wider font-mono flex items-center gap-2 border-b border-slate-800 pb-3">
                  <Database size={16} className="text-rose-500" />
                  Nidaamka Howlgalka iyo Dhexgalka Firebase (Documentation & Guidelines)
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs leading-relaxed text-slate-300">
                  <div className="space-y-3">
                    <h4 className="font-bold text-white uppercase tracking-wide flex items-center gap-1.5 text-rose-400 font-mono">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                      Maareynta Khaladaadka (Error Handling)
                    </h4>
                    <p>
                      Marka server-ka laga diro amar daabacaad ah (ESC/POS), nidaamku marka hore wuxuu sameynayaa 
                      <strong className="text-white"> Asynchronous Ping Check</strong> (adoo furaya socket muddo aad u gaaban oo 1.5s ah) 
                      si loo ogaado haddii printer-ku shaqeynayo (online).
                    </p>
                    <p>
                      Haddii ping check-ga ama socket connection-ku guuldareysto, nidaamka 
                      <strong className="text-rose-400"> Retry Mechanism </strong> ayaa kici doona. Wuxuu isku dayi doonaa inuu u diro 
                      xogta ilaa <strong className="text-white">3 jeer oo xiriir ah</strong>, isagoo u dhexeysiinaya sugitaan (Delay) dhan 2 ilbiriqsi.
                    </p>
                    <p>
                      Haddii dhamaan 3-da isku day guuldareystaan, server-ku wuxuu si degdeg ah u kicin doonaa digniinta asynchronus ah, 
                      isagoo u qoraya xogta khaladaadka collection-ka <code className="bg-slate-900 px-1.5 py-0.5 rounded text-rose-400 font-mono">printer_alerts</code> 
                      ee Firebase, si maamuluhu u helo alert toos ah.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-bold text-white uppercase tracking-wide flex items-center gap-1.5 text-rose-400 font-mono">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                      Qaabka uu u Daabaco Asynchronous
                    </h4>
                    <p>
                      Dhamaan socket connection-ka iyo retry loops-ka waxaa loo dhisay sidii 
                      <strong className="text-white"> Promise-based Asynchronous Functions</strong> iyadoo la adeegsanayo 
                      <code className="bg-slate-900 px-1.5 py-0.5 rounded text-amber-400 font-mono">net.Socket</code> ee Node.js.
                    </p>
                    <p>
                      Kani wuxuu ka dhigan yahay in server-ku uusan marnaba xayirmi doonin ama uusan u hakani doonin isku-dayada 
                      daabacadaha (no blocking event loop), xataa haddii printer-ku offline yahay oo dhowr jeer dib loo isku dayayo.
                    </p>
                    <p>
                      Wuxuu si toos ah u maamulaa threads-ka kale, isagoo u diraya macmiilka HTTP response guul ah (status 200) 
                      halka uu isagu gadaal (background) ka maareynayo socket connections-ka iyo error logging-ka.
                    </p>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-900">
                  <h4 className="font-bold text-white uppercase tracking-wide font-mono text-xs text-rose-400 mb-2">
                    Koodhka TypeScript standalone ee TCP Socket daabacaada:
                  </h4>
                  <pre className="bg-slate-900 border border-slate-800 rounded-xl p-4 overflow-x-auto text-[10px] text-slate-300 font-mono">
{`import net from 'net';

export function sendPrintJob(host: string, data: string | Buffer, port = 9100, timeout = 5000): Promise<void> {
  return new Promise((resolve, reject) => {
    const socket = new net.Socket();
    let hasError = false;

    socket.setTimeout(timeout);
    socket.connect(port, host, () => {
      const buffer = typeof data === 'string' ? Buffer.from(data, 'utf-8') : data;
      socket.write(buffer, () => socket.end());
    });

    socket.on('end', () => { if (!hasError) resolve(); });
    socket.on('error', (err) => { hasError = true; socket.destroy(); reject(err); });
    socket.on('timeout', () => { hasError = true; socket.destroy(); reject(new Error('Timed out.')); });
  });
}`}
                  </pre>
                </div>

              </div>

            </div>
          )}

          {/* VIEW: WEB OWNER (LANDING PAGE MANAGER) */}
          {activeSubTab === 'web_owner' && (
            <div className="space-y-6 animate-fade-in text-slate-100">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                  <Globe className="text-rose-500" />
                  Xarunta Maamulka Website-ka (Web Owner Console)
                </h2>
                <p className="text-xs text-slate-400 font-mono">
                  Wax ka badal qoraalada, sawirada sliders-ka aan xadidnayn, iyo link-yada bogga hore ee SomLuul.
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Text fields and custom links (Left) */}
                <div className="lg:col-span-7 space-y-6">
                  <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4">
                    <h3 className="font-bold text-white text-sm uppercase tracking-wider font-mono border-b border-slate-800 pb-2">
                      Qoraalada Bogga Hore (Hero Content)
                    </h3>
                    
                    {/* Hero Title */}
                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-slate-400 font-sans">
                        Hero Title (Qoraalka Wayn ee Bogga Hore)
                      </label>
                      <input
                        type="text"
                        value={landingSettings.heroTitle}
                        onChange={(e) => setLandingSettings(prev => ({ ...prev, heroTitle: e.target.value }))}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs font-bold text-white focus:outline-none focus:ring-1 focus:ring-rose-500"
                        placeholder="The Future of Social Media is Here"
                      />
                    </div>

                    {/* Hero Subtext */}
                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-slate-400 font-sans">
                        Hero Subtext (Qoraalka Sharaxaadda ah)
                      </label>
                      <textarea
                        rows={3}
                        value={landingSettings.heroSubtext}
                        onChange={(e) => setLandingSettings(prev => ({ ...prev, heroSubtext: e.target.value }))}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs font-bold text-white focus:outline-none focus:ring-1 focus:ring-rose-500"
                        placeholder="Connect with the world..."
                      />
                    </div>

                    {/* Long Description */}
                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-slate-400 font-sans">
                        Qoraal Dheer oo ku darsama Bogga Hore (Long/Rich Description Section)
                      </label>
                      <textarea
                        rows={5}
                        value={landingSettings.longDescription}
                        onChange={(e) => setLandingSettings(prev => ({ ...prev, longDescription: e.target.value }))}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs font-bold text-white focus:outline-none focus:ring-1 focus:ring-rose-500"
                        placeholder="Qor warbixin dheer ama ogeysiis ku saabsan SomLuul oo lagu soo bandhigo bogga hore..."
                      />
                    </div>

                    {/* Save Button */}
                    <button
                      onClick={async () => {
                        try {
                          await api.post('/api/owner/landing-settings', landingSettings);
                          onShowToast('Isbedelada mareegta waa la kaydiyay si guul leh!', 'success');
                          fetchLandingSettings();
                        } catch (err) {
                          onShowToast('Cilad ayaa dhacday intii la kaydinayay isbedelada.', 'error');
                        }
                      }}
                      className="w-full py-3 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Save size={14} />
                      Kaydi Isbedelada Bogga
                    </button>
                  </div>

                  {/* DESIGN & BRANDING — real site-wide controls */}
                  <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4">
                    <h3 className="font-bold text-white text-sm uppercase tracking-wider font-mono border-b border-slate-800 pb-2 flex items-center gap-2">
                      Design & Branding (Qaabka Guud ee Web-ka)
                    </h3>
                    <p className="text-[11px] text-slate-400">Halkan ka beddel midabbada, footer-ka, iyo xadka post-yada. Isbeddelada waxay khuseeyaan bogga hore iyo nidaamka oo dhan marka la kaydiyo.</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="block text-[10px] text-slate-400">Primary Color (Midabka ugu muhiimsan)</label>
                        <div className="flex gap-2 items-center">
                          <input type="color" value={landingSettings.primaryColor || '#4f46e5'}
                            onChange={(e) => setLandingSettings(prev => ({ ...prev, primaryColor: e.target.value }))}
                            className="w-10 h-10 rounded cursor-pointer border border-slate-700 bg-transparent" />
                          <input type="text" value={landingSettings.primaryColor || '#4f46e5'}
                            onChange={(e) => setLandingSettings(prev => ({ ...prev, primaryColor: e.target.value }))}
                            className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-white" />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="block text-[10px] text-slate-400">Accent Color (Midabka labaad)</label>
                        <div className="flex gap-2 items-center">
                          <input type="color" value={landingSettings.accentColor || '#42b72a'}
                            onChange={(e) => setLandingSettings(prev => ({ ...prev, accentColor: e.target.value }))}
                            className="w-10 h-10 rounded cursor-pointer border border-slate-700 bg-transparent" />
                          <input type="text" value={landingSettings.accentColor || '#42b72a'}
                            onChange={(e) => setLandingSettings(prev => ({ ...prev, accentColor: e.target.value }))}
                            className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-white" />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="block text-[10px] text-slate-400">Site Tagline</label>
                        <input type="text" value={landingSettings.siteTagline || ''}
                          onChange={(e) => setLandingSettings(prev => ({ ...prev, siteTagline: e.target.value }))}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white" />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-[10px] text-slate-400">Footer Text</label>
                        <input type="text" value={landingSettings.footerText || ''}
                          onChange={(e) => setLandingSettings(prev => ({ ...prev, footerText: e.target.value }))}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white" />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-[10px] text-slate-400">Max Image Size (MB) — Facebook-style default 10</label>
                        <input type="number" min={1} max={50} value={landingSettings.maxPostImageMB ?? 10}
                          onChange={(e) => setLandingSettings(prev => ({ ...prev, maxPostImageMB: Number(e.target.value) || 10 }))}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white" />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-[10px] text-slate-400">Max Video Size (MB) — Facebook-style default 1024 (1GB)</label>
                        <input type="number" min={10} max={2048} value={landingSettings.maxPostVideoMB ?? 1024}
                          onChange={(e) => setLandingSettings(prev => ({ ...prev, maxPostVideoMB: Number(e.target.value) || 1024 }))}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white" />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-[10px] text-slate-400">Max media per post</label>
                        <input type="number" min={1} max={20} value={landingSettings.maxImagesPerPost ?? 10}
                          onChange={(e) => setLandingSettings(prev => ({ ...prev, maxImagesPerPost: Number(e.target.value) || 10 }))}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white" />
                      </div>
                      <div className="space-y-1 flex items-end">
                        <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                          <input type="checkbox" checked={landingSettings.allowPublicSignup !== false}
                            onChange={(e) => setLandingSettings(prev => ({ ...prev, allowPublicSignup: e.target.checked }))}
                            className="rounded" />
                          Ogolow diiwaangelinta dadweynaha (Public Signup)
                        </label>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await api.post('/api/owner/landing-settings', landingSettings);
                          // Apply primary color live for owner preview
                          try {
                            document.documentElement.style.setProperty('--somluul-primary', landingSettings.primaryColor || '#4f46e5');
                            document.documentElement.style.setProperty('--somluul-accent', landingSettings.accentColor || '#42b72a');
                          } catch (_) {}
                          onShowToast('Design & branding waa la kaydiyay!', 'success');
                          fetchLandingSettings();
                        } catch (err) {
                          onShowToast('Cilad ayaa dhacday intii la kaydinayay design-ka.', 'error');
                        }
                      }}
                      className="w-full py-3 bg-[var(--somluul-primary)] hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Save size={14} />
                      Kaydi Design & Branding
                    </button>
                  </div>

                  {/* CUSTOM LINKS SECTION */}
                  <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4">
                    <h3 className="font-bold text-white text-sm uppercase tracking-wider font-mono border-b border-slate-800 pb-2 flex items-center gap-2">
                      <Link size={15} className="text-rose-500" />
                      Link-yada Gaarka ah (Custom Navigation & Download Links)
                    </h3>

                    <div className="space-y-3">
                      {landingSettings.customLinks.map((link, idx) => (
                        <div key={link.id || idx} className="flex items-center justify-between p-3 bg-slate-900 rounded-xl border border-slate-800">
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-white">{link.label}</p>
                            <p className="text-[10px] text-slate-500 font-mono truncate">{link.url}</p>
                          </div>
                          <button
                            onClick={() => {
                              const updated = landingSettings.customLinks.filter((_, i) => i !== idx);
                              setLandingSettings(prev => ({ ...prev, customLinks: updated }));
                            }}
                            className="p-1 hover:bg-slate-800 rounded text-rose-400"
                            title="Tirtir"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ))}
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <div className="space-y-1">
                        <label className="block text-[10px] text-slate-400">Magaca Link-ga</label>
                        <input
                          type="text"
                          value={newLinkLabel}
                          onChange={(e) => setNewLinkLabel(e.target.value)}
                          placeholder="Play Store"
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-semibold text-white focus:outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-[10px] text-slate-400">URL / Link</label>
                        <input
                          type="text"
                          value={newLinkUrl}
                          onChange={(e) => setNewLinkUrl(e.target.value)}
                          placeholder="https://..."
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-semibold text-white focus:outline-none"
                        />
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        if (!newLinkLabel || !newLinkUrl) {
                          onShowToast('Fadlan geli magaca iyo url-ka labadaba.', 'error');
                          return;
                        }
                        const newLink = { id: crypto.randomUUID(), label: newLinkLabel, url: newLinkUrl };
                        setLandingSettings(prev => ({
                          ...prev,
                          customLinks: [...prev.customLinks, newLink]
                        }));
                        setNewLinkLabel('');
                        setNewLinkUrl('');
                        onShowToast('Link cusub ayaa lagu daray liiska.', 'success');
                      }}
                      className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer border border-slate-700"
                    >
                      <Plus size={13} />
                      Ku Dar Link Cusub
                    </button>
                  </div>
                </div>

                {/* Unlimited Slider Images (Right) */}
                <div className="lg:col-span-5 space-y-6">
                  <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4">
                    <h3 className="font-bold text-white text-sm uppercase tracking-wider font-mono border-b border-slate-800 pb-2 flex items-center gap-2">
                      <Image size={15} className="text-rose-500" />
                      Sawirada Bogga Hore (Unlimited Slider Images)
                    </h3>

                    <p className="text-xs text-slate-400">
                      Ku dar sawiro aan xadidnayn oo lagu soo bandhigo bogga weyn ee platform-ka. Waxaad si toos ah uga soo galin kartaa kombuyuutarkaaga.
                    </p>

                    {/* Image List */}
                    <div className="grid grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-1 scrollbar-thin">
                      {landingSettings.heroImages.map((imgUrl, idx) => (
                        <div key={idx} className="relative group rounded-xl overflow-hidden border border-slate-800 bg-slate-900 aspect-video">
                          <img src={imgUrl} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center gap-2">
                            <button
                              onClick={() => {
                                const updated = landingSettings.heroImages.filter((_, i) => i !== idx);
                                setLandingSettings(prev => ({ ...prev, heroImages: updated }));
                                onShowToast('Sawirka waa laga saaray liiska.', 'success');
                              }}
                              className="p-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-full transition-transform hover:scale-110"
                              title="Tirtir Sawirka"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Uploader Input */}
                    <div className="pt-2">
                      <label className="w-full flex flex-col items-center justify-center px-4 py-6 bg-slate-900 hover:bg-slate-850 text-slate-400 rounded-2xl border border-dashed border-slate-800 cursor-pointer transition-all hover:border-rose-500/40">
                        <Image size={24} className="text-rose-500 mb-2" />
                        <span className="text-xs font-bold text-slate-300">
                          {isUploading ? 'Waa la soo galinayaa...' : 'Soo Geli Sawir Cusub'}
                        </span>
                        <span className="text-[10px] text-slate-500 mt-0.5">PNG, JPG, WEBP (Max 200MB)</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleUploadImage}
                          className="hidden"
                          disabled={isUploading}
                        />
                      </label>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          )}

        </main>
      </div>

    </div>
  );
};
