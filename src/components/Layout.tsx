import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { AppLogo } from './AppLogo';
import { SomLuulLogo } from './brand/SomLuulLogo';
import {
  HardDrive, ShieldAlert, LogOut, Sun, Moon, Menu, X, User, Key, Lock,
  RefreshCw, CheckCircle2, ShieldCheck, Mail, Edit3, Save, AlertCircle, Download,
  Globe, Compass, MessageSquare, ShoppingBag, Flag, DollarSign, HelpCircle, ChevronDown,
  Crown, Megaphone, Search, Home, Tv, Users, Bell, Grid, Clock, ChevronUp, Settings,
  MoreHorizontal, Plus
} from 'lucide-react';
import { Profile } from '../types';
import { useTheme } from './ThemeContext';
import { useLanguage, SUPPORTED_LANGUAGES, LanguageCode } from './LanguageContext';
import { FloatingChat } from './FloatingChat';
import { playNotifByType, isNotificationSoundMuted, setNotificationSoundMuted } from '../lib/soundUtils';
import {
  ensureNotificationPermission,
  showSystemNotification,
  notifyIncomingCall,
  notifyNewMessage,
} from '../lib/browserNotify';

export type ActiveTabType = 'feed' | 'messenger' | 'marketplace' | 'monetization' | 'live' | 'reels' | 'groups' | 'pages' | 'user_storage' | 'apps_download' | 'platform_center' | 'admin_center' | 'profile' | 'landing';

interface LayoutProps {
  user: Profile;
  authToken?: string;
  activeTab: ActiveTabType;
  onTabChange: (tab: ActiveTabType) => void;
  onLogout: () => void;
  onProfileUpdate: (updatedUser: Profile) => void;
  onShowToast: (message: string, type: 'success' | 'error') => void;
  children: React.ReactNode;
  onViewProfile?: (userId: string) => void;
}

