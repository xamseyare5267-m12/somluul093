import React, { useState, useEffect, useCallback, useRef } from 'react';
import { prefetchScaleStatus } from './lib/scaleClient';
import axios from 'axios';
import { ShieldCheck, Info, X, RefreshCw } from 'lucide-react';

import { ThemeProvider } from './components/ThemeContext';
import { LanguageProvider, useLanguage } from './components/LanguageContext';
import { AuthPages } from './components/AuthPages';
import { Layout, ActiveTabType } from './components/Layout';
import { LandingPage } from './components/LandingPage';
import { UserDashboard } from './components/UserDashboard';
import { AdminDashboard } from './components/AdminDashboard';
import { OwnerDashboard } from './components/OwnerDashboard';
import { AppDownloads } from './components/AppDownloads';
import { FilePreviewModal } from './components/FilePreviewModal';
import { SectionErrorBoundary } from './components/SectionErrorBoundary';

// Social Components
import { FeedSection } from './components/FeedSection';
import { MessengerSection } from './components/MessengerSection';
import { MarketplaceSection } from './components/MarketplaceSection';
import { PagesSection } from './components/PagesSection';
import { MonetizationSection } from './components/MonetizationSection';
import { ReelsSection } from './components/ReelsSection';
import { GroupsSection } from './components/GroupsSection';
import { LiveSection } from './components/LiveSection';
import { PlatformCenter } from './components/PlatformCenter';
import { ProfileSection } from './components/ProfileSection';

import { AuthSession, FileMetadata, Profile } from './types';

const LandingPageWrapper: React.FC<{ onOpenAuth: () => void }> = ({ onOpenAuth }) => {
  const { appLogo } = useLanguage();
  return <LandingPage onOpenAuth={onOpenAuth} appLogo={appLogo} />;
};

