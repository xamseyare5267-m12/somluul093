import React, { useState } from 'react';
import { 
  X, Shield, AlertTriangle, Calendar, Users, Eye, 
  FolderMinus, Info, Phone, BadgeAlert, HelpCircle, Flame, ArrowLeft
} from 'lucide-react';
import { ChatRoom } from '../../types';

interface UserProfileSidebarProps {
  room: ChatRoom;
  onClose: () => void;
  matchingRealProfile: any;
  isBlocked: boolean;
  onToggleBlock: () => void;
  language?: string;
  onReport: (reason: string) => void;
  onViewProfile?: (userId: string) => void;
}

export const UserProfileSidebar: React.FC<UserProfileSidebarProps> = ({
  room,
  onClose,
  matchingRealProfile,
  isBlocked,
  onToggleBlock,
  language,
  onReport,
  onViewProfile
}) => {
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [reportText, setReportText] = useState('');
  const [reportSuccess, setReportSuccess] = useState(false);

  // Derive target profile ID for profile viewing
  const targetProfileId = matchingRealProfile?.id || room?.id || room?.id || '';

  // Derive meta profiles values
  const currentBio = matchingRealProfile?.bio || room?.bio || 'Halkan kuma qorna wax Taariikh Nololeed ah.';
  const currentPhone = matchingRealProfile?.phone || room?.phone || '';
  const emailPrefix = matchingRealProfile?.email ? `@${matchingRealProfile.email.split('@')[0]}` : `@${room.name.toLowerCase().replace(/[^a-z0-0]/g, '') || 'user'}`;
  const displayEmail = matchingRealProfile?.email || `${room.name.toLowerCase().replace(/[^a-z0-0]/g, '') || 'user'}@somluul.com`;
  
  // Real profile data only — never invent random stats
  const joinDate = matchingRealProfile?.created_at
    ? new Date(matchingRealProfile.created_at).toLocaleDateString([], { year: 'numeric', month: 'long', day: 'numeric' })
    : (language === 'so' ? 'Lama yaqaan' : 'Unknown');

  const sharedGroupsCount = room.isGroup ? 1 : 0;
  const sharedMediaCount = 0;
  const mutualContactsCount = 0;

  // Cover photo - a beautiful backdrop gradient or pattern matching their avatar color
  const coverBgGradient = "bg-gradient-to-r from-indigo-600/40 via-amber-500/30 to-purple-600/30";

  const renderSidebarAvatar = (avatarUrl: string | null | undefined, name: string) => {
    const isValidUrl = avatarUrl && (avatarUrl.startsWith('http') || avatarUrl.startsWith('data:image') || avatarUrl.startsWith('/'));
    if (isValidUrl) {
      return (
        <img 
          src={avatarUrl} 
          alt={name} 
          className="w-24 h-24 rounded-full object-cover border-4 border-white dark:border-gray-900 shadow-md cursor-pointer hover:scale-105 transition-transform"
          referrerPolicy="no-referrer"
          onClick={() => {
            if (onViewProfile) onViewProfile(targetProfileId);
          }}
          title="Eeg profile-ka buuxa / View full profile"
        />
      );
    }
    const parts = name ? name.trim().split(' ').filter(p => Boolean(p) && !['user', 'admin'].includes(p.toLowerCase())) : [];
    const initials = parts.length >= 2 
      ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
      : (parts.length === 1 && parts[0].length > 0 ? parts[0].slice(0, 2).toUpperCase() : '💬');

    return (
      <div 
        onClick={() => {
          if (onViewProfile) onViewProfile(targetProfileId);
        }}
        className="w-24 h-24 rounded-full bg-gradient-to-tr from-indigo-600 via-indigo-600 to-purple-600 text-white flex items-center justify-center font-black text-2xl border-4 border-white dark:border-gray-900 shadow-md tracking-tight font-sans cursor-pointer hover:scale-105 transition-transform"
        title="Eeg profile-ka buuxa / View full profile"
      >
        {initials}
      </div>
    );
  };

  const handleSendReport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportText.trim()) return;
    onReport(reportText);
    setReportSuccess(true);
    setReportText('');
    setTimeout(() => {
      setReportSuccess(false);
      setShowReportDialog(false);
    }, 2000);
  };

  return (
    <div className="w-full h-full flex flex-col bg-gray-50/50 dark:bg-[#111624] overflow-y-auto scrollbar-thin">
      {/* Header section */}
      <div className="flex justify-between items-center p-3.5 border-b border-gray-150 dark:border-gray-800/60 bg-white dark:bg-[#141b2d]">
        <div className="flex items-center gap-2">
          <button 
            type="button"
            onClick={onClose}
            className="p-1.5 text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg cursor-pointer transition-colors"
            title="Ka noqo / Back"
          >
            <ArrowLeft size={16} />
          </button>
          <h4 className="font-bold text-xs text-gray-900 dark:text-white uppercase tracking-wider">
            {room.isGroup ? (language === 'so' ? 'Macluumaadka Kooxda' : 'Group Details') : (language === 'so' ? 'Xogta Xiriirka' : 'Contact Settings')}
          </h4>
        </div>
        <button 
          type="button"
          onClick={onClose}
          className="p-1.5 text-gray-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg cursor-pointer transition-colors"
          title="Xidh Xogta / Close Info (X)"
        >
          <X size={16} />
        </button>
      </div>

      {/* Profile Core (With cover photo and big avatar) */}
      <div className="relative pb-4 border-b border-gray-150 dark:border-gray-800/60 bg-white dark:bg-[#141b2d] space-y-3">
        {/* Cover Photo Backdrop */}
        <div className={`h-28 w-full relative overflow-hidden ${coverBgGradient}`}>
          <div className="absolute inset-0 bg-black/10 backdrop-blur-3xs" />
        </div>

        {/* Avatar centered */}
        <div className="flex flex-col items-center text-center -mt-14 px-4 relative z-10 space-y-2">
          <div className="relative">
            {renderSidebarAvatar(room.avatar, room.name)}
            {!isBlocked && (
              <span className="absolute bottom-1.5 right-1.5 w-4 h-4 rounded-full bg-green-500 border-2 border-white dark:border-gray-900 shadow-sm" />
            )}
          </div>

          <div>
            <h3 
              onClick={() => {
                if (onViewProfile) onViewProfile(targetProfileId);
              }}
              className="font-bold text-base text-gray-955 dark:text-white flex items-center justify-center gap-1.5 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              title="Eeg profile-ka buuxa / View full profile"
            >
              {room.name}
              {room.id === 'r1' && (
                <span className="text-[9px] bg-blue-500 text-white font-extrabold px-1.5 py-0.5 rounded-full">✓</span>
              )}
            </h3>
            <p className="text-[10px] text-gray-400 font-mono mt-0.5">{emailPrefix}</p>
            <p className="text-[10px] text-amber-500 font-bold uppercase tracking-wider mt-1">
              {isBlocked 
                ? (language === 'so' ? 'Waa xaniban yahay' : 'Blocked') 
                : (language === 'so' ? 'Hada wuu online yahay' : 'Online')}
            </p>

            <button
              type="button"
              onClick={() => {
                if (onViewProfile) onViewProfile(targetProfileId);
              }}
              className="w-full mt-3 py-2 px-3 bg-[var(--somluul-primary)] hover:brightness-110 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center justify-center gap-2"
            >
              <Eye size={15} />
              <span>{language === 'so' ? 'Eeg Profile-ka Buuxa (Sawiro & Qoraalo)' : 'View Full Profile'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Details Fields */}
      <div className="p-4 space-y-4">
        {/* Contact info cards */}
        <div className="space-y-3 bg-white dark:bg-[#141b2d] p-3.5 rounded-2xl border border-gray-200/50 dark:border-gray-800/50 shadow-2xs">
          
          {/* Bio / Description */}
          <div className="space-y-1">
            <span className="text-[9px] font-bold uppercase tracking-wider text-gray-400 block">
              {language === 'so' ? 'Taariikh Nololeed (Bio)' : 'Bio / Description'}
            </span>
            <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed font-medium">
              {isBlocked ? '–' : currentBio}
            </p>
          </div>

          <div className="w-full h-px bg-gray-100 dark:bg-gray-800 my-2" />

          {/* Phone Number */}
          <div className="space-y-1">
            <span className="text-[9px] font-bold uppercase tracking-wider text-gray-400 block">
              {language === 'so' ? 'Telefoonka' : 'Phone Number'}
            </span>
            <p className="text-xs text-blue-600 dark:text-blue-400 font-bold font-mono">
              {currentPhone}
            </p>
          </div>

          <div className="w-full h-px bg-gray-100 dark:bg-gray-800 my-2" />

          {/* Email */}
          <div className="space-y-1">
            <span className="text-[9px] font-bold uppercase tracking-wider text-gray-400 block">
              Email
            </span>
            <p className="text-xs text-gray-700 dark:text-gray-300 font-mono">
              {displayEmail}
            </p>
          </div>
        </div>

        {/* Media & Mutual Stats Section */}
        <div className="space-y-3 bg-white dark:bg-[#141b2d] p-3.5 rounded-2xl border border-gray-200/50 dark:border-gray-800/50 shadow-2xs">
          <h5 className="text-[10px] font-black uppercase tracking-wider text-gray-400">
            {language === 'so' ? 'Falanqaynta Xiriirka' : 'Engagement & Metadata'}
          </h5>

          <div className="grid grid-cols-3 gap-2.5 text-center">
            <div className="bg-gray-50 dark:bg-gray-900/60 p-2 rounded-xl border border-gray-100 dark:border-gray-850">
              <span className="block text-sm font-black text-gray-900 dark:text-white font-sans">{sharedMediaCount}</span>
              <span className="text-[8px] text-gray-400 block mt-0.5 font-bold uppercase">Files</span>
            </div>
            <div className="bg-gray-50 dark:bg-gray-900/60 p-2 rounded-xl border border-gray-100 dark:border-gray-850">
              <span className="block text-sm font-black text-gray-900 dark:text-white font-sans">{sharedGroupsCount}</span>
              <span className="text-[8px] text-gray-400 block mt-0.5 font-bold uppercase">Groups</span>
            </div>
            <div className="bg-gray-50 dark:bg-gray-900/60 p-2 rounded-xl border border-gray-100 dark:border-gray-850">
              <span className="block text-sm font-black text-gray-900 dark:text-white font-sans">{mutualContactsCount}</span>
              <span className="text-[8px] text-gray-400 block mt-0.5 font-bold uppercase">Mutual</span>
            </div>
          </div>

          <div className="space-y-2 pt-2 text-[11px] text-gray-500 dark:text-gray-400 font-medium">
            <div className="flex items-center gap-2">
              <Calendar size={13} className="text-gray-400" />
              <span>{language === 'so' ? `Xubin ilaa: ${joinDate}` : `Member since: ${joinDate}`}</span>
            </div>
            <div className="flex items-center gap-2">
              <Flame size={13} className="text-gray-400" />
              <span>{language === 'so' ? 'Wadaagga farriimaha rasmiga ah: E2E Encrypted' : 'Encrypted direct signaling link active'}</span>
            </div>
          </div>
        </div>

        {/* Actions (Block / Report / Safety) */}
        <div className="space-y-2">
          {/* Block action button */}
          <button
            onClick={onToggleBlock}
            className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold transition-all shadow-2xs flex items-center justify-center gap-2 cursor-pointer ${
              isBlocked 
                ? 'bg-emerald-500/10 hover:bg-emerald-500/15 text-emerald-600 border border-emerald-500/20' 
                : 'bg-red-500/10 hover:bg-red-500/15 text-red-600 border border-red-500/20'
            }`}
          >
            <Shield size={14} />
            <span>
              {isBlocked 
                ? (language === 'so' ? 'Ka qaad xayiraadda' : 'Unblock Contact') 
                : (language === 'so' ? 'Xanib Macmiilka' : 'Block Contact')}
            </span>
          </button>

          {/* Report User button */}
          <button
            onClick={() => setShowReportDialog(true)}
            className="w-full py-2.5 px-4 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-750 text-gray-600 dark:text-gray-300 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <AlertTriangle size={14} />
            <span>{language === 'so' ? 'Ka warbixi (Report User)' : 'Report User / Chat'}</span>
          </button>
        </div>
      </div>

      {/* REPORT CONVERSATION OVERLAY DIALOG */}
      {showReportDialog && (
        <div className="fixed inset-0 z-55 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white dark:bg-[#182135] rounded-2xl p-5 shadow-2xl border border-gray-150 dark:border-gray-800 space-y-4">
            <div className="text-center space-y-2">
              <div className="w-11 h-11 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto">
                <BadgeAlert size={22} />
              </div>
              <h4 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                {language === 'so' ? 'U soo sheeg Maamulka' : 'Report Abuse or Spam'}
              </h4>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">
                Ficilkani wuxuu xogta chat-ka u diri doonaa maamulaha SomLuul si dib u eegis loogu sameeyo amni-darrada.
              </p>
            </div>

            {reportSuccess ? (
              <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 rounded-xl p-3 text-center text-xs font-bold">
                ✓ Report submitted successfully. Thank you.
              </div>
            ) : (
              <form onSubmit={handleSendReport} className="space-y-3">
                <textarea
                  placeholder={language === 'so' ? 'Ku qor sababta eedaynta (spam, hadalo xun...)' : 'Write your reason (spam, harassment, inappropriate content...)'}
                  className="w-full h-24 p-3 bg-gray-50 dark:bg-gray-900 border border-gray-250 dark:border-gray-750 rounded-xl text-xs text-gray-950 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                  value={reportText}
                  onChange={(e) => setReportText(e.target.value)}
                  required
                />
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setShowReportDialog(false)}
                    className="py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-xl text-xs font-bold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold cursor-pointer shadow-sm shadow-red-500/10"
                  >
                    Submit Report
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

    </div>
  );
};