export const Layout: React.FC<LayoutProps> = ({
  user,
  authToken,
  activeTab,
  onTabChange,
  onLogout,
  onProfileUpdate,
  onShowToast,
  children,
  onViewProfile,
}) => {
  const { theme, toggleTheme } = useTheme();
  const { language, setLanguage, t, isRtl, appName, appLogo } = useLanguage();
  
  // Mobile drawer trigger
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // User Search States
  const [searchQuery, setSearchQuery] = useState('');
  const [allProfiles, setAllProfiles] = useState<Profile[]>([]);
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchPosts, setSearchPosts] = useState<any[]>([]);
  const [searchHashtags, setSearchHashtags] = useState<string[]>([]);

  useEffect(() => {
    if (authToken) {
      axios.get('/api/profiles', {
        headers: { Authorization: `Bearer ${authToken}` }
      })
      .then(res => setAllProfiles(res.data))
      .catch(() => {});
    }
  }, [authToken]);

  // Debounced global search (users + posts + hashtags)
  useEffect(() => {
    if (!authToken || !searchQuery.trim()) {
      setSearchPosts([]);
      setSearchHashtags([]);
      return;
    }
    const t = setTimeout(() => {
      axios.get('/api/search', {
        params: { q: searchQuery.trim() },
        headers: { Authorization: `Bearer ${authToken}` }
      })
      .then(res => {
        if (Array.isArray(res.data?.users) && res.data.users.length) {
          // merge API users into local list for richer results
          setAllProfiles(prev => {
            const map = new Map(prev.map(p => [p.id, p]));
            for (const u of (res.data.users as Profile[])) map.set(u.id, Object.assign({}, map.get(u.id), u));
            return Array.from(map.values());
          });
        }
        setSearchPosts(res.data?.posts || []);
        setSearchHashtags(res.data?.hashtags || []);
      })
      .catch(() => {});
    }, 280);
    return () => clearTimeout(t);
  }, [searchQuery, authToken]);

  const handleSearchFocus = () => {
    setSearchFocused(true);
    if (authToken) {
      axios.get('/api/profiles', {
        headers: { Authorization: `Bearer ${authToken}` }
      })
      .then(res => setAllProfiles(res.data))
      .catch(() => {});
    }
  };

  const filteredProfiles = allProfiles.filter(p => {
    if (!searchQuery.trim()) return false;
    const q = searchQuery.toLowerCase();
    const fullName = `${p.first_name || ''} ${p.last_name || ''}`.toLowerCase();
    const email = (p.email || '').toLowerCase();
    const handle = email.split('@')[0];
    const un = (p.username || '').toLowerCase();
    return fullName.includes(q) || email.includes(q) || handle.includes(q) || un.includes(q);
  });
  
  // Sidebar expand state
  const [showMoreSidebar, setShowMoreSidebar] = useState(false);
  
  // Settings slide-out or modal
  const [showSettings, setShowSettings] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);

  // Language selector state
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [langSearchQuery, setLangSearchQuery] = useState('');

  // Direct download menu state
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const triggerFileDownload = (filename: string) => {
    const downloadUrl = `/api/downloads/file?name=${encodeURIComponent(filename)}`;
    window.open(downloadUrl, '_blank');
    if (onShowToast) {
      onShowToast(`📥 Bilaabaysa soo dejinta tooska ah ee ${filename}...`, 'success');
    }
    setShowDownloadMenu(false);
  };

  // Profile forms
  const [firstName, setFirstName] = useState(user.first_name);
  const [lastName, setLastName] = useState(user.last_name);
  const [avatarIndex, setAvatarIndex] = useState(user.avatar || '0');
  const [bio, setBio] = useState(user.bio || '');
  const [phone, setPhone] = useState(user.phone || '');
  const [profileUsername, setProfileUsername] = useState(user.username || '');

  // Password update form
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [passwordChangeSuccess, setPasswordChangeSuccess] = useState(false);

  // Owner settings form
  const [ownerNotice, setOwnerNotice] = useState('');
  const [isUpdatingNotice, setIsUpdatingNotice] = useState(false);
  const [noticeSaveSuccess, setNoticeSaveSuccess] = useState(false);

  useEffect(() => {
    if (showSettings && user.role === 'admin') {
      axios.get('/api/system-notice')
        .then(res => {
          setOwnerNotice(res.data.system_notice || '');
        })
        .catch(_err => {
          // Silent fallback
        });
    }
  }, [showSettings, user.email]);

  // Real notifications state & operations
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotiMenu, setShowNotiMenu] = useState(false);
  const [showMessengerMenu, setShowMessengerMenu] = useState(false);
  const [messengerSearchQuery, setMessengerSearchQuery] = useState('');
  const [messengerActiveTab, setMessengerActiveTab] = useState<'all' | 'unread' | 'groups' | 'communities'>('all');

  const knownNotiIdsRef = React.useRef<Set<string>>(new Set());
  const [soundMuted, setSoundMuted] = useState(isNotificationSoundMuted());

  const fetchNotifications = () => {
    if (authToken) {
      axios.get('/api/notifications', {
        headers: { Authorization: `Bearer ${authToken}` }
      })
      .then(res => {
        const list = res.data || [];
        // Play sound + OS notification for brand-new unread items
        if (knownNotiIdsRef.current.size > 0) {
          list.forEach((n: any) => {
            if (!n.read && n.id && !knownNotiIdsRef.current.has(n.id)) {
              playNotifByType(n.type || 'system');
              // System tray / lock-screen style notification (works in background tab)
              const typ = (n.type || '').toLowerCase();
              if (typ === 'call' || typ === 'voice_call' || typ === 'video_call') {
                const callType = typ.includes('video') || (n.body || '').toLowerCase().includes('video')
                  ? 'video'
                  : 'voice';
                notifyIncomingCall(n.senderName || n.title || 'Caller', callType as 'voice' | 'video', n.roomId);
              } else if (typ === 'message' || typ === 'chat') {
                notifyNewMessage(n.senderName || 'User', n.body || n.title || 'Farriin cusub', n.roomId);
              } else {
                showSystemNotification({
                  title: n.title || 'SomLuul',
                  body: n.body || '',
                  tag: n.id,
                  data: { type: n.type, url: '/?tab=messenger' },
                });
              }
            }
          });
        }
        knownNotiIdsRef.current = new Set(list.map((n: any) => n.id).filter(Boolean));
        setNotifications(list);
      })
      .catch(_err => {});
    }
  };

  useEffect(() => {
    // Ask once for OS notification permission (required for background alerts)
    ensureNotificationPermission().catch(() => {});
    fetchNotifications();
    // Faster poll so calls/messages surface quickly when tab is open or backgrounded
    const interval = setInterval(fetchNotifications, 5000);
    const onVis = () => {
      if (document.visibilityState === 'visible') fetchNotifications();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [authToken]);

  const handleMarkAsRead = async (id: string) => {
    if (!authToken) return;
    try {
      await axios.post(`/api/notifications/${id}/read`, {}, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!authToken) return;
    try {
      await axios.post('/api/notifications/read-all', {}, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      onShowToast('Dhammaan ogeysiisyada waa la akhriyay!', 'success');
    } catch (err) {
      console.error('Error marking all as read:', err);
    }
  };

  const handleClearAll = async () => {
    if (!authToken) return;
    try {
      await axios.post('/api/notifications/clear-all', {}, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      setNotifications([]);
      onShowToast('Dhammaan ogeysiisyada waa la tirtiray!', 'success');
    } catch (err) {
      console.error('Error clearing notifications:', err);
    }
  };

  useEffect(() => {
    setFirstName(user.first_name);
    setLastName(user.last_name);
    setAvatarIndex(user.avatar || '0');
    setBio(user.bio || '');
    setPhone(user.phone || '');
  }, [user.id, user.first_name, user.last_name, user.avatar, user.bio, user.phone]);

  const avatars = [
    { index: '0', color: 'bg-indigo-500', text: '👤' },
    { index: '1', color: 'bg-emerald-500', text: '🦊' },
    { index: '2', color: 'bg-purple-500', text: '🦉' },
    { index: '3', color: 'bg-amber-500', text: '🦁' },
    { index: '4', color: 'bg-red-500', text: '🐼' },
  ];

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName || !lastName) {
      setSettingsError('First name and last name are required.');
      return;
    }

    setIsUpdating(true);
    setSettingsError(null);

    try {
      const response = await axios.put(
        '/api/auth/profile',
        {
          first_name: firstName,
          last_name: lastName,
          avatar: avatarIndex,
          bio,
          phone,
          username: profileUsername
        },
        {
          headers: { Authorization: `Bearer ${authToken}` },
        }
      );

      onProfileUpdate(response.data.user);
      onShowToast('Profile settings updated.', 'success');
      setShowSettings(false);
    } catch (err: any) {
      const errMsg = err.response?.data?.error || 'Failed to save profile.';
      setSettingsError(errMsg);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || !confirmNewPassword) {
      setSettingsError('Password fields are required.');
      return;
    }

    if (newPassword.length < 6) {
      setSettingsError('New password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setSettingsError('New passwords do not match.');
      return;
    }

    setIsUpdating(true);
    setSettingsError(null);

    try {
      await axios.post('/api/auth/change-password', {
        password: newPassword,
      }, {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      setPasswordChangeSuccess(true);
      setNewPassword('');
      setConfirmNewPassword('');
      onShowToast('Account password was updated.', 'success');
    } catch (err: any) {
      const errMsg = err.response?.data?.error || 'Password change failed.';
      setSettingsError(errMsg);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdateOwnerNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingNotice(true);
    setNoticeSaveSuccess(false);
    try {
      await axios.post('/api/admin/system-notice', { notice: ownerNotice }, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      setNoticeSaveSuccess(true);
      onShowToast('Farriinta guud ee nidaamka waa la cusbooneysiiyay!', 'success');
    } catch (err) {
      console.error('Error updating system notice:', err);
      onShowToast('Cusbooneysiinta farriinta waa ay guuldareysatay.', 'error');
    } finally {
      setIsUpdatingNotice(false);
    }
  };

  const getSelectedAvatar = () => {
    const isUrl = user.avatar && (user.avatar.startsWith('http') || user.avatar.startsWith('/') || user.avatar.startsWith('data:image'));
    if (isUrl) {
      return {
        index: 'custom',
        color: 'bg-transparent border border-gray-150 dark:border-gray-800',
        text: (
          <img
            src={user.avatar!}
            alt="Profile"
            className="w-full h-full rounded-full object-cover"
            referrerPolicy="no-referrer"
          />
        )
      };
    }
    const fn = user.first_name || '';
    const ln = user.last_name || '';
    const initials = fn && ln ? `${fn[0]}${ln[0]}`.toUpperCase() : (fn ? fn.slice(0, 2).toUpperCase() : 'QY');
    return {
      index: user.avatar || '0',
      color: 'bg-gradient-to-tr from-indigo-600 via-indigo-600 to-purple-600',
      text: initials
    };
  };

  const currentLang = SUPPORTED_LANGUAGES.find(l => l.code === language) || SUPPORTED_LANGUAGES[0];

  return (
    <div id="layout-root" className="min-h-screen flex flex-col bg-[var(--sl-bg)] text-[var(--sl-text)] transition-colors duration-300 animate-fade-in w-full max-w-full overflow-x-hidden" style={{ direction: isRtl ? 'rtl' : 'ltr' }}>
      
      {/* 1. TOP HEADER — Premium SomLuul navbar */}
      <header className="h-12 sm:h-14 bg-[var(--sl-bg-elevated)]/98 backdrop-blur-xl border-b border-[var(--sl-border)] flex items-center justify-between gap-1 px-2 sm:px-4 shrink-0 transition-colors duration-300 sticky top-0 z-45 w-full max-w-full overflow-visible">
        
        {/* Left Side: Brand Logo & Search */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* Mobile menu trigger */}
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="md:hidden p-2 text-[var(--sl-text-secondary)] hover:text-[var(--sl-text)] hover:bg-[var(--sl-bg-hover)] rounded-xl cursor-pointer transition-colors" aria-label="Open menu"
          >
            <Menu size={18} />
          </button>

          {/* Brand */}
          <div className="flex items-center gap-1 sm:gap-2">
            <button
              type="button"
              onClick={() => {
                onTabChange('feed');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="flex items-center cursor-pointer group shrink-0"
              title="SomLuul Home"
            >
              <span className="md:hidden text-lg font-extrabold leading-none tracking-tight select-none sl-gradient-text max-w-[88px] truncate">
                {appName || 'SomLuul'}
              </span>
              <span className="hidden md:inline-flex">
                <SomLuulLogo 
                  size={34} 
                  variant="horizontal" 
                  className="hover:scale-105 transition-transform duration-200" 
                />
              </span>
            </button>
          </div>

          {/* Search bar */}
          <div className="relative flex items-center">
            <div className={`hidden md:flex items-center gap-1.5 bg-[var(--sl-bg-muted)] px-2.5 py-1 rounded-full border border-transparent hover:border-[var(--sl-border)] focus-within:border-[var(--somluul-primary)] focus-within:ring-2 focus-within:ring-[rgba(79,70,229,0.12)] transition-all ${searchFocused || searchQuery ? 'w-40 lg:w-52' : 'w-28 lg:w-36'}`}>
              <Search size={13} className="text-gray-400 shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={handleSearchFocus}
                onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
                placeholder={language === 'so' ? 'Raadi...' : (language === 'ar' ? 'بحث...' : (language === 'fr' ? 'Rechercher...' : (language === 'es' ? 'Buscar...' : 'Search...')))}
                className="bg-transparent text-[11px] sm:text-xs w-full focus:outline-none border-none text-gray-850 dark:text-white font-medium placeholder-gray-400 min-w-0"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="p-0.5 hover:bg-gray-200 dark:hover:bg-gray-750 rounded-full text-gray-400 hover:text-gray-650 dark:hover:text-white transition-colors"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Desktop Autocomplete Dropdown */}
            {searchFocused && searchQuery.trim() !== '' && (
              <div className="absolute top-11 left-0 w-64 sm:w-72 lg:w-80 bg-white dark:bg-[var(--sl-bg-elevated)] border border-gray-200 dark:border-gray-800 rounded-2xl shadow-xl z-50 overflow-hidden max-h-80 overflow-y-auto py-2 flex flex-col">
                <div className="px-3 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 dark:border-gray-800/60 flex items-center justify-between">
                  <span>Natiijada Raadinta</span>
                  <span>{filteredProfiles.length} la helay</span>
                </div>
                {filteredProfiles.length > 0 ? (
                  <div className="flex flex-col">
                    {filteredProfiles.map((p) => {
                      const handleDisplay = p.is_username_custom ? `@${p.username}` : '';
                      const isUrl = p.avatar && (p.avatar.startsWith('http') || p.avatar.startsWith('/') || p.avatar.startsWith('data:image'));
                      const av = avatars.find(a => a.index === (p.avatar || '0')) || avatars[0];
                      
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            if (onViewProfile) onViewProfile(p.id);
                            setSearchQuery('');
                            setSearchFocused(false);
                          }}
                          className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-100 dark:hover:bg-gray-800 text-left transition-colors border-b border-gray-50 dark:border-gray-850/30 last:border-0"
                        >
                          {isUrl ? (
                            <img
                              src={p.avatar!}
                              alt="Avatar"
                              className="w-9 h-9 rounded-full object-cover shrink-0"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className={`w-9 h-9 rounded-full ${av.color} text-white flex items-center justify-center text-sm font-bold shrink-0`}>
                              {av.text}
                            </div>
                          )}
                          <div className="flex flex-col min-w-0">
                            <span className="text-xs font-bold text-gray-900 dark:text-white truncate">
                              {p.first_name} {p.last_name}
                            </span>
                            {handleDisplay && (
                              <span className="text-[10px] text-gray-500 dark:text-gray-400 font-mono truncate">
                                {handleDisplay}
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : null}
                {searchHashtags.length > 0 && (
                  <div className="px-3 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider border-t border-gray-100 dark:border-gray-800/60">
                    Hashtags
                  </div>
                )}
                {searchHashtags.slice(0, 6).map((h) => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => { setSearchQuery(h); }}
                    className="w-full text-left px-3 py-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    {h}
                  </button>
                ))}
                {searchPosts.length > 0 && (
                  <div className="px-3 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider border-t border-gray-100 dark:border-gray-800/60">
                    Posts
                  </div>
                )}
                {searchPosts.slice(0, 5).map((post: any) => (
                  <button
                    key={post.id}
                    type="button"
                    onClick={() => {
                      onTabChange('feed');
                      setSearchQuery('');
                      setSearchFocused(false);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 border-b border-gray-50 dark:border-gray-850/30 last:border-0"
                  >
                    <p className="text-xs font-bold text-gray-800 dark:text-gray-100 truncate">{post.author?.name || 'Post'}</p>
                    <p className="text-[10px] text-gray-500 truncate">{(post.content || '').slice(0, 80)}</p>
                  </button>
                ))}
                {filteredProfiles.length === 0 && searchPosts.length === 0 && searchHashtags.length === 0 && (
                  <div className="px-4 py-6 text-center text-xs text-gray-500 dark:text-gray-400">
                    "{searchQuery}" lama helin.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Center: Desktop Navigation Tabs */}
        <div className="hidden md:flex items-center h-full max-w-md lg:max-w-xl grow justify-center gap-0 overflow-x-auto no-scrollbar">
          {[
            { id: 'feed', icon: Home, label: t('nav_feed'), show: 'always' },
            { id: 'live', icon: Tv, label: 'Live', show: 'always' },
            { id: 'landing', icon: Globe, label: 'Qeybta Web-ka', show: 'lg' },
            { id: 'marketplace', icon: ShoppingBag, label: t('nav_marketplace'), show: 'always' },
            { id: 'pages', icon: Flag, label: 'Pages', show: 'xl' },
            { id: 'monetization', icon: DollarSign, label: t('nav_monetization'), show: 'xl' },
            { id: 'user_storage', icon: HardDrive, label: t('nav_storage'), show: 'xl' },
            { id: 'apps_download', icon: Download, label: t('nav_downloads'), show: 'lg' },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const hideCls = tab.show === 'xl' ? 'hidden xl:flex' : tab.show === 'lg' ? 'hidden lg:flex' : 'flex';
            return (
              <button
                key={tab.id}
                type="button"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onTabChange(tab.id as any); }}
                title={tab.label}
                className={`relative h-full ${hideCls} items-center justify-center px-2 lg:px-3.5 transition-all border-b-[3px] shrink-0 ${
                  isActive
                    ? 'border-[var(--somluul-primary)] text-indigo-600 dark:border-indigo-500 dark:text-indigo-500'
                    : 'border-transparent text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-850'
                }`}
              >
                <Icon size={isActive ? 20 : 18} className="transition-transform active:scale-95" />
                {isActive && (
                  <span className="absolute bottom-1 text-[8px] font-black tracking-widest uppercase text-indigo-500 hidden xl:inline">
                    •
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Right Side: Grid, Messenger Badge, Notifications Badge, Theme, Language, Profile */}
        <div className="flex items-center gap-1 xs:gap-1.5 sm:gap-2 shrink-0">
          
          {/* Search — FB style */}
          <button
            type="button"
            onClick={() => setSearchFocused(true)}
            className="w-9 h-9 rounded-full bg-[#e4e6eb] dark:bg-[#3a3b3c] flex items-center justify-center text-[#050505] dark:text-[#e4e6eb] hover:bg-[#d8dadf] cursor-pointer transition-all shrink-0 md:hidden"
            title="Search"
          >
            <Search size={18} strokeWidth={2.2} />
          </button>

          {/* Messenger Dropdown & Icon */}
          <div className="relative shrink-0">
            <div 
              onClick={() => {
                setShowMessengerMenu(!showMessengerMenu);
                setShowNotiMenu(false); // Close notifications menu if open
              }}
              className="w-7.5 h-7.5 sm:w-9 sm:h-9 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 hover:scale-105 cursor-pointer relative transition-all shrink-0"
              title={t('nav_messenger')}
            >
              <MessageSquare size={15} className="sm:hidden" />
              <MessageSquare size={17} className="hidden sm:block" />
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[8px] sm:text-[9px] w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full flex items-center justify-center font-bold font-sans animate-pulse">
                1
              </span>
            </div>

            {showMessengerMenu && (
              <div className="fixed inset-x-2 top-14 sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 w-auto sm:w-96 max-w-[calc(100vw-1rem)] bg-white dark:bg-[var(--sl-bg-card)] border border-gray-150 dark:border-gray-800 rounded-2xl shadow-2xl p-4 z-50 animate-fade-in text-left flex flex-col font-sans">
                {/* Header */}
                <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800 mb-3">
                  <h3 className="font-extrabold text-lg text-gray-900 dark:text-white">
                    {language === 'so' ? 'Sheekeyisyo' : 'Chats'}
                  </h3>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setMessengerActiveTab(prev => prev === 'groups' ? 'all' : 'groups')}
                      className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-850 rounded-full text-gray-500 dark:text-gray-400 cursor-pointer"
                      title={language === 'so' ? 'Doro Kooxaha' : 'Groups'}
                    >
                      <MoreHorizontal size={16} />
                    </button>
                    <button 
                      onClick={() => {
                        setShowMessengerMenu(false);
                        const targetProfileObj = {
                          id: 'grp_new_' + Date.now(),
                          first_name: language === 'so' ? 'Koox' : 'Group',
                          last_name: language === 'so' ? 'Cusub' : 'Chat',
                          avatar: '/somluul_logo.png',
                          bio: 'SomLuul Group Chat',
                          phone: ''
                        };
                        localStorage.setItem('somluul_chat_target_profile', JSON.stringify(targetProfileObj));
                        window.dispatchEvent(new CustomEvent('somluul_select_messenger_room', { detail: targetProfileObj }));
                        onTabChange('messenger');
                      }}
                      className="p-1.5 hover:bg-indigo-50 dark:hover:bg-indigo-900/40 rounded-full text-indigo-600 dark:text-indigo-400 cursor-pointer font-bold"
                      title={language === 'so' ? 'Farriin ama Koox Cusub' : 'New Chat'}
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </div>

                {/* Search field */}
                <div className="mb-3 relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <Search size={14} />
                  </span>
                  <input
                    type="text"
                    placeholder={language === 'so' ? 'Messenger-ka Raadi' : 'Search Messenger'}
                    className="w-full pl-9 pr-3 py-1.5 bg-gray-100 dark:bg-gray-800 border-0 rounded-full text-xs text-gray-900 dark:text-white focus:ring-1 focus:ring-indigo-500 placeholder-gray-400 dark:placeholder-gray-500"
                    value={messengerSearchQuery}
                    onChange={(e) => setMessengerSearchQuery(e.target.value)}
                  />
                </div>

                {/* Tabs row */}
                <div className="flex gap-1.5 mb-3 border-b border-gray-100 dark:border-gray-800 pb-2">
                  {[
                    { id: 'all', label: language === 'so' ? 'Dhammaan' : 'All' },
                    { id: 'unread', label: language === 'so' ? 'Aan la akhriyin' : 'Unread' },
                    { id: 'groups', label: language === 'so' ? 'Kooxaha' : 'Groups' },
                    { id: 'communities', label: language === 'so' ? 'Bulshooyinka' : 'Communities' },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setMessengerActiveTab(tab.id as any)}
                      className={`px-3 py-1.5 rounded-full text-[11px] font-bold transition-all ${
                        messengerActiveTab === tab.id
                          ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400 font-extrabold'
                          : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-850'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Rooms list */}
                <div className="space-y-1 max-h-[250px] overflow-y-auto scrollbar-thin flex-1 pr-1">
                  {(() => {
                    // Real data only — no fake/sample groups or communities.
                    // Groups & communities are created and managed inside the full Messenger section.
                    let itemsToRender: any[] = [];

                    if (messengerActiveTab === 'groups' || messengerActiveTab === 'communities') {
                      itemsToRender = []; // Real groups appear after users create them via Messenger
                    } else if (messengerActiveTab === 'unread') {
                      itemsToRender = []; // Unread will be populated from real chat rooms in Messenger
                    } else {
                      // Show real users for direct messages
                      const profileItems = allProfiles
                        .filter(p => p.id !== user.id)
                        .map(p => ({
                          id: p.id,
                          name: `${p.first_name} ${p.last_name}`,
                          avatar: p.avatar || null,
                          lastMessage: p.bio || (language === 'so' ? 'Farriin toos ah u dir...' : 'Send a direct message...'),
                          lastMessageTime: language === 'so' ? 'Hadda' : 'Now',
                          unreadCount: 0,
                          isGroup: false,
                          rawProfile: p
                        }));
                      itemsToRender = profileItems;
                    }

                    if (messengerSearchQuery) {
                      itemsToRender = itemsToRender.filter(item => item.name.toLowerCase().includes(messengerSearchQuery.toLowerCase()));
                    }

                    if (itemsToRender.length === 0) {
                      return (
                        <div className="py-6 text-center text-xs text-gray-400 font-sans">
                          {language === 'so' ? 'Ma jiraan sheekeyisyo halkan ka muuqda.' : 'No chats found in this category.'}
                        </div>
                      );
                    }

                    return itemsToRender.map((room) => {
                      const isValidUrl = room.avatar && (room.avatar.startsWith('http') || room.avatar.startsWith('/') || room.avatar.startsWith('data:image')) && !room.avatar.includes('unsplash.com');
                      const parts = room.name ? room.name.trim().split(' ').filter(p => Boolean(p) && !['user', 'admin'].includes(p.toLowerCase())) : [];
                      const initials = parts.length >= 2 
                        ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
                        : (parts.length === 1 && parts[0].length > 0 ? parts[0].slice(0, 2).toUpperCase() : '💬');

                      return (
                        <div
                          key={room.id}
                          onClick={() => {
                            setShowMessengerMenu(false);
                            const targetProfileObj = room.rawProfile ? {
                              id: room.rawProfile.id,
                              first_name: room.rawProfile.first_name,
                              last_name: room.rawProfile.last_name,
                              avatar: room.rawProfile.avatar,
                              bio: room.rawProfile.bio || '',
                              phone: room.rawProfile.phone || ''
                            } : {
                              id: room.id,
                              first_name: room.name,
                              last_name: '',
                              avatar: room.avatar,
                              bio: room.bio || '',
                              phone: ''
                            };
                            localStorage.setItem('somluul_chat_target_profile', JSON.stringify(targetProfileObj));
                            window.dispatchEvent(new CustomEvent('somluul_select_messenger_room', { detail: targetProfileObj }));
                            onTabChange('messenger');
                          }}
                          className="flex items-center gap-3 p-2 hover:bg-gray-50 dark:hover:bg-gray-800/40 rounded-xl cursor-pointer transition-all group"
                        >
                          <div className="relative shrink-0">
                            {isValidUrl ? (
                              <img src={room.avatar} alt="" className="w-10 h-10 rounded-full object-cover border border-gray-100 dark:border-gray-800" />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-600 via-indigo-600 to-purple-600 text-white flex items-center justify-center font-black text-xs shrink-0 tracking-tight border border-white/30 shadow-xs font-sans">
                                {initials}
                              </div>
                            )}
                            <span className="absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full bg-green-500 border-2 border-white dark:border-[#141b2d]" />
                          </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-baseline mb-0.5">
                            <h4 className="text-xs font-extrabold text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors leading-tight truncate pr-2">
                              {room.name}
                            </h4>
                            <span className="text-[10px] text-gray-400 shrink-0 font-medium">{room.lastMessageTime}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <p className={`text-[11px] truncate leading-tight ${room.unreadCount > 0 ? 'font-black text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>
                              {room.lastMessage}
                            </p>
                            {room.unreadCount > 0 && (
                              <span className="h-2 w-2 rounded-full bg-[var(--somluul-primary)] shrink-0 ml-2" />
                            )}
                          </div>
                        </div>
                      </div>
                    );
                    });
                  })()}
                </div>

                {/* Footer link to See all */}
                <div 
                  onClick={() => {
                    setShowMessengerMenu(false);
                    onTabChange('messenger');
                  }}
                  className="mt-3 pt-2.5 border-t border-gray-100 dark:border-gray-800 text-center text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <MessageSquare size={13} />
                  <span>{language === 'so' ? 'Arag dhammaan inta ku jirta Messenger-ka' : 'See all in Messenger'}</span>
                </div>
              </div>
            )}
          </div>

          {/* Notifications Bell with Badge */}
          <div className="relative shrink-0">
            <div 
              onClick={() => setShowNotiMenu(!showNotiMenu)}
              className="w-7.5 h-7.5 sm:w-9 sm:h-9 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 hover:scale-105 cursor-pointer relative transition-all shrink-0"
              title="Notifications"
            >
              <Bell size={15} className="sm:hidden" />
              <Bell size={17} className="hidden sm:block" />
              {notifications.filter(n => !n.read).length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[8px] sm:text-[9px] w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full flex items-center justify-center font-bold font-sans">
                  {notifications.filter(n => !n.read).length}
                </span>
              )}
            </div>

            {showNotiMenu && (
              <div className="fixed inset-x-2 top-14 sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 w-auto sm:w-96 max-w-[calc(100vw-1rem)] bg-white dark:bg-[var(--sl-bg-card)] border border-gray-150 dark:border-gray-800 rounded-xl shadow-xl p-3 z-50 animate-fade-in max-h-[450px] overflow-y-auto text-left">
                <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-2 mb-2">
                  <span className="font-bold text-sm text-gray-800 dark:text-white">Ogeysiisyada</span>
                  <button
                    type="button"
                    onClick={() => {
                      const next = !soundMuted;
                      setSoundMuted(next);
                      setNotificationSoundMuted(next);
                      onShowToast(next ? (language === 'so' ? 'Codka ogeysiisyada waa la xiray 🔇' : 'Notification sounds muted') : (language === 'so' ? 'Codka ogeysiisyada waa furan yahay 🔊' : 'Notification sounds on'), 'success');
                    }}
                    className="ml-2 text-[10px] px-2 py-0.5 rounded-full border border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800"
                    title={soundMuted ? 'Unmute' : 'Mute'}
                  >
                    {soundMuted ? '🔇' : '🔊'}
                  </button>
                  <div className="flex gap-2">
                    <button 
                      onClick={handleMarkAllAsRead}
                      className="text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer font-semibold"
                    >
                      Dhammaan akhri
                    </button>
                    <span className="text-gray-300 dark:text-gray-700 text-[10px]">|</span>
                    <button 
                      onClick={handleClearAll}
                      className="text-[10px] text-red-500 hover:underline cursor-pointer font-semibold"
                    >
                      Tirtir
                    </button>
                  </div>
                </div>

                {notifications.length === 0 ? (
                  <div className="py-8 text-center text-xs text-gray-500 dark:text-gray-400">
                    Ma jiraan wax ogeysiisyo ah hadda.
                  </div>
                ) : (
                  <div className="space-y-1.5 font-sans">
                    {notifications.map(noti => (
                      <div 
                        key={noti.id}
                        onClick={() => {
                          handleMarkAsRead(noti.id);
                          setShowNotiMenu(false);
                          // Route by notification type / link without breaking existing flows
                          if (noti.type === 'group_post' || noti.type === 'group_join' || noti.type === 'group_invite' || noti.type === 'group_mod' || (noti.link && String(noti.link).includes('tab=groups'))) {
                            onTabChange('groups');
                          } else if (noti.type === 'message' || (noti.link && String(noti.link).includes('tab=messenger'))) {
                            onTabChange('messenger');
                          } else if (noti.senderId && onViewProfile) {
                            onViewProfile(noti.senderId);
                          }
                        }}
                        className={`flex gap-2.5 p-2 rounded-lg cursor-pointer transition-all ${
                          noti.read 
                            ? 'hover:bg-gray-50 dark:hover:bg-gray-800/30' 
                            : 'bg-indigo-50/50 dark:bg-indigo-950/20 hover:bg-indigo-50 dark:hover:bg-indigo-950/30'
                        }`}
                      >
                        {noti.senderAvatar ? (
                          <img 
                            src={noti.senderAvatar} 
                            alt={noti.senderName} 
                            className="w-8 h-8 rounded-full object-cover shrink-0"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-950 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0 font-bold text-xs">
                            {noti.type === 'follow' ? '👤' : noti.type === 'group_post' || noti.type === 'group_join' || noti.type === 'group_invite' || noti.type === 'group_mod' ? '👥' : noti.type === 'like' ? '❤️' : '💬'}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-gray-900 dark:text-gray-150 leading-tight">
                            {noti.title}
                          </p>
                          <p className="text-[11px] text-gray-600 dark:text-gray-350 truncate mt-0.5">
                            {noti.body}
                          </p>
                          <p className="text-[9px] text-gray-400 dark:text-gray-500 mt-1">
                            {new Date(noti.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                        {!noti.read && (
                          <span className="w-2 h-2 rounded-full bg-[var(--somluul-primary)] self-center shrink-0"></span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* MULTI-LANGUAGE SELECTOR */}
          <div className="relative shrink-0">
            <button
              onClick={() => setShowLangMenu(!showLangMenu)}
              className="flex items-center gap-1 px-1.5 py-1 sm:px-3 sm:py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-[#1a2235] dark:hover:bg-gray-800 text-[11px] sm:text-xs font-semibold rounded-full transition-all cursor-pointer border border-transparent shrink-0"
            >
              <span>{currentLang.flag}</span>
              <span className="hidden lg:inline">{currentLang.name}</span>
              <ChevronDown size={10} className="text-gray-400 sm:hidden" />
              <ChevronDown size={12} className="text-gray-400 hidden sm:block" />
            </button>

            {showLangMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-[var(--sl-bg-card)] border border-gray-150 dark:border-gray-800 rounded-xl shadow-xl p-1 z-50 animate-fade-in divide-y divide-gray-50 dark:divide-gray-850 max-h-64 overflow-y-auto">
                {SUPPORTED_LANGUAGES.map(lang => (
                  <button
                    key={lang.code}
                    onClick={() => {
                      setLanguage(lang.code);
                      setShowLangMenu(false);
                    }}
                    className={`w-full flex items-center justify-between px-3.5 py-2 text-xs font-semibold transition-all rounded-lg cursor-pointer ${
                      language === lang.code
                        ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/30 dark:text-indigo-400 font-bold'
                        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span>{lang.flag}</span>
                      <span>{lang.name}</span>
                    </span>
                    {language === lang.code && <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Quick Direct Download Button with dropdown */}
          <div className="relative shrink-0">
            <button
              onClick={() => setShowDownloadMenu(!showDownloadMenu)}
              className="w-8 h-8 text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 rounded-full transition-colors cursor-pointer flex items-center justify-center shrink-0"
              title="Soo deji App-ka"
            >
              <Download size={15} />
            </button>

            {showDownloadMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-[var(--sl-bg-card)] border border-gray-150 dark:border-gray-800 rounded-xl shadow-xl p-1 z-50 animate-fade-in text-left">
                <div className="px-3 py-1.5 text-[9px] font-bold text-gray-400 uppercase tracking-wider">
                  Rakib App (PWA)
                </div>
                <div className="py-1">
                  <button
                    type="button"
                    onClick={() => {
                      setShowDownloadMenu(false);
                      onTabChange('apps_download');
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all rounded-lg cursor-pointer text-left"
                  >
                    <span>📱</span>
                    <span>Install / tilmaamo</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowDownloadMenu(false);
                      onTabChange('apps_download');
                      
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all rounded-lg cursor-pointer text-left"
                  >
                    <span>🪟</span>
                    <span>Windows x64 / Install</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Theme switcher */}
          <button
            onClick={toggleTheme}
            className="w-7.5 h-7.5 sm:w-9 sm:h-9 text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white bg-gray-100 hover:bg-gray-200 dark:bg-[#1a2235] dark:hover:bg-gray-800 rounded-full transition-colors cursor-pointer flex items-center justify-center shrink-0"
            title={theme === 'dark' ? 'Switch to Light' : 'Switch to Dark'}
          >
            {theme === 'dark' ? <Sun size={14} className="sm:hidden" /> : <Moon size={14} className="sm:hidden" />}
            {theme === 'dark' ? <Sun size={15} className="hidden sm:block" /> : <Moon size={15} className="hidden sm:block" />}
          </button>

          {/* Profile Avatar bubble */}
          <div
            onClick={() => {
              if (onViewProfile) {
                onViewProfile(user.id);
              } else {
                setShowSettings(true);
                setSettingsError(null);
                setPasswordChangeSuccess(false);
              }
            }}
            className={`w-7.5 h-7.5 sm:w-9 sm:h-9 rounded-full ${getSelectedAvatar().color} text-white flex items-center justify-center text-xs sm:text-sm font-black cursor-pointer shadow-xs shrink-0 border border-gray-100 dark:border-gray-850 hover:scale-105 transition-all font-sans tracking-tight`}
            title="My Account"
          >
            {getSelectedAvatar().text}
          </div>
        </div>
      </header>
      {/* Mobile search overlay — full width, not crowding the bar */}
      {searchFocused && (
        <div className="md:hidden fixed inset-0 z-[60] bg-black/40" onClick={() => setSearchFocused(false)}>
          <div
            className="bg-[var(--sl-bg-elevated)] border-b border-[var(--sl-border)] p-3 pt-[max(0.75rem,env(safe-area-inset-top))] shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2">
              <div className="flex-1 flex items-center gap-2 bg-[var(--sl-bg-muted)] px-3 py-2 rounded-full">
                <Search size={16} className="text-gray-400 shrink-0" />
                <input
                  autoFocus
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={language === 'so' ? 'Raadi dad, posts...' : 'Search people, posts...'}
                  className="bg-transparent text-sm w-full focus:outline-none min-w-0 text-[var(--sl-text)]"
                />
              </div>
              <button
                type="button"
                className="text-sm font-semibold text-[var(--somluul-primary)] px-2 shrink-0"
                onClick={() => { setSearchFocused(false); setSearchQuery(''); }}
              >
                {language === 'so' ? 'Xir' : 'Close'}
              </button>
            </div>
            {searchQuery.trim() && (
              <div className="mt-2 max-h-[60vh] overflow-y-auto rounded-xl bg-[var(--sl-bg-card)] border border-[var(--sl-border)]">
                {filteredProfiles.slice(0, 8).map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-left border-b border-[var(--sl-border-subtle)] last:border-0"
                    onClick={() => {
                      if (onViewProfile) onViewProfile(p.id);
                      setSearchQuery('');
                      setSearchFocused(false);
                    }}
                  >
                    <span className="text-sm font-semibold text-[var(--sl-text)] truncate">
                      {p.first_name} {p.last_name}
                    </span>
                  </button>
                ))}
                {filteredProfiles.length === 0 && (
                  <p className="px-3 py-4 text-xs text-[var(--sl-text-muted)] text-center">
                    {language === 'so' ? 'Waxba lama helin' : 'No results'}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}


      {/* 2. BODY CONTENT — Sidebar + main viewport */}
      <div className="flex flex-1 overflow-hidden h-[calc(100vh-56px)] pb-14 md:pb-0">
        
        {/* LEFT SIDEBAR SHORTCUTS (Desktop) */}
        <aside id="desktop-sidebar" className="hidden md:flex flex-col w-72 bg-transparent shrink-0 pl-4 pr-2 py-4 overflow-y-auto scrollbar-none transition-colors duration-300 select-none">
          
          <div className="flex flex-col space-y-0.5">
            {/* User Profile Item */}
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (onViewProfile) {
                  onViewProfile(user.id);
                } else {
                  setShowSettings(true);
                  setSettingsError(null);
                  setPasswordChangeSuccess(false);
                }
              }}
              className="w-full flex items-center gap-3.5 px-3 py-2.5 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-800 transition-all text-left"
            >
              <div className={`w-9 h-9 rounded-full ${getSelectedAvatar().color} text-white flex items-center justify-center text-sm font-bold shadow-sm shrink-0`}>
                {getSelectedAvatar().text}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-semibold text-gray-800 dark:text-gray-100 truncate">
                  {user.first_name} {user.last_name}
                </p>
                {user.role === 'admin' && (
                  <span className="text-[10px] text-amber-500 font-extrabold flex items-center gap-1">
                    <Crown size={11} /> SomLuul Owner
                  </span>
                )}
              </div>
            </button>

            {/* Saaxiibada (Friends) Shortcut */}
            <button type="button"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onTabChange('messenger'); }}
              className={`w-full flex items-center gap-3.5 px-3 py-2.5 rounded-xl transition-all text-left ${
                activeTab === 'messenger' ? 'bg-gray-200 dark:bg-gray-800' : 'hover:bg-gray-200 dark:hover:bg-gray-800/60'
              }`}
            >
              <div className="w-9 h-9 rounded-full flex items-center justify-center bg-[#e7f3ff] text-[var(--somluul-primary)] shrink-0 shadow-xs">
                <Users size={18} className="fill-[var(--somluul-primary)]/20" />
              </div>
              <span className="text-[14px] font-semibold text-gray-800 dark:text-gray-150">
                {t('friends')}
              </span>
            </button>

            {/* Dashboard-ka (Dashboard / Storage) Shortcut */}
            <button type="button"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onTabChange('user_storage'); }}
              className={`w-full flex items-center gap-3.5 px-3 py-2.5 rounded-xl transition-all text-left ${
                activeTab === 'user_storage' ? 'bg-gray-200 dark:bg-gray-800' : 'hover:bg-gray-200 dark:hover:bg-gray-800/60'
              }`}
            >
              <div className="w-9 h-9 rounded-full flex items-center justify-center bg-[#f2e7ff] text-[#a033ff] shrink-0 shadow-xs">
                <Grid size={18} />
              </div>
              <span className="text-[14px] font-semibold text-gray-800 dark:text-gray-150">
                {t('dashboard')}
              </span>
            </button>

            {/* Xusuuso (Memories / Support & Platform Hub) Shortcut */}
            <button type="button"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onTabChange('platform_center'); }}
              className={`w-full flex items-center gap-3.5 px-3 py-2.5 rounded-xl transition-all text-left ${
                activeTab === 'platform_center' ? 'bg-gray-200 dark:bg-gray-800' : 'hover:bg-gray-200 dark:hover:bg-gray-800/60'
              }`}
            >
              <div className="w-9 h-9 rounded-full flex items-center justify-center bg-[#fff8e7] text-[#ffb000] shrink-0 shadow-xs">
                <Clock size={18} />
              </div>
              <span className="text-[14px] font-semibold text-gray-800 dark:text-gray-150">
                {t('memories')}
              </span>
            </button>

            {/* La Keydiyay (Saved Files / Cloud storage) Shortcut */}
            <button type="button"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onTabChange('user_storage'); }}
              className="w-full flex items-center gap-3.5 px-3 py-2.5 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-800/60 transition-all text-left"
            >
              <div className="w-9 h-9 rounded-full flex items-center justify-center bg-[#ffe7f3] text-[#ff33a0] shrink-0 shadow-xs">
                <Compass size={18} />
              </div>
              <span className="text-[14px] font-semibold text-gray-800 dark:text-gray-150">
                {t('saved')}
              </span>
            </button>

            {/* Qeybta Web-ka (Landing Page / Web Section) Shortcut */}
            <button type="button"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onTabChange('landing'); }}
              className={`w-full flex items-center gap-3.5 px-3 py-2.5 rounded-xl transition-all text-left ${
                activeTab === 'landing' ? 'bg-gray-200 dark:bg-gray-800' : 'hover:bg-gray-200 dark:hover:bg-gray-800/60'
              }`}
            >
              <div className="w-9 h-9 rounded-full flex items-center justify-center bg-[#f0f9ff] text-[#0284c7] shrink-0 shadow-xs">
                <Globe size={18} />
              </div>
              <span className="text-[14px] font-semibold text-gray-800 dark:text-gray-150">
                Qeybta Web-ka
              </span>
            </button>

            {/* Kooxaha (Groups) Shortcut */}
            <button type="button"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onTabChange('groups'); }}
              className={`w-full flex items-center gap-3.5 px-3 py-2.5 rounded-xl transition-all text-left ${
                activeTab === 'groups' ? 'bg-gray-200 dark:bg-gray-800' : 'hover:bg-gray-200 dark:hover:bg-gray-800/60'
              }`}
            >
              <div className="w-9 h-9 rounded-full flex items-center justify-center bg-[#e7fcf6] text-[#00a88f] shrink-0 shadow-xs">
                <Users size={18} />
              </div>
              <span className="text-[14px] font-semibold text-gray-800 dark:text-gray-150">
                {t('groups')}
              </span>
            </button>

            {/* Muuqaallo gaagaban (Short Videos / Creator Hub) Shortcut */}
            <button type="button"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onTabChange('reels'); }}
              className={`w-full flex items-center gap-3.5 px-3 py-2.5 rounded-xl transition-all text-left ${
                activeTab === 'reels' ? 'bg-gray-200 dark:bg-gray-800' : 'hover:bg-gray-200 dark:hover:bg-gray-800/60'
              }`}
            >
              <div className="w-9 h-9 rounded-full flex items-center justify-center bg-[#ffebeb] text-[#f02849] shrink-0 shadow-xs">
                <Tv size={18} />
              </div>
              <span className="text-[14px] font-semibold text-gray-800 dark:text-gray-150">
                {t('reels')}
              </span>
            </button>

            {/* Goobta suuqa (Marketplace) Shortcut */}
            <button type="button"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onTabChange('marketplace'); }}
              className={`w-full flex items-center gap-3.5 px-3 py-2.5 rounded-xl transition-all text-left ${
                activeTab === 'marketplace' ? 'bg-gray-200 dark:bg-gray-800' : 'hover:bg-gray-200 dark:hover:bg-gray-800/60'
              }`}
            >
              <div className="w-9 h-9 rounded-full flex items-center justify-center bg-[#e7f3ff] text-[var(--somluul-primary)] shrink-0 shadow-xs">
                <ShoppingBag size={18} />
              </div>
              <span className="text-[14px] font-semibold text-gray-800 dark:text-gray-150">
                {t('nav_marketplace')}
              </span>
            </button>
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onTabChange('pages'); }}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                  activeTab === 'pages' ? 'bg-gray-200 dark:bg-gray-800' : 'hover:bg-gray-200 dark:hover:bg-gray-800/60'
                }`}
              >
                <Flag size={20} className="shrink-0" />
                <span className="truncate">Pages</span>
              </button>


            {/* Wax badan arag / Wax yar arag Button */}
            <button
              onClick={() => setShowMoreSidebar(!showMoreSidebar)}
              className="w-full flex items-center gap-3.5 px-3 py-2.5 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-800/60 transition-all text-left"
            >
              <div className="w-9 h-9 rounded-full flex items-center justify-center bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 shrink-0 shadow-xs">
                {showMoreSidebar ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </div>
              <span className="text-[14px] font-semibold text-gray-850 dark:text-gray-150">
                {showMoreSidebar ? t('see_less') : t('see_more')}
              </span>
            </button>

            {/* Expanded items fold */}
            {showMoreSidebar && (
              <div className="space-y-0.5 mt-0.5 animate-fade-in pl-1">
                {/* Dajiso Barnaamijyada (Downloads) */}
                <button type="button"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); onTabChange('apps_download'); }}
                  className={`w-full flex items-center gap-3.5 px-3 py-2.5 rounded-xl transition-all text-left ${
                    activeTab === 'apps_download' ? 'bg-gray-200 dark:bg-gray-800' : 'hover:bg-gray-200 dark:hover:bg-gray-800/60'
                  }`}
                >
                  <div className="w-9 h-9 rounded-full flex items-center justify-center bg-[#f0f0ff] text-[#5c5cff] shrink-0 shadow-xs">
                    <Download size={18} />
                  </div>
                  <span className="text-[14px] font-semibold text-gray-850 dark:text-gray-150">
                    {t('nav_downloads')}
                  </span>
                </button>

                {/* Taageerada & Amniga (Support) */}
                <button type="button"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); onTabChange('platform_center'); }}
                  className="w-full flex items-center gap-3.5 px-3 py-2.5 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-800/60 transition-all text-left"
                >
                  <div className="w-9 h-9 rounded-full flex items-center justify-center bg-teal-50 dark:bg-teal-950/20 text-teal-600 dark:text-teal-400 shrink-0 shadow-xs">
                    <HelpCircle size={18} />
                  </div>
                  <span className="text-[14px] font-semibold text-gray-850 dark:text-gray-150">
                    {t('nav_support')}
                  </span>
                </button>

                {/* Super Admin Center ONLY if real Owner */}
                {user.role === 'admin' && (
                  <button type="button"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); onTabChange('admin_center'); }}
                    className={`w-full flex items-center gap-3.5 px-3 py-2.5 rounded-xl transition-all text-left ${
                      activeTab === 'admin_center' ? 'bg-gray-200 dark:bg-gray-800' : 'hover:bg-gray-200 dark:hover:bg-gray-800/60'
                    }`}
                  >
                    <div className="w-9 h-9 rounded-full flex items-center justify-center bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 shrink-0 shadow-xs">
                      <ShieldAlert size={18} />
                    </div>
                    <span className="text-[14px] font-semibold text-red-650 dark:text-red-400">
                      {t('nav_admin')}
                    </span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Separator line */}
          <div className="border-t border-gray-200/80 dark:border-gray-800 my-3.5 mx-2" />

          {/* Shortcuts header */}
          <div className="text-xs text-gray-550 dark:text-gray-400 font-bold px-2.5 pb-1.5 flex justify-between items-center">
            <span>{t('your_shortcuts')}</span>
            <span className="text-[10px] text-indigo-500 hover:underline cursor-pointer font-medium">{t('edit')}</span>
          </div>

          <div className="flex flex-col space-y-0.5">
            {/* Shortcut Game 1: Ludo World */}
            <button
              onClick={() => onShowToast('🎲 Ludo World! Kulankaan waxaa loo diyaariyay madadaalo SomLuul dhexdeeda ah dhowaan.', 'success')}
              className="w-full flex items-center gap-3.5 px-3 py-2.5 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-800/60 transition-all text-left"
            >
              <div className="w-9 h-9 rounded-full flex items-center justify-center bg-amber-50 dark:bg-amber-950/20 text-amber-500 shrink-0 text-lg shadow-xs border border-amber-100 dark:border-amber-900/20">
                🎲
              </div>
              <span className="text-[14px] font-semibold text-gray-800 dark:text-gray-150">
                {t('ludo_world')}
              </span>
            </button>

            {/* Shortcut Creator Hub */}
            <button
              onClick={() => onShowToast('🌟 Ku soo dhawaada SomLuul Creators! Kala xiriir asxaabta oo abuur waxyaabo cusub si aad lacag u samayso.', 'success')}
              className="w-full flex items-center gap-3.5 px-3 py-2.5 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-800/60 transition-all text-left"
            >
              <div className="w-9 h-9 rounded-full flex items-center justify-center bg-pink-50 dark:bg-pink-950/20 text-pink-500 shrink-0 text-lg shadow-xs border border-pink-100 dark:border-pink-900/20">
                🌟
              </div>
              <span className="text-[14px] font-semibold text-gray-800 dark:text-gray-150">
                {t('somluul_creators')}
              </span>
            </button>
          </div>

          {/* Separator line */}
          <div className="border-t border-gray-200/80 dark:border-gray-800 my-3.5 mx-2" />

          {/* Quick Exit buttons */}
          <div className="px-2 py-1.5 flex gap-2">
            <button
              onClick={() => { setShowSettings(true); setSettingsError(null); setPasswordChangeSuccess(false); }}
              className="flex-1 py-2 border border-gray-200 dark:border-gray-700 hover:bg-gray-150 dark:hover:bg-[#1f293d] text-gray-700 dark:text-gray-300 rounded-xl text-xs font-semibold cursor-pointer text-center transition-all flex items-center justify-center gap-1.5"
            >
              <Settings size={12} />
              {t('manage')}
            </button>
            <button
              onClick={onLogout}
              className="flex-1 py-2 bg-red-50 hover:bg-red-150 text-red-600 dark:bg-red-950/20 dark:text-red-400 rounded-xl text-xs font-bold cursor-pointer flex items-center justify-center gap-1.5 transition-all"
            >
              <LogOut size={12} />
              {t('nav_logout')}
            </button>
          </div>
        </aside>

        {/* CONTAINER WORKSPACE FOR CORE VIEWPORTS */}
        <main className="flex-1 p-4 sm:p-6 overflow-y-auto bg-[var(--sl-bg)] dark:bg-[var(--sl-bg)]">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>

      {/* 3. MOBILE DRAWER SIDEBAR */}
      {isSidebarOpen && (
        <div id="mobile-sidebar-overlay" className="fixed inset-0 z-50 flex md:hidden bg-black/50 backdrop-blur-xs">
          <div id="mobile-sidebar-card" className="w-64 bg-white dark:bg-[var(--sl-bg-card)] h-full flex flex-col shadow-2xl relative fade-in-up">
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="absolute right-4 top-4 p-2 text-gray-500 hover:text-gray-850 dark:text-gray-400 rounded-lg cursor-pointer"
            >
              <X size={20} />
            </button>

            {/* Brand */}
            <div className="h-16 flex items-center px-5 border-b border-gray-150 dark:border-gray-800">
              <AppLogo 
                src={appLogo} 
                alt={appName} 
                className="w-9 h-9 rounded-lg" 
                containerClassName="shrink-0"
              />
              <span className="ml-2.5 font-bold text-base font-sans tracking-tight text-gray-955 dark:text-white truncate">
                {appName} App
              </span>
            </div>

            {/* Mobile Search bar */}
            <div className="px-4 py-3 border-b border-gray-150 dark:border-gray-800 relative bg-gray-50/50 dark:bg-[#101625]/40">
              <div className="flex items-center gap-2 bg-gray-100 dark:bg-[var(--sl-bg-muted)] px-3.5 py-1.5 rounded-full border border-gray-200/40 dark:border-gray-750/30 w-full">
                <Search size={14} className="text-gray-400 shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={handleSearchFocus}
                  onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
                  placeholder="Raadi SomLuul..."
                  className="bg-transparent text-xs w-full focus:outline-none border-none text-gray-850 dark:text-white font-medium placeholder-gray-400"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="p-0.5 hover:bg-gray-200 dark:hover:bg-gray-750 rounded-full text-gray-400 hover:text-gray-650 dark:hover:text-white transition-colors"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>

              {/* Autocomplete Dropdown for Mobile */}
              {searchFocused && searchQuery.trim() !== '' && (
                <div className="absolute top-12 left-4 right-4 bg-white dark:bg-[var(--sl-bg-elevated)] border border-gray-200 dark:border-gray-800 rounded-2xl shadow-xl z-55 overflow-hidden max-h-60 overflow-y-auto py-1.5 flex flex-col">
                  {filteredProfiles.length > 0 ? (
                    <div className="flex flex-col divide-y divide-gray-50 dark:divide-gray-850/40">
                      {filteredProfiles.map((p) => {
                        const handleDisplay = p.is_username_custom ? `@${p.username}` : '';
                        const isUrl = p.avatar && (p.avatar.startsWith('http') || p.avatar.startsWith('/') || p.avatar.startsWith('data:image'));
                        const av = avatars.find(a => a.index === (p.avatar || '0')) || avatars[0];
                        
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => {
                              if (onViewProfile) onViewProfile(p.id);
                              setSearchQuery('');
                              setSearchFocused(false);
                              setIsSidebarOpen(false);
                            }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 text-left transition-colors"
                          >
                            {isUrl ? (
                              <img
                                src={p.avatar!}
                                alt="Avatar"
                                className="w-8 h-8 rounded-full object-cover shrink-0"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <div className={`w-8 h-8 rounded-full ${av.color} text-white flex items-center justify-center text-xs font-bold shrink-0`}>
                                {av.text}
                              </div>
                            )}
                            <div className="flex flex-col min-w-0">
                              <span className="text-xs font-bold text-gray-900 dark:text-white truncate">
                                {p.first_name} {p.last_name}
                              </span>
                              {handleDisplay && (
                                <span className="text-[10px] text-gray-500 dark:text-gray-400 font-mono truncate">
                                  {handleDisplay}
                                </span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="px-3 py-4 text-center text-xs text-gray-550 dark:text-gray-400">
                      Qofna lama helin.
                    </div>
                  )}
                </div>
              )}
            </div>

            <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto scrollbar-none">
              <button
                onClick={() => { onTabChange('feed'); setIsSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  activeTab === 'feed'
                    ? 'bg-[var(--somluul-primary)] text-white'
                    : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-[#1a2235]'
                }`}
              >
                <Compass size={16} />
                <span>{t('nav_feed')}</span>
              </button>

              <button
                onClick={() => { onTabChange('messenger'); setIsSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  activeTab === 'messenger'
                    ? 'bg-[var(--somluul-primary)] text-white'
                    : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-[#1a2235]'
                }`}
              >
                <MessageSquare size={16} />
                <span>{t('nav_messenger')}</span>
              </button>

              <button
                onClick={() => { onTabChange('marketplace'); setIsSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  activeTab === 'marketplace'
                    ? 'bg-[var(--somluul-primary)] text-white'
                    : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-[#1a2235]'
                }`}
              >
                <ShoppingBag size={16} />
                <span>{t('nav_marketplace')}</span>
              </button>
              <button
                type="button"
                onClick={() => { onTabChange('pages'); setIsSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold ${
                  activeTab === 'pages'
                    ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300'
                    : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                <Flag size={18} />
                <span>Pages</span>
              </button>


              <button
                onClick={() => { onTabChange('monetization'); setIsSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  activeTab === 'monetization'
                    ? 'bg-[var(--somluul-primary)] text-white'
                    : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-[#1a2235]'
                }`}
              >
                <DollarSign size={16} />
                <span>{t('nav_monetization')}</span>
              </button>

              <button
                onClick={() => { onTabChange('user_storage'); setIsSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  activeTab === 'user_storage'
                    ? 'bg-[var(--somluul-primary)] text-white'
                    : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-[#1a2235]'
                }`}
              >
                <HardDrive size={16} />
                <span>{t('nav_storage')}</span>
              </button>

              <button
                onClick={() => { onTabChange('apps_download'); setIsSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  activeTab === 'apps_download'
                    ? 'bg-[var(--somluul-primary)] text-white'
                    : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-[#1a2235]'
                }`}
              >
                <Download size={16} />
                <span>{t('nav_downloads')}</span>
              </button>

              <button
                onClick={() => { onTabChange('platform_center'); setIsSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  activeTab === 'platform_center'
                    ? 'bg-[var(--somluul-primary)] text-white'
                    : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-[#1a2235]'
                }`}
              >
                <HelpCircle size={16} />
                <span>{t('nav_support')}</span>
              </button>

              <button
                onClick={() => { onTabChange('landing'); setIsSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  activeTab === 'landing'
                    ? 'bg-[var(--somluul-primary)] text-white'
                    : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-[#1a2235]'
                }`}
              >
                <Globe size={16} />
                <span>Qeybta Web-ka</span>
              </button>

              {user.role === 'admin' && (
                <button
                  onClick={() => { onTabChange('admin_center'); setIsSidebarOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                    activeTab === 'admin_center'
                      ? user.role === 'admin'
                        ? 'bg-amber-600 text-white shadow-md shadow-amber-500/10'
                        : 'bg-red-650 text-white'
                      : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-[#1a2235]'
                  }`}
                >
                  {user.role === 'admin' ? (
                    <>
                      <Crown size={16} className={activeTab === 'admin_center' ? 'text-white' : 'text-amber-500'} />
                      <span>Qeybta Owner-ka</span>
                    </>
                  ) : (
                    <>
                      <ShieldAlert size={16} />
                      <span>{t('nav_admin')}</span>
                    </>
                  )}
                </button>
              )}
            </nav>

            <div className="p-4 border-t border-gray-150 dark:border-gray-800 space-y-3">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-full ${getSelectedAvatar().color} text-white flex items-center justify-center text-base`}>
                  {getSelectedAvatar().text}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold truncate text-gray-955 dark:text-white">
                    {user.first_name} {user.last_name}
                  </p>
                  <p className="text-[10px] text-gray-400 uppercase font-bold mt-0.5">
                    {user.role === 'admin' ? (
                      <span className="text-amber-500 font-extrabold flex items-center gap-1">
                        <Crown size={12} /> SomLuul Owner
                      </span>
                    ) : user.role === 'admin' ? (
                      'Administrator'
                    ) : (
                      'Normal User'
                    )}
                  </p>
                </div>
              </div>

              {(user.phone || user.bio) && (
                <div className="bg-gray-50 dark:bg-gray-900/60 p-2.5 rounded-xl border border-gray-100 dark:border-gray-850/60 space-y-1 animate-fade-in">
                  {user.phone && (
                    <p className="text-[10px] font-mono text-gray-500 dark:text-gray-400 flex items-center gap-1">
                      <span className="font-extrabold text-gray-400 dark:text-gray-500 text-[9px] uppercase">Tel:</span> {user.phone}
                    </p>
                  )}
                  {user.bio && (
                    <p className="text-[10px] text-gray-600 dark:text-gray-400 font-medium leading-relaxed italic">
                      "{user.bio}"
                    </p>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => { setShowSettings(true); setIsSidebarOpen(false); setSettingsError(null); setPasswordChangeSuccess(false); }}
                  className="px-3 py-2 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 text-gray-600 dark:text-gray-300 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Settings
                </button>
                <button
                  onClick={onLogout}
                  className="px-3 py-2 bg-red-50 text-red-600 dark:bg-red-950/20 dark:text-red-400 rounded-lg text-xs font-semibold cursor-pointer flex items-center justify-center gap-1"
                >
                  <LogOut size={12} />
                  Exit
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. SETTINGS MODAL / SLIDE-OUT PANEL */}
      {showSettings && (
        <div id="settings-overlay" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div id="settings-card" className="w-full max-w-xl bg-white dark:bg-[var(--sl-bg-card)] border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800/80">
              <h2 className="text-base font-bold text-gray-900 dark:text-white font-sans flex items-center gap-2">
                <User size={18} /> My Account & Settings
              </h2>
              <button
                onClick={() => setShowSettings(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-white bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 rounded-lg cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-8" style={{ direction: 'ltr' }}>
              
              {/* Error label */}
              {settingsError && (
                <div id="settings-error" className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-900/40 rounded-xl text-xs">
                  <AlertCircle className="shrink-0 mt-0.5" size={14} />
                  <span>{settingsError}</span>
                </div>
              )}

              {/* Owner Exclusive Controls */}
              {user.role === 'admin' && (
                <div className="bg-amber-500/5 dark:bg-amber-950/10 border border-amber-500/20 dark:border-amber-900/40 rounded-2xl p-5 space-y-4 relative overflow-hidden animate-fade-in">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-amber-500/10 to-transparent rounded-full blur-2xl pointer-events-none" />
                  
                  <div className="flex items-center gap-2 pb-2.5 border-b border-amber-500/10 dark:border-amber-900/20">
                    <Crown className="text-amber-500" size={18} />
                    <div>
                      <h3 className="text-xs font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest">
                        Maamulka Gaarka ah ee Owner-ka
                      </h3>
                      <p className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">
                        SomLuul Owner-only Settings Panel
                      </p>
                    </div>
                  </div>

                  <form onSubmit={handleUpdateOwnerNotice} className="space-y-3.5">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-1">
                        <Megaphone size={12} className="text-amber-500" />
                        Farriinta Guud ee Nidaamka (Global Announcement Bulletin)
                      </label>
                      <textarea
                        rows={3}
                        className="w-full px-3.5 py-2.5 bg-white dark:bg-[var(--sl-bg-muted)] border border-amber-500/15 dark:border-amber-900/30 rounded-xl text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 font-semibold leading-relaxed"
                        placeholder="Halkan ku qor farriinta aad rabto in dhammaan isticmaalayaasha SomLuul arkaan (e.g. updates, news, links)..."
                        value={ownerNotice}
                        onChange={(e) => setOwnerNotice(e.target.value)}
                      />
                    </div>

                    <div className="flex items-center justify-between gap-4">
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-extrabold flex items-center gap-1">
                        👑 Absolute Protection Active
                      </span>
                      <button
                        type="submit"
                        disabled={isUpdatingNotice}
                        className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold rounded-xl text-[11px] transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50 uppercase tracking-wider"
                      >
                        {isUpdatingNotice ? <RefreshCw className="animate-spin" size={12} /> : <Save size={12} />}
                        Cusbooneysii Bulletin-ka
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Form 1: Profile edits */}
              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest flex items-center gap-1.5 pb-2 border-b border-gray-50 dark:border-gray-800">
                  <Edit3 size={13} /> Edit Profile Info & Photo
                </h3>

                {/* Avatar grid selection */}
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">Select Avatar Icon</label>
                    <div className="flex gap-3">
                      {avatars.map((av) => (
                        <button
                          key={av.index}
                          type="button"
                          onClick={() => setAvatarIndex(av.index)}
                          className={`w-11 h-11 rounded-full ${av.color} text-white flex items-center justify-center text-lg transition-transform hover:scale-105 cursor-pointer relative ${
                            avatarIndex === av.index
                              ? 'ring-4 ring-indigo-500 ring-offset-2 dark:ring-offset-[#141b2d] scale-105'
                              : 'opacity-70 hover:opacity-100'
                          }`}
                        >
                          {av.text}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Custom Avatar Upload from local gallery */}
                  <div className="p-4 bg-gray-50 dark:bg-[#1a2235] rounded-xl border border-dashed border-gray-200 dark:border-gray-800/80 space-y-3">
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Ama Ku Shobo Sawirkaaga (Or Upload Profile Photo)
                    </label>
                    <div className="flex items-center gap-3">
                      {avatarIndex && (avatarIndex.startsWith('http') || avatarIndex.startsWith('/') || avatarIndex.startsWith('data:image')) ? (
                        <img
                          src={avatarIndex}
                          alt="Preview"
                          className="w-12 h-12 rounded-full object-cover border-2 border-indigo-500 shadow-md shrink-0"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500 flex items-center justify-center font-bold text-xs border border-indigo-200 dark:border-indigo-900 shrink-0">
                          No Photo
                        </div>
                      )}
                      <div className="flex-1">
                        <input
                          type="file"
                          id="profile-avatar-file-input"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;

                            setIsUpdating(true);
                            setSettingsError(null);

                            const reader = new FileReader();
                            reader.onloadend = async () => {
                              try {
                                const base64Str = reader.result as string;
                                const response = await axios.post('/api/auth/profile/avatar', {
                                  avatar: base64Str
                                }, {
                                  headers: {
                                    'Content-Type': 'application/json',
                                    Authorization: `Bearer ${authToken}`
                                  }
                                });
                                const customUrl = response.data.avatar;
                                setAvatarIndex(customUrl);
                                onProfileUpdate(response.data.user);
                                onShowToast('Sawirka profile-ka waa lagu guuleystay in la upload gareeyo!', 'success');
                              } catch (err: any) {
                                const msg = err.response?.data?.error || 'Failed to upload profile picture.';
                                setSettingsError(msg);
                              } finally {
                                setIsUpdating(false);
                              }
                            };

                            reader.onerror = () => {
                              setSettingsError('Error reading file.');
                              setIsUpdating(false);
                            };

                            reader.readAsDataURL(file);
                          }}
                        />
                        <label
                          htmlFor="profile-avatar-file-input"
                          className="inline-flex items-center gap-2 px-3.5 py-2 bg-[var(--somluul-primary)] hover:brightness-110 text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-sm transition-all cursor-pointer hover:-translate-y-0.5 active:translate-y-0"
                        >
                          Soo Dooro Sawirkaaga (Choose Image)
                        </label>
                        <p className="text-[10px] text-gray-400 mt-1.5">PNG, JPG, ama WEBP (Ugu badnaan 5MB)</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">First Name</label>
                    <input
                      type="text"
                      required
                      className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-[var(--sl-bg-muted)] border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">Last Name</label>
                    <input
                      type="text"
                      required
                      className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-[var(--sl-bg-muted)] border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 text-gray-400" size={16} />
                    <input
                      type="email"
                      disabled
                      className="w-full pl-9 pr-3 py-2.5 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-800 rounded-xl text-sm text-gray-400 dark:text-gray-500 cursor-not-allowed"
                      value={user.email}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">Username (@handle)</label>
                  <input
                    type="text"
                    className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-[var(--sl-bg-muted)] border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                    placeholder="xamseyare"
                    value={profileUsername}
                    onChange={(e) => setProfileUsername(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">Nambarka Telefoonka (Phone Number)</label>
                  <input
                    type="text"
                    className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-[var(--sl-bg-muted)] border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                    placeholder="+252 61..."
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">Bio (Muuqaalka Profile-ka)</label>
                  <textarea
                    rows={2}
                    className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-[var(--sl-bg-muted)] border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                    placeholder="Halkan ku qor wax kugu saabsan (e.g. Dreamer, Developer, Mogadishu)..."
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                  />
                </div>

                <button
                  type="submit"
                  disabled={isUpdating}
                  className="px-4 py-2 bg-[var(--somluul-primary)] hover:brightness-110 text-white font-medium rounded-xl text-xs transition-all shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isUpdating ? <RefreshCw className="animate-spin" size={14} /> : <Save size={14} />}
                  Save Information
                </button>
              </form>

              {/* Form 2: Password change */}
              <form onSubmit={handleUpdatePassword} className="space-y-4">
                <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest flex items-center gap-1.5 pb-2 border-b border-gray-50 dark:border-gray-800">
                  <Key size={13} /> Adjust Account Credentials
                </h3>

                {passwordChangeSuccess && (
                  <div id="password-success-alert" className="flex items-center gap-2 p-3 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/30 rounded-xl text-xs">
                    <CheckCircle2 size={14} />
                    <span>Your account credentials have been successfully updated.</span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">New Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 text-gray-400" size={14} />
                      <input
                        type="password"
                        placeholder="••••••••"
                        className="w-full pl-9 pr-3 py-2.5 bg-gray-50 dark:bg-[var(--sl-bg-muted)] border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">Confirm New Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 text-gray-400" size={14} />
                      <input
                        type="password"
                        placeholder="••••••••"
                        className="w-full pl-9 pr-3 py-2.5 bg-gray-50 dark:bg-[var(--sl-bg-muted)] border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                        value={confirmNewPassword}
                        onChange={(e) => setConfirmNewPassword(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isUpdating}
                  className="px-4 py-2 bg-[var(--somluul-primary)] hover:brightness-110 text-white font-medium rounded-xl text-xs transition-all shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isUpdating ? <RefreshCw className="animate-spin" size={14} /> : <Key size={14} />}
                  Adjust Credentials
                </button>
              </form>

              {/* Form 3: Custom Domain & Short Link Branding */}
              <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest flex items-center gap-1.5 pb-2 border-b border-gray-50 dark:border-gray-800">
                  <Globe size={13} /> Custom Domain & Branding
                </h3>

                <div className="p-4 bg-gradient-to-br from-indigo-500/5 to-indigo-500/5 dark:from-blue-950/20 dark:to-indigo-950/10 rounded-2xl border border-indigo-500/10 dark:border-indigo-900/30 space-y-3.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-xs font-bold text-gray-900 dark:text-white">SomLuul.com</span>
                    </div>
                    <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 font-extrabold uppercase tracking-wide border border-emerald-150 dark:border-emerald-900/30">
                      Active & Connected
                    </span>
                  </div>

                  <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed font-medium">
                    The short branded domain <strong>SomLuul.com</strong> is fully connected to your platform server. All post sharing, messenger referral codes, group invitation links, and desktop launch configurations have been shortened automatically.
                  </p>

                  <div className="flex items-center gap-2.5 p-2.5 bg-white dark:bg-[#1a2235] rounded-xl border border-gray-100 dark:border-gray-800/80">
                    <span className="text-xs font-mono font-semibold text-gray-700 dark:text-gray-300 flex-1 truncate">
                      https://somluul.com
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText('https://somluul.com');
                        onShowToast('Link-ga rasmiga ah ee SomLuul.com waa la koobiyeeyay!', 'success');
                      }}
                      className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 rounded-lg text-[10px] font-extrabold uppercase tracking-wider cursor-pointer transition-colors"
                    >
                      Copy Link
                    </button>
                  </div>
                </div>
              </div>

              {/* Form 4: Global Language Selector */}
              <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest flex items-center gap-1.5 pb-2 border-b border-gray-50 dark:border-gray-800">
                  <Globe size={13} /> Global Language & i18n
                </h3>

                <div className="space-y-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 text-gray-400" size={14} />
                    <input
                      type="text"
                      placeholder="Raadi luqad... / Search language..."
                      className="w-full pl-9 pr-3 py-2.5 bg-gray-50 dark:bg-[var(--sl-bg-muted)] border border-gray-200 dark:border-gray-700 rounded-xl text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                      value={langSearchQuery}
                      onChange={(e) => setLangSearchQuery(e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[220px] overflow-y-auto p-1 border border-gray-100 dark:border-gray-800 rounded-xl bg-gray-50/50 dark:bg-gray-900/10">
                    {SUPPORTED_LANGUAGES.filter(lang => 
                      lang.name.toLowerCase().includes(langSearchQuery.toLowerCase()) ||
                      lang.code.toLowerCase().includes(langSearchQuery.toLowerCase())
                    ).map(lang => (
                      <button
                        key={lang.code}
                        type="button"
                        onClick={async () => {
                          await setLanguage(lang.code);
                          onShowToast(`Luuqadda waxaa loo beddelay: ${lang.name}`, 'success');
                        }}
                        className={`flex items-center gap-2.5 p-2 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                          language === lang.code
                            ? 'bg-indigo-50 text-indigo-600 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-400 dark:border-indigo-900/60 font-bold shadow-xs'
                            : 'bg-white dark:bg-[var(--sl-bg-card)] text-gray-600 dark:text-gray-300 border-gray-150 dark:border-gray-800/80 hover:bg-gray-50 dark:hover:bg-gray-800'
                        }`}
                      >
                        <span className="text-sm shrink-0">{lang.flag}</span>
                        <span className="truncate flex-1 text-left">{lang.name}</span>
                        {language === lang.code && <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0"></span>}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile bottom navigation — real app-style nav */}
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-[var(--sl-bg-elevated)]/95 border-t border-[var(--sl-border)] backdrop-blur-xl safe-area-pb sl-bottom-nav"
        aria-label="Mobile primary"
      >
        <div className="flex items-stretch justify-around h-[52px] max-w-lg mx-auto px-1">
          {[
            { id: 'feed', icon: Home, label: 'Home' },
            { id: 'groups', icon: Users, label: 'Friends' },
            { id: 'reels', icon: Tv, label: 'Video' },
            { id: '__notifs__', icon: Bell, label: 'Alerts' },
            { id: '__menu__', icon: Menu, label: 'Menu' },
          ].map((item) => {
            const Icon = item.icon;
            const isActive = item.id !== '__notifs__' && item.id !== '__menu__' && activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                aria-label={item.label}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (item.id === '__notifs__') {
                    setShowNotiMenu(v => !v);
                    setShowMessengerMenu(false);
                    return;
                  }
                  if (item.id === '__menu__') {
                    setIsSidebarOpen(true);
                    return;
                  }
                  onTabChange(item.id as any);
                }}
                className={`flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors relative ${
                  isActive
                    ? 'text-[var(--somluul-primary)]'
                    : 'text-[#65676b] dark:text-gray-400'
                }`}
              >
                <Icon size={24} strokeWidth={isActive ? 2.5 : 1.8} />
                {isActive && (
                  <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-[var(--somluul-primary)] rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Floating Chat Popups Overlay */}
      <FloatingChat
        user={user}
        authToken={authToken}
        onShowToast={onShowToast}
        onViewProfile={onViewProfile}
      />
    </div>
  );
};
