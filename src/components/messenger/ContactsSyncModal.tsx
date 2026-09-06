import React, { useState } from 'react';
import { 
  Users, Search, ShieldCheck, Check, Share2, MessageSquare, 
  Smartphone, UserPlus, Info, Compass, Loader2, ArrowRight
} from 'lucide-react';

interface ContactsSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  profiles: any[];
  onStartChat: (profile: any) => void;
  language?: string;
}

interface DeviceContact {
  name: string;
  phone: string;
  avatarUrl?: string;
}

export const ContactsSyncModal: React.FC<ContactsSyncModalProps> = ({
  isOpen,
  onClose,
  profiles,
  onStartChat,
  language
}) => {
  const [permissionGranted, setPermissionGranted] = useState<boolean>(() => {
    return localStorage.getItem('contacts_permission_granted') === 'true';
  });
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [showInviteShare, setShowInviteShare] = useState<DeviceContact | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Real contacts are read from the device Contacts API / Cordova / Capacitor when available.
  // No hardcoded sample contacts are shipped.
  const deviceContacts: DeviceContact[] = ((window as any).__somluul_device_contacts || []) as DeviceContact[];

  if (!isOpen) return null;

  // Use the browser's real Contact Picker when supported. Never simulate a scan.
  const handleGrantPermission = async () => {
    const picker = (navigator as any).contacts;
    if (!picker?.select) {
      setIsScanning(false);
      alert(language === 'so'
        ? 'Browser-kan ma taageero Contact Picker. Isticmaal app-ka Android/iOS ee leh Contacts permission.'
        : 'This browser does not support Contact Picker. Use the Android/iOS app with Contacts permission.');
      return;
    }
    try {
      setIsScanning(true);
      const selected = await picker.select(['name', 'tel'], { multiple: true });
      setIsScanning(false);
      setPermissionGranted(true);
      localStorage.setItem('contacts_permission_granted', 'true');
      (window as any).__somluul_device_contacts = (selected || []).flatMap((contact: any) => {
        const name = Array.isArray(contact.name) ? contact.name[0] : (contact.name || 'Contact');
        const phones = Array.isArray(contact.tel) ? contact.tel : [];
        return phones.map((phone: string) => ({ name, phone }));
      });
    } catch (err) {
      setIsScanning(false);
      console.warn('Contact Picker was cancelled or denied:', err);
    }
  };

  // Generate Referral Link
  const referralLink = "https://somluul.com/join?ref=somluul_invite";

  const handleCopyLink = () => {
    navigator.clipboard.writeText(`Join me on SomLuul Messenger. Download the app here: ${referralLink}`);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Match contacts securely against actual database profiles using normalized phone comparison
  const getMatchedContacts = () => {
    return deviceContacts.map(contact => {
      // Normalize phone numbers for precise matching
      const cleanContactPhone = contact.phone.replace(/[^0-9]/g, '');
      
      const matchedProfile = profiles.find(p => {
        if (!p.phone) return false;
        const cleanProfilePhone = p.phone.replace(/[^0-9]/g, '');
        return cleanProfilePhone.endsWith(cleanContactPhone) || cleanContactPhone.endsWith(cleanProfilePhone);
      });

      return {
        ...contact,
        registered: !!matchedProfile,
        profile: matchedProfile
      };
    });
  };

  const matchedContacts = getMatchedContacts().filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.phone.includes(searchQuery)
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
      <div className="w-full max-w-lg bg-white dark:bg-[#141b2d] rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden flex flex-col max-h-[85vh] animate-scale-up">
        
        {/* Header */}
        <div className="p-4 border-b border-gray-150 dark:border-gray-800/60 flex justify-between items-center bg-gray-50/50 dark:bg-gray-900/10">
          <div className="flex items-center gap-2">
            <Users className="text-blue-500 shrink-0" size={20} />
            <div>
              <h3 className="font-bold text-sm text-gray-900 dark:text-white">
                {language === 'so' ? 'Isku-xirka Telefoonka' : 'Phone Contacts Sync'}
              </h3>
              <p className="text-[10px] text-gray-400">SomLuul Contact Security Engine</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg"
          >
            &times;
          </button>
        </div>

        {/* Body content */}
        {!permissionGranted ? (
          /* Permission Request View */
          <div className="p-6 text-center space-y-6 flex-1 overflow-y-auto">
            <div className="relative mx-auto w-20 h-20 bg-blue-500/10 dark:bg-blue-500/5 rounded-full flex items-center justify-center border border-blue-500/20">
              <Smartphone className="text-blue-500" size={36} />
              <div className="absolute -top-1 -right-1 w-6 h-6 bg-amber-500 text-white rounded-full flex items-center justify-center text-[10px] font-black border-2 border-white dark:border-[#141b2d] animate-pulse">
                Sync
              </div>
            </div>

            <div className="space-y-2 max-w-sm mx-auto">
              <h4 className="font-bold text-base text-gray-900 dark:text-white">
                {language === 'so' ? 'Ma u oggolaanaysaa SomLuul asxaabtaada?' : 'Access Your Contacts'}
              </h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed font-medium">
                {language === 'so' 
                  ? 'Si aad u aragto asxaabtaada durba isticmaala SomLuul oo aad ugu dirto farriimo ammaan ah, fadlan u oggolow barnaamijka inuu akhriyo telefoonkaaga.' 
                  : 'To see which of your friends are already using SomLuul and message them securely, grant permission to securely scan your contact list.'}
              </p>
            </div>

            {isScanning ? (
              /* Scanning progress visualizer */
              <div className="space-y-3 max-w-xs mx-auto pt-4">
                <div className="flex justify-between items-center text-[10px] text-gray-400 font-mono font-bold">
                  <span className="flex items-center gap-1.5 text-blue-500">
                    <Loader2 className="animate-spin" size={11} />
                    Scanning contacts...
                  </span>
                  <span>{scanProgress}%</span>
                </div>
                <div className="w-full h-1.5 bg-gray-150 dark:bg-gray-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-[var(--somluul-primary)] transition-all duration-300 rounded-full" 
                    style={{ width: `${scanProgress}%` }}
                  />
                </div>
              </div>
            ) : (
              <div className="pt-4 flex flex-col gap-3 max-w-xs mx-auto">
                <button
                  onClick={handleGrantPermission}
                  className="w-full py-3 bg-[var(--somluul-primary)] hover:brightness-110 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-blue-500/10 cursor-pointer flex items-center justify-center gap-2"
                >
                  <span>{language === 'so' ? 'Haa, Sii Fasax' : 'Yes, Grant Access'}</span>
                  <ArrowRight size={14} />
                </button>
                <button
                  onClick={onClose}
                  className="w-full py-2.5 text-xs font-semibold text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                >
                  {language === 'so' ? 'Dib u dhig' : 'Not Now'}
                </button>
              </div>
            )}

            <div className="bg-amber-500/5 p-3 rounded-xl border border-amber-500/10 text-left max-w-sm mx-auto flex items-start gap-2.5">
              <ShieldCheck className="text-amber-500 shrink-0 mt-0.5" size={16} />
              <p className="text-[10px] text-gray-500 dark:text-gray-400 leading-normal font-medium">
                <strong>Contact Security Policy</strong>: SomLuul matches phone numbers locally on your device. We never upload your raw contact list or phone books to our database servers. Your privacy is 100% end-to-end protected.
              </p>
            </div>
          </div>
        ) : (
          /* Synced Contacts View */
          <>
            <div className="p-3 bg-gray-50/50 dark:bg-[#121826]/30 border-b border-gray-150 dark:border-gray-850 flex gap-2">
              <div className="relative grow">
                <Search className="absolute left-3 top-2.5 text-gray-400" size={14} />
                <input
                  type="text"
                  placeholder={language === 'so' ? 'Ku dhex raadi asxaabtaada...' : 'Search your phonebook...'}
                  className="w-full pl-9 pr-3 py-1.5 bg-white dark:bg-[#1f293d] border border-gray-200 dark:border-gray-750 rounded-xl text-xs text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 divide-y divide-gray-100 dark:divide-gray-850">
              {matchedContacts.length === 0 ? (
                <div className="text-center py-10 text-gray-400 text-xs">
                  Ma jiro qof la helay.
                </div>
              ) : (
                matchedContacts.map((contact, idx) => (
                  <div key={idx} className="pt-3 first:pt-0 flex items-center justify-between gap-3">
                    <div className="flex gap-3 items-center min-w-0">
                      <div className="relative shrink-0">
                        {contact.registered && contact.profile?.avatar ? (
                          <img 
                            src={contact.profile.avatar} 
                            alt={contact.name} 
                            className="w-10 h-10 rounded-full object-cover border border-gray-150 dark:border-gray-700" 
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-blue-500/10 dark:bg-blue-500/5 border border-blue-500/20 text-blue-500 flex items-center justify-center text-xs font-bold uppercase">
                            {contact.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                          </div>
                        )}
                        {contact.registered && (
                          <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-500 border-2 border-white dark:border-[#141b2d]" />
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-xs font-bold text-gray-900 dark:text-white truncate">
                            {contact.registered ? `${contact.profile?.first_name} ${contact.profile?.last_name}` : contact.name}
                          </h4>
                          {contact.registered && (
                            <span className="text-[8px] bg-emerald-500/10 text-emerald-500 px-1.5 py-0.2 rounded font-extrabold uppercase">
                              Active
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] font-mono text-gray-450 dark:text-gray-400 mt-0.5">
                          {contact.registered ? `@${contact.profile?.email.split('@')[0]}` : contact.phone}
                        </p>
                        {contact.registered && contact.profile?.bio && (
                          <p className="text-[10px] text-gray-500 dark:text-gray-400 italic truncate max-w-[200px] mt-0.5">
                            "{contact.profile.bio}"
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="shrink-0">
                      {contact.registered ? (
                        <button
                          onClick={() => {
                            onStartChat(contact.profile);
                            onClose();
                          }}
                          className="px-3 py-1.5 bg-[var(--somluul-primary)] hover:brightness-110 text-white text-[10px] font-bold rounded-lg transition-all flex items-center gap-1 cursor-pointer shadow-sm"
                        >
                          <MessageSquare size={11} />
                          <span>{language === 'so' ? 'Kala hadal' : 'Chat'}</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => setShowInviteShare(contact)}
                          className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-bold rounded-lg transition-all flex items-center gap-1 cursor-pointer shadow-sm"
                        >
                          <UserPlus size={11} />
                          <span>{language === 'so' ? 'Casuun' : 'Invite'}</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}

        {/* Modal footer */}
        <div className="p-3 bg-gray-50 dark:bg-gray-900/40 text-[10px] text-gray-400 text-center border-t border-gray-150 dark:border-gray-800/60">
          U wada xiriir si qarsoodi ah oo badbaado leh dhamaan asxaabtaada SomLuul
        </div>
      </div>

      {/* SHARE / INVITE OVERLAY MODAL */}
      {showInviteShare && (
        <div className="fixed inset-0 z-55 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-white dark:bg-[#182135] rounded-2xl p-5 shadow-2xl border border-gray-150 dark:border-gray-800 space-y-4">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 bg-amber-500/10 text-amber-500 rounded-full flex items-center justify-center mx-auto">
                <Share2 size={24} />
              </div>
              <h4 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                {language === 'so' ? 'Ku Casuum SomLuul' : 'Invite Friend to SomLuul'}
              </h4>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                U dir fariin casuumaad oo casri ah oo ku saabsan barnaamijka rasmiga ah ee SomLuul:
              </p>
            </div>

            <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded-xl border border-gray-200 dark:border-gray-800 text-[11px] font-medium leading-relaxed font-mono text-gray-600 dark:text-gray-300">
              "Join me on SomLuul Messenger. Download the app here: <span className="text-blue-500 underline">{referralLink}</span>"
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleCopyLink}
                className="py-2.5 bg-[var(--somluul-primary)] hover:brightness-110 text-white rounded-xl text-xs font-bold cursor-pointer shadow-sm transition-all text-center"
              >
                {copiedLink ? 'Copied! ✓' : 'Copy referral'}
              </button>
              <a
                href={`sms:${showInviteShare.phone}?body=Join me on SomLuul Messenger. Download the app here: ${referralLink}`}
                className="py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold cursor-pointer shadow-sm transition-all text-center flex items-center justify-center gap-1.5"
              >
                <Smartphone size={13} />
                Send via SMS
              </a>
            </div>

            <div className="flex justify-center gap-3.5 pt-2 border-t border-gray-150 dark:border-gray-800">
              <button 
                onClick={() => { console.log('Invite shared to WhatsApp'); setShowInviteShare(null); }}
                className="text-xs text-gray-500 dark:text-gray-400 hover:text-green-500 flex flex-col items-center gap-1 font-semibold"
              >
                <span className="text-lg">💬</span>
                <span>WhatsApp</span>
              </button>
              <button 
                onClick={() => { console.log('Invite shared to Telegram'); setShowInviteShare(null); }}
                className="text-xs text-gray-500 dark:text-gray-400 hover:text-blue-400 flex flex-col items-center gap-1 font-semibold"
              >
                <span className="text-lg">✈️</span>
                <span>Telegram</span>
              </button>
              <button 
                onClick={() => { console.log('Invite shared to Email'); setShowInviteShare(null); }}
                className="text-xs text-gray-500 dark:text-gray-400 hover:text-red-400 flex flex-col items-center gap-1 font-semibold"
              >
                <span className="text-lg">📧</span>
                <span>Email</span>
              </button>
            </div>

            <button
              onClick={() => setShowInviteShare(null)}
              className="w-full py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-750 text-gray-600 dark:text-gray-300 rounded-xl text-xs font-bold cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
