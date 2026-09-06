import React from 'react';
import { ShieldAlert, UserX, Check, Lock, Loader2 } from 'lucide-react';

interface BlockedUsersManagerProps {
  blockedUserIds: string[];
  profiles: any[];
  onUnblockUser: (userId: string) => void;
  language?: string;
}

export const BlockedUsersManager: React.FC<BlockedUsersManagerProps> = ({
  blockedUserIds,
  profiles,
  onUnblockUser,
  language
}) => {
  // Find profiles matching blocked IDs
  const blockedProfiles = profiles.filter(p => blockedUserIds.includes(p.id));

  return (
    <div className="space-y-4 max-w-md mx-auto">
      {/* Informative Header */}
      <div className="bg-amber-500/5 p-3.5 rounded-2xl border border-amber-500/10 flex items-start gap-3">
        <ShieldAlert className="text-amber-500 shrink-0 mt-0.5" size={18} />
        <div className="space-y-1">
          <h4 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">
            {language === 'so' ? 'Nidaamka Xayiraadda SomLuul' : 'Block & Privacy Protection'}
          </h4>
          <p className="text-[10px] text-gray-500 dark:text-gray-400 leading-relaxed font-medium">
            {language === 'so'
              ? 'Xiriirada aad xayirto kuuma soo diri karaan fariimo, kuma soo wici karaan, mana arki karaan sawirkaaga profile, Taariikh nololeedka (bio) ama online status-kaaga.'
              : 'Blocked contacts will be prevented from messaging, calling, or viewing your profile photo, bio, online status, and last seen updates.'}
          </p>
        </div>
      </div>

      {/* Blocked Users Count & List */}
      <div className="bg-white dark:bg-[#141b2d] rounded-2xl border border-gray-150 dark:border-gray-800 p-4 space-y-3">
        <div className="flex justify-between items-center pb-2 border-b border-gray-100 dark:border-gray-800">
          <span className="text-xs font-bold text-gray-900 dark:text-white">
            {language === 'so' ? 'Liiska Dadka Xayiran' : 'Blocked Contacts'}
          </span>
          <span className="text-[10px] bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-400 font-extrabold px-2 py-0.5 rounded-full font-mono">
            {blockedUserIds.length} Blocked
          </span>
        </div>

        {blockedProfiles.length === 0 ? (
          <div className="text-center py-8 space-y-2 text-gray-400">
            <UserX className="mx-auto text-gray-300 dark:text-gray-700" size={32} />
            <p className="text-xs font-semibold">
              {language === 'so' ? 'Ma jiro qof aad xayirtay.' : 'Your block list is clean!'}
            </p>
          </div>
        ) : (
          <div className="space-y-2.5 divide-y divide-gray-50 dark:divide-gray-850">
            {blockedProfiles.map((p, idx) => {
              const name = `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'User';
              const isValidUrl = p.avatar && (p.avatar.startsWith('http') || p.avatar.startsWith('/') || p.avatar.startsWith('data:image')) && !p.avatar.includes('unsplash.com');
              const parts = name.split(' ').filter(part => Boolean(part) && !['user', 'admin'].includes(part.toLowerCase()));
              const initials = parts.length >= 2 
                ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
                : (parts.length === 1 && parts[0].length > 0 ? parts[0].slice(0, 2).toUpperCase() : '💬');

              return (
                <div key={p.id} className="pt-2.5 first:pt-0 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {isValidUrl ? (
                      <img 
                        src={p.avatar!} 
                        alt="" 
                        className="w-9 h-9 rounded-full object-cover border border-gray-150 dark:border-gray-750 shrink-0"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-600 via-indigo-600 to-purple-600 text-white flex items-center justify-center font-black text-xs shrink-0 tracking-tight border border-white/30 shadow-xs font-sans">
                        {initials}
                      </div>
                    )}
                  <div className="min-w-0">
                    <h5 className="text-xs font-bold text-gray-900 dark:text-white truncate">
                      {p.first_name} {p.last_name}
                    </h5>
                    <p className="text-[10px] text-gray-400 truncate">
                      @{p.email.split('@')[0]}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => onUnblockUser(p.id)}
                  className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/30 dark:hover:bg-indigo-900/40 text-blue-600 dark:text-blue-400 text-[10px] font-extrabold rounded-lg uppercase tracking-wider cursor-pointer transition-all flex items-center gap-1.5 shrink-0"
                >
                  <Lock size={10} />
                  <span>{language === 'so' ? 'Fasax' : 'Unblock'}</span>
                </button>
              </div>
            );
          })}
          </div>
        )}
      </div>
    </div>
  );
};