export default function App() {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isSessionLoading, setIsSessionLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ActiveTabType>(() => {
    try {
      const saved = sessionStorage.getItem('somluul_active_tab') as ActiveTabType | null;
      const allowed: ActiveTabType[] = ['feed','messenger','marketplace','monetization','live','reels','groups','pages','user_storage','apps_download','platform_center','admin_center','profile','landing'];
      if (saved && allowed.includes(saved)) return saved;
    } catch (_) {}
    return 'feed';
  });
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const selectedProfileIdRef = useRef<string | null>(null);
  selectedProfileIdRef.current = selectedProfileId;
  const urlSyncedRef = useRef(false);

  // Stable tab changer — always persist so remounts / HMR / session checks cannot reset the UI
  const handleTabChange = useCallback((tab: ActiveTabType) => {
    setActiveTab(tab);
    try { sessionStorage.setItem('somluul_active_tab', tab); } catch (_) {}
    // Deep-link / shareable URL (SPA routing — never full page reload)
    try {
      const params = new URLSearchParams(window.location.search);
      params.set('tab', tab);
      const uid = selectedProfileIdRef.current;
      if (tab === 'profile' && uid) {
        params.set('user', uid);
      } else {
        params.delete('user');
      }
      const qs = params.toString();
      const next = `${window.location.pathname}${qs ? `?${qs}` : ''}`;
      window.history.replaceState({ tab, user: uid }, '', next);
    } catch (_) {}
  }, []);

  // Restore deep link from URL on first load only (do not re-run and clobber user navigation)
  useEffect(() => { prefetchScaleStatus(); }, []);

  useEffect(() => {
    if (urlSyncedRef.current) return;
    urlSyncedRef.current = true;
    try {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get('tab') as ActiveTabType | null;
      const user = params.get('user');
      const allowed: ActiveTabType[] = ['feed','messenger','marketplace','monetization','live','reels','groups','pages','user_storage','apps_download','platform_center','admin_center','profile','landing'];
      if (tab && allowed.includes(tab)) {
        setActiveTab(tab);
        try { sessionStorage.setItem('somluul_active_tab', tab); } catch (_) {}
      }
      if (user) {
        setSelectedProfileId(user);
        setActiveTab('profile');
      }
    } catch (_) {}
  }, []); // somluul_url_sync

  const handleViewProfile = (profileId: string) => {
    setSelectedProfileId(profileId);
    setActiveTab('profile');
    try { sessionStorage.setItem('somluul_active_tab', 'profile'); } catch (_) {}
    try {
      const params = new URLSearchParams();
      params.set('tab', 'profile');
      params.set('user', profileId);
      window.history.pushState({ tab: 'profile', user: profileId }, '', `?${params.toString()}`);
    } catch (_) {}
  };

  // Preview overlay state
  const [previewFile, setPreviewFile] = useState<FileMetadata | null>(null);

  // Custom sliding Toast alerts
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [toastTimeout, setToastTimeout] = useState<NodeJS.Timeout | null>(null);

  const showToast = (message: string, type: 'success' | 'error') => {
    if (toastTimeout) clearTimeout(toastTimeout);
    setToast({ message, type });
    const timeout = setTimeout(() => setToast(null), 4000);
    setToastTimeout(timeout);
  };

  const checkLocalSession = async (opts?: { quiet?: boolean }) => {
    // Only show the full-page loader on the very first boot.
    // Re-validations must never blank the UI or reset the active tab
    // (this was causing $ / Friends / Messenger to flash white and jump back to Feed).
    const hasCachedSession = !!(localStorage.getItem('auth_session') || sessionStorage.getItem('auth_session'));
    const quiet = !!opts?.quiet || hasCachedSession;
    // Show spinner only when we have no cached session at all (true first visit)
    if (!quiet) setIsSessionLoading(true);

    const saved = localStorage.getItem('auth_session') || sessionStorage.getItem('auth_session');

    if (saved) {
      try {
        const parsed: AuthSession = JSON.parse(saved);
        // Optimistic: show the app immediately with cached session so tabs stay stable
        setSession(parsed);

        const response = await axios.get('/api/auth/me', {
          headers: { Authorization: `Bearer ${parsed.token}` }
        });
        const updatedSession = {
          token: parsed.token,
          user: response.data.user
        };
        setSession(updatedSession);

        localStorage.setItem(`somluul_profile_backup_${response.data.user.id}`, JSON.stringify(response.data.user));
        localStorage.setItem('last_user_id', response.data.user.id);

        if (localStorage.getItem('auth_session')) {
          localStorage.setItem('auth_session', JSON.stringify(updatedSession));
        } else {
          sessionStorage.setItem('auth_session', JSON.stringify(updatedSession));
        }
        // NEVER force activeTab to 'feed' here.
      } catch (err: any) {
        if (err.response && (err.response.status === 401 || err.response.status === 403)) {
          try {
            const parsed: AuthSession = JSON.parse(saved);
            const lastUserId = localStorage.getItem('last_user_id') || (parsed && parsed.user && parsed.user.id);
            const backupProfileStr = lastUserId ? localStorage.getItem(`somluul_profile_backup_${lastUserId}`) : null;

            if (backupProfileStr) {
              const backupProfile = JSON.parse(backupProfileStr);
              const restoredResponse = await axios.post('/api/auth/restore-session', {
                token: parsed.token,
                profile: backupProfile
              });

              const restoredToken = restoredResponse.data.token || parsed.token;
              const retryResponse = await axios.get('/api/auth/me', {
                headers: { Authorization: `Bearer ${restoredToken}` }
              });

              const updatedSession = {
                token: restoredToken,
                deviceId: restoredResponse.data.deviceId || parsed.deviceId,
                user: retryResponse.data.user
              };
              setSession(updatedSession);
              localStorage.setItem('auth_session', JSON.stringify(updatedSession));
              localStorage.setItem(`somluul_profile_backup_${retryResponse.data.user.id}`, JSON.stringify(retryResponse.data.user));
              setIsSessionLoading(false);
              return;
            }
          } catch (restoreErr) {
            console.error('Silent session restoration failed:', restoreErr);
          }

          localStorage.removeItem('auth_session');
          sessionStorage.removeItem('auth_session');
          setSession(null);
        } else if (!err.response) {
          // Network / offline — keep local session so the UI does not blank
          try {
            const parsed: AuthSession = JSON.parse(saved);
            setSession(parsed);
          } catch (_) {}
        }
      }
    }

    setIsSessionLoading(false);
  };

  useEffect(() => {
    checkLocalSession();
    
    const handleSwitchTab = (e: any) => {
      if (e.detail) {
        handleTabChange(e.detail);
      }
    };
    window.addEventListener('somluul_switch_tab', handleSwitchTab);

    return () => {
      if (toastTimeout) clearTimeout(toastTimeout);
      window.removeEventListener('somluul_switch_tab', handleSwitchTab);
    };
  }, []);

  useEffect(() => {
    if (session?.token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${session.token}`;
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  }, [session]);

  // Load public branding (colors, etc.) so the whole site reflects Web Owner settings
  useEffect(() => {
    axios.get('/api/landing-settings')
      .then((res) => {
        const d = res.data || {};
        try {
          if (d.primaryColor) document.documentElement.style.setProperty('--somluul-primary', d.primaryColor);
          if (d.accentColor) document.documentElement.style.setProperty('--somluul-accent', d.accentColor);
        } catch (_) {}
      })
      .catch(() => {});
  }, []);

  const handleLoginSuccess = (newSession: AuthSession) => {
    setSession(newSession);
    axios.defaults.headers.common['Authorization'] = `Bearer ${newSession.token}`;
    localStorage.setItem('auth_session', JSON.stringify(newSession));
    sessionStorage.setItem('auth_session', JSON.stringify(newSession));
    localStorage.setItem('last_user_id', newSession.user.id);
    localStorage.setItem(`somluul_profile_backup_${newSession.user.id}`, JSON.stringify(newSession.user));
    handleTabChange('feed');
  };

  const handleProfileUpdate = (updatedProfile: Profile) => {
    if (session) {
      const updatedSession = { ...session, user: updatedProfile };
      setSession(updatedSession);
      localStorage.setItem(`somluul_profile_backup_${updatedProfile.id}`, JSON.stringify(updatedProfile));
      const storageKey = localStorage.getItem('auth_session') ? 'localStorage' : 'sessionStorage';
      if (storageKey === 'localStorage') {
        localStorage.setItem('auth_session', JSON.stringify(updatedSession));
      } else {
        sessionStorage.setItem('auth_session', JSON.stringify(updatedSession));
      }
    }
  };

  const handleLogout = async () => {
    try {
      await axios.post('/api/auth/logout');
    } catch (e) {
      console.warn('Silent logout error', e);
    }
    delete axios.defaults.headers.common['Authorization'];
    localStorage.removeItem('auth_session');
    sessionStorage.removeItem('auth_session');
    localStorage.setItem('has_registered', 'true');
    localStorage.removeItem('last_user_email');
    localStorage.removeItem('last_user_password');
    localStorage.removeItem('last_first_name');
    localStorage.removeItem('last_last_name');
    setSession(null);
    showToast('You have been logged out successfully.', 'success');
  };

  const handleDownloadFile = async (file: FileMetadata) => {
    try {
      showToast(`Downloading file ${file.original_name}...`, 'success');
      const response = await fetch(file.public_url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = file.original_name;
      document.body.appendChild(link);
      link.click();
      
      // Clean up the temporary URL and anchor
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.warn('Blob download failed, falling back to direct anchor link download', err);
      const link = document.createElement('a');
      link.href = file.public_url;
      link.target = '_blank';
      link.download = file.original_name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  if (isSessionLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[var(--sl-bg)] flex items-center justify-center text-gray-500">
        <div className="text-center space-y-3">
          <RefreshCw className="animate-spin text-indigo-600 dark:text-indigo-400 mx-auto" size={32} />
          <p className="text-sm font-semibold tracking-wider uppercase text-gray-400">Loading SomLuul Workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <LanguageProvider>
      <ThemeProvider>
        <div id="app-root" className="min-h-screen font-sans text-gray-900 dark:text-gray-100 transition-colors duration-200">
          {!session ? (
            /* Authentication cards view */
            <AuthPages onLoginSuccess={handleLoginSuccess} onShowToast={showToast} />
          ) : (
            /* Main Platform layout shell */
            <Layout
              user={session.user}
              authToken={session.token}
              activeTab={activeTab}
              onTabChange={handleTabChange}
              onLogout={handleLogout}
              onProfileUpdate={handleProfileUpdate}
              onShowToast={showToast}
              onViewProfile={handleViewProfile}
            >
              <SectionErrorBoundary fallbackTitle="Qaybta app-ka waa la xayiray">
              {activeTab === 'feed' && (
                <FeedSection
                  user={session.user}
                  authToken={session.token}
                  onGoToStorage={() => handleTabChange('user_storage')}
                  onDownloadFile={handleDownloadFile}
                  onShowToast={showToast}
                  onViewProfile={handleViewProfile}
                />
              )}
              {activeTab === 'messenger' && (
                <MessengerSection 
                  user={session.user} 
                  authToken={session.token} 
                  onShowToast={showToast} 
                  onNavigateHome={() => handleTabChange('feed')}
                  onViewProfile={handleViewProfile}
                />
              )}
              {activeTab === 'marketplace' && (
                <SectionErrorBoundary fallbackTitle="Marketplace">
                  <MarketplaceSection user={session.user} authToken={session.token} onShowToast={showToast} />
                </SectionErrorBoundary>
              )}
              {activeTab === 'pages' && (
                <SectionErrorBoundary fallbackTitle="Pages">
                  <PagesSection user={session.user} authToken={session.token} onShowToast={showToast} />
                </SectionErrorBoundary>
              )}
              {activeTab === 'monetization' && (
                <SectionErrorBoundary fallbackTitle="Monetization / Wallet">
                  <MonetizationSection user={session.user} authToken={session.token} onShowToast={showToast} />
                </SectionErrorBoundary>
              )}
              {activeTab === 'groups' && (
                <SectionErrorBoundary fallbackTitle="Groups">
                  <GroupsSection user={session.user} authToken={session.token} onShowToast={showToast} />
                </SectionErrorBoundary>
              )}
              {activeTab === 'reels' && (
                <SectionErrorBoundary fallbackTitle="Reels">
                  <ReelsSection
                    user={session.user}
                    authToken={session.token}
                    onShowToast={showToast}
                    onViewProfile={handleViewProfile}
                  />
                </SectionErrorBoundary>
              )}
              {activeTab === 'live' && (
                <SectionErrorBoundary fallbackTitle="Live">
                  <LiveSection user={session.user} authToken={session.token} onShowToast={showToast} />
                </SectionErrorBoundary>
              )}
              {activeTab === 'user_storage' && (
                <UserDashboard
                  authToken={session.token}
                  onPreviewFile={setPreviewFile}
                  onDownloadFile={handleDownloadFile}
                  onShowToast={showToast}
                />
              )}
              {activeTab === 'apps_download' && (
                <AppDownloads onShowToast={showToast} />
              )}
              {activeTab === 'platform_center' && (
                <PlatformCenter />
              )}
              {activeTab === 'admin_center' && session.user.role === 'admin' && (
                <OwnerDashboard
                  authToken={session.token}
                  onLogout={handleLogout}
                  onShowToast={showToast}
                />
              )}
              {activeTab === 'profile' && (
                <ProfileSection
                  user={session.user}
                  profileId={selectedProfileId}
                  authToken={session.token}
                  onShowToast={showToast}
                  onViewProfile={handleViewProfile}
                  onProfileUpdate={handleProfileUpdate}
                />
              )}
              {activeTab === 'landing' && (
                <div className="relative bg-[#0F172A] rounded-2xl overflow-hidden shadow-2xl border border-gray-150 dark:border-gray-800">
                  {/* Sticky Banner inside App Layout to return to feed */}
                  <div className="sticky top-0 z-40 bg-[#1e293b]/95 backdrop-blur-md border-b border-slate-700/50 p-4 flex items-center justify-between shadow-md">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full overflow-hidden bg-slate-950 flex items-center justify-center p-0.5 border border-indigo-500/30 shrink-0">
                        {session.user.avatar ? (
                          <img src={session.user.avatar} alt="User" className="w-full h-full object-cover rounded-full" />
                        ) : (
                          <div className="w-full h-full rounded-full bg-[var(--somluul-primary)] text-white flex items-center justify-center font-bold text-xs">
                            {session.user.first_name[0]}{session.user.last_name[0]}
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="text-[10px] text-indigo-400 font-extrabold tracking-widest uppercase">WAXAAD KU JIRTAA QEYBTA WEB-KA</p>
                        <p className="text-sm font-black text-white tracking-tight">SomLuul Landing Page</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleTabChange('feed')}
                      className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-600 hover:from-indigo-500 hover:to-indigo-500 text-white text-xs font-black rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer border border-indigo-500/30 active:scale-95"
                    >
                      <span>🔙</span> KU NOQO FEED-KA APP-KA
                    </button>
                  </div>
                  <LandingPageWrapper 
                    onOpenAuth={() => handleTabChange('feed')} 
                  />
                </div>
              )}
              </SectionErrorBoundary>
            </Layout>
          )}

          {/* Global Modal Preview viewport */}
          {previewFile && (
            <FilePreviewModal
              file={previewFile}
              onClose={() => setPreviewFile(null)}
              onDownload={handleDownloadFile}
            />
          )}

          {/* Floating Sliding Toast Alert */}
          {toast && (
            <div
              id="floating-toast"
              className={`fixed bottom-5 right-5 z-50 flex items-start gap-3 p-4 rounded-2xl shadow-2xl border max-w-sm transition-all duration-300 transform translate-y-0 text-sm font-medium ${
                toast.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/90 dark:text-emerald-300 dark:border-emerald-900/50'
                  : 'bg-red-50 text-red-800 border-red-200 dark:bg-red-950/90 dark:text-red-300 dark:border-red-900/50'
              }`}
            >
              <div className="shrink-0 mt-0.5">
                {toast.type === 'success' ? (
                  <ShieldCheck className="text-emerald-600 dark:text-emerald-400" size={18} />
                ) : (
                  <Info className="text-red-600 dark:text-red-400" size={18} />
                )}
              </div>
              <div className="flex-1">
                {toast.message}
              </div>
              <button
                onClick={() => setToast(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 shrink-0 p-0.5 rounded-md"
              >
                <X size={14} />
              </button>
            </div>
          )}
        </div>
      </ThemeProvider>
    </LanguageProvider>
  );
}
