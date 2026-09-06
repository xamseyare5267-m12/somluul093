import React, { useState } from 'react';
import { useLanguage } from './LanguageContext';
import { HelpCircle, Info, Lock, ShieldAlert, Award, FileText, Send, CheckCircle, Mail } from 'lucide-react';

type InfoTab = 'about' | 'services' | 'privacy' | 'terms' | 'faq' | 'cookies' | 'safety' | 'careers' | 'blog' | 'contact';

export const PlatformCenter: React.FC = () => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<InfoTab>('about');

  // Contact form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState('');
  const [isSent, setIsSent] = useState(false);

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !msg) return;
    setIsSent(true);
    setTimeout(() => {
      setIsSent(false);
      setName('');
      setEmail('');
      setMsg('');
    }, 2000);
  };

  return (
    <div id="support-container" className="grid grid-cols-1 md:grid-cols-4 gap-6 max-w-6xl mx-auto py-4 h-[72vh] overflow-hidden">
      
      {/* 1. SIDE NAVIGATION BAR */}
      <div className="md:col-span-1 bg-white dark:bg-[var(--sl-bg-card)] border border-gray-150 dark:border-gray-800/60 rounded-2xl p-4 shadow-sm flex flex-col h-full overflow-y-auto divide-y divide-gray-100 dark:divide-gray-850 scrollbar-none">
        <div className="pb-3.5">
          <h3 className="font-extrabold text-gray-900 dark:text-white text-sm font-sans flex items-center gap-2">
            <HelpCircle className="text-indigo-600" size={18} />
            {t('support_title')}
          </h3>
          <p className="text-[10px] text-gray-400 mt-1 uppercase tracking-widest font-semibold">SomLuul Resources</p>
        </div>

        <div className="pt-3.5 space-y-1 grow">
          <button
            onClick={() => setActiveTab('about')}
            className={`w-full text-left px-3.5 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 ${activeTab === 'about' ? 'bg-[var(--somluul-primary)] text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
          >
            <Info size={14} />
            <span>{t('about_us')}</span>
          </button>
          <button
            onClick={() => setActiveTab('services')}
            className={`w-full text-left px-3.5 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 ${activeTab === 'services' ? 'bg-[var(--somluul-primary)] text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
          >
            <Award size={14} />
            <span>{t('services')}</span>
          </button>
          <button
            onClick={() => setActiveTab('privacy')}
            className={`w-full text-left px-3.5 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 ${activeTab === 'privacy' ? 'bg-[var(--somluul-primary)] text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
          >
            <Lock size={14} />
            <span>{t('privacy_policy')}</span>
          </button>
          <button
            onClick={() => setActiveTab('terms')}
            className={`w-full text-left px-3.5 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 ${activeTab === 'terms' ? 'bg-[var(--somluul-primary)] text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
          >
            <FileText size={14} />
            <span>{t('terms_service')}</span>
          </button>
          <button
            onClick={() => setActiveTab('cookies')}
            className={`w-full text-left px-3.5 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 ${activeTab === 'cookies' ? 'bg-[var(--somluul-primary)] text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
          >
            <FileText size={14} />
            <span>{t('cookies_policy')}</span>
          </button>
          <button
            onClick={() => setActiveTab('safety')}
            className={`w-full text-left px-3.5 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 ${activeTab === 'safety' ? 'bg-[var(--somluul-primary)] text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
          >
            <ShieldAlert size={14} />
            <span>{t('safety_center')}</span>
          </button>
          <button
            onClick={() => setActiveTab('faq')}
            className={`w-full text-left px-3.5 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 ${activeTab === 'faq' ? 'bg-[var(--somluul-primary)] text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
          >
            <HelpCircle size={14} />
            <span>{t('faq')}</span>
          </button>
          <button
            onClick={() => setActiveTab('careers')}
            className={`w-full text-left px-3.5 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 ${activeTab === 'careers' ? 'bg-[var(--somluul-primary)] text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
          >
            <Info size={14} />
            <span>{t('careers')}</span>
          </button>
          <button
            onClick={() => setActiveTab('blog')}
            className={`w-full text-left px-3.5 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 ${activeTab === 'blog' ? 'bg-[var(--somluul-primary)] text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
          >
            <Award size={14} />
            <span>{t('blog')}</span>
          </button>
          <button
            onClick={() => setActiveTab('contact')}
            className={`w-full text-left px-3.5 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 ${activeTab === 'contact' ? 'bg-[var(--somluul-primary)] text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
          >
            <Mail size={14} />
            <span>{t('contact_us')}</span>
          </button>
        </div>
      </div>

      {/* 2. TAB DETAILS WRAPPER */}
      <div className="md:col-span-3 bg-white dark:bg-[var(--sl-bg-card)] border border-gray-150 dark:border-gray-800/60 rounded-2xl p-6 shadow-sm overflow-y-auto h-full scrollbar-thin">
        
        {/* ABOUT US */}
        {activeTab === 'about' && (
          <div className="space-y-4 animate-fade-in">
            <h3 className="text-lg font-black text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-800 pb-3">{t('about_us')}</h3>
            <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
              SomLuul waa madal isgaarsiineed oo heer caalami ah, oo loogu talagalay in lagu xiro bulshooyinka Af-Soomaaliga ku hadla iyo guud ahaan caalamka. Waxaan dhisnay madal casri ah oo isku daraysa wada-hadalka amaanka ah, wadaaga faylalka, iyo suuq weyn oo loogu talagalay ganacsiga.
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
              SomLuul is a world-class social communication platform built to securely unite Somalis and the global community. We combine high-speed secure chats, HD multimedia calling, files persistence, and certified marketplace listings in a single responsive web interface.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
              <div className="bg-gray-50 dark:bg-[var(--sl-bg-muted)] p-4 rounded-xl border border-gray-150 dark:border-gray-800">
                <h4 className="text-xs font-bold text-gray-900 dark:text-white">Our Mission</h4>
                <p className="text-[11px] text-gray-500 mt-1 leading-relaxed">In aan bulshada u fududeyno isku xirka, ganacsiga amaanka ah, iyo kaydinta macluumaadka si qarsoodi leh.</p>
              </div>
              <div className="bg-gray-50 dark:bg-[var(--sl-bg-muted)] p-4 rounded-xl border border-gray-150 dark:border-gray-800">
                <h4 className="text-xs font-bold text-gray-900 dark:text-white">Our Vision</h4>
                <p className="text-[11px] text-gray-500 mt-1 leading-relaxed">In aan noqono madal ay ku kalsoonaan karaan boqolaal milyan oo isticmaalayaal ah oo ku baahsan daafaha caalamka.</p>
              </div>
            </div>
          </div>
        )}

        {/* OUR SERVICES */}
        {activeTab === 'services' && (
          <div className="space-y-4 animate-fade-in">
            <h3 className="text-lg font-black text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-800 pb-3">{t('services')}</h3>
            <div className="space-y-4">
              <div className="flex gap-3">
                <span className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs shrink-0">1</span>
                <div>
                  <h4 className="text-xs font-bold text-gray-800 dark:text-white">Secured Messaging & Chats</h4>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">MESSENGER: Wadahadal sir ah oo si buuxda loo xifdiyay, wadaaga sawirada, codka, iyo faylalka.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <span className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs shrink-0">2</span>
                <div>
                  <h4 className="text-xs font-bold text-gray-800 dark:text-white">HD Voice & Video Calls</h4>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">CALLS: Wicitaano HD maqal iyo muuqaal ah oo leh dhimista sawaxanka iyo qoraalka tooska ah ee la turjumay.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <span className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs shrink-0">3</span>
                <div>
                  <h4 className="text-xs font-bold text-gray-800 dark:text-white">SomLuul Global Marketplace</h4>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">SUUQA: Iibinta iyo iibsashada agabka kala duwan sida elektarooniga, guryaha, iyo dharka si sahlan oo aamin ah.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PRIVACY POLICY */}
        {activeTab === 'privacy' && (
          <div className="space-y-4 animate-fade-in text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
            <h3 className="text-lg font-black text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-800 pb-3">{t('privacy_policy')}</h3>
            <p className="font-bold">Last Updated: July 2026</p>
            <p>
              Badbaadada xogtaada ayaa ah ahmiyaddayada koowaad. SomLuul ma iibiso, mana la wadaagto macluumaadkaaga gaarka ah shirkado kale oo saddexaad. Dhamaan fariimaha chat-ka waxaa loo kaydiyaa si qarsoodi ah.
            </p>
            <p>
              We implement industry-standard encryption protocols (SSL/TLS, AES-256) for all data transfers. This policy outlines how we collect, store, and process your files, profiles, and marketplace items safely.
            </p>
            <h4 className="font-bold text-gray-800 dark:text-white mt-4">Data Collection</h4>
            <p>We collect minimum required data: your email, profile names, uploaded files (stored securely on server), and listing titles. We do not track location coordinates unless actively requested for marketplace filtering.</p>
          </div>
        )}

        {/* TERMS OF SERVICE */}
        {activeTab === 'terms' && (
          <div className="space-y-4 animate-fade-in text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
            <h3 className="text-lg font-black text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-800 pb-3">{t('terms_service')}</h3>
            <p className="font-bold">Last Updated: July 2026</p>
            <p>
              Markaad isticmaalayso SomLuul Web App, waxaad ogolaanaysaa inaad u hogaansanto xeerarka u dagsan bulshada. Waa ka mamnuuc in la soo dhigo qoraalo xunxun, xayeysiis been abuur ah, ama hanjabaad.
            </p>
            <p>
              By accessing any portion of the SomLuul platform, you agree to respect community safety standards. Any commercial spamming, counterfeit marketplace listings, or hateful conduct will result in instant account ban.
            </p>
            <h4 className="font-bold text-gray-800 dark:text-white mt-4">Disclaimers</h4>
            <p>All items listed on the SomLuul marketplace are the sole responsibility of their respective sellers. We do not provide automatic transaction insurance unless authenticated through verified business gateways.</p>
          </div>
        )}

        {/* COOKIES POLICY */}
        {activeTab === 'cookies' && (
          <div className="space-y-4 animate-fade-in text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
            <h3 className="text-lg font-black text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-800 pb-3">{t('cookies_policy')}</h3>
            <p>
              Waxaan isticmaalnaa cookies si aan u xasuusano luuqadaada aad dooratay iyo fadhigaaga (session) si aadan mar walba u gelin furaha sirta ah. Cookies-kayagu ma ururiyaan macluumaad kale.
            </p>
            <p>
              We use strictly necessary cookies to persist authentication sessions, dark/light theme preferences, and manual localization languages inside your browser localStorage securely.
            </p>
          </div>
        )}

        {/* SAFETY CENTER */}
        {activeTab === 'safety' && (
          <div className="space-y-4 animate-fade-in">
            <h3 className="text-lg font-black text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-800 pb-3">{t('safety_center')}</h3>
            <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
              Xarunta badbaadada SomLuul waxay kuu damaanad qaadaysaa adeeg nadiif ah. Maamulayaasheena (Admins) waxay u taagan yihiin saac kasta inay hubiyaan oo xannibaan akoonada been abuurka ah iyo qoraalada aan munaasibka ahayn.
            </p>
            <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-xl text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
              <strong>Ka digtoonaan:</strong> Marna ha la wadaagin furahaaga sirta ah (password) ama macluumaadkaaga maaliyadeed qof kasta oo ku dhex jira chat-ka, xitaa haddii uu sheegto inuu ka tirsan yahay shaqaalaha SomLuul.
            </div>
          </div>
        )}

        {/* FAQ */}
        {activeTab === 'faq' && (
          <div className="space-y-4 animate-fade-in">
            <h3 className="text-lg font-black text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-800 pb-3">{t('faq')}</h3>
            <div className="space-y-4">
              <div className="border-b border-gray-100 dark:border-gray-800 pb-3">
                <h4 className="text-xs font-bold text-gray-800 dark:text-white">Q1: Sida loo soo dajiyo app-ka SomLuul?</h4>
                <p className="text-[11px] text-gray-500 mt-1">J: Aad qeybta "Download Apps" ee menu-ka si aad u hesho PWA install ka tooska ah oo ku dhow dhamaan aaladaha Windows, iOS, iyo Android.</p>
              </div>
              <div className="border-b border-gray-100 dark:border-gray-800 pb-3">
                <h4 className="text-xs font-bold text-gray-800 dark:text-white">Q2: Ma la dhimayaa dakhliga (monetization) aan ka sameeyo qoraalada?</h4>
                <p className="text-[11px] text-gray-500 mt-1">J: Haa, SomLuul waxay qaadataa 15% oo kaliya si loo maareeyo server-yada iyo amniga, 85% dakhliga guud waxaa iska leh adiga oo ah hal-abuur.</p>
              </div>
              <div>
                <h4 className="text-xs font-bold text-gray-800 dark:text-white">Q3: Ma ammaan baa suuqa SomLuul?</h4>
                <p className="text-[11px] text-gray-500 mt-1">J: Haa, iibiyeyaashu waa kuwa la xaqiijiyay, macluumaadkaaga iyo farriimahaaguna waa kuwo qarsoodi ah.</p>
              </div>
            </div>
          </div>
        )}

        {/* CAREERS */}
        {activeTab === 'careers' && (
          <div className="space-y-4 animate-fade-in">
            <h3 className="text-lg font-black text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-800 pb-3">{t('careers')}</h3>
            <p className="text-xs text-gray-600 dark:text-gray-300 mb-4">We are always looking for smart, passionate creators and engineers to help build the future of SomLuul.</p>
            <div className="space-y-3.5">
              <div className="bg-gray-50 dark:bg-[var(--sl-bg-muted)] border border-gray-150 dark:border-gray-800 p-4 rounded-xl flex justify-between items-center">
                <div>
                  <h4 className="text-xs font-bold text-gray-900 dark:text-white">Lead Backend Software Architect</h4>
                  <div className="text-[10px] text-gray-400 mt-0.5">Mogadishu, Somalia • Full-time • Remote Friendly</div>
                </div>
                <span className="bg-[var(--somluul-primary)] text-white text-[10px] font-bold px-2.5 py-1 rounded-md cursor-pointer">Apply</span>
              </div>
              <div className="bg-gray-50 dark:bg-[var(--sl-bg-muted)] border border-gray-150 dark:border-gray-800 p-4 rounded-xl flex justify-between items-center">
                <div>
                  <h4 className="text-xs font-bold text-gray-900 dark:text-white">Senior React Native / Flutter Developer</h4>
                  <div className="text-[10px] text-gray-400 mt-0.5">Hargeisa, Somalia • Contract • Remote</div>
                </div>
                <span className="bg-[var(--somluul-primary)] text-white text-[10px] font-bold px-2.5 py-1 rounded-md cursor-pointer">Apply</span>
              </div>
            </div>
          </div>
        )}

        {/* PLATFORM BLOG */}
        {activeTab === 'blog' && (
          <div className="space-y-5 animate-fade-in">
            <h3 className="text-lg font-black text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-800 pb-3">{t('blog')}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-50 dark:bg-[var(--sl-bg-muted)] border border-gray-150 dark:border-gray-800 rounded-xl overflow-hidden shadow-xs flex flex-col h-full">
                <div className="h-32 bg-gray-200">
                  <img src="https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=300" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </div>
                <div className="p-3.5 flex flex-col grow justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-gray-800 dark:text-white leading-snug">Daahfurka WebRTC HD Calling Engine</h4>
                    <p className="text-[10px] text-gray-400 mt-1">Baro sida wicitaankayagu u yahay mid aad u dheereeya oo xog yar isticmaalaya.</p>
                  </div>
                  <span className="text-[10px] text-indigo-500 font-bold hover:underline mt-2.5 block cursor-pointer">Read Article →</span>
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-[var(--sl-bg-muted)] border border-gray-150 dark:border-gray-800 rounded-xl overflow-hidden shadow-xs flex flex-col h-full">
                <div className="h-32 bg-gray-200">
                  <img src="https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=300" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </div>
                <div className="p-3.5 flex flex-col grow justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-gray-800 dark:text-white leading-snug">Bilaabidda Lacag Sameynta (Monetization)</h4>
                    <p className="text-[10px] text-gray-400 mt-1">Sidee hal-abuurada Soomaaliyeed uga samayn karaan dakhli joogto ah SomLuul?</p>
                  </div>
                  <span className="text-[10px] text-indigo-500 font-bold hover:underline mt-2.5 block cursor-pointer">Read Article →</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* CONTACT US FORM */}
        {activeTab === 'contact' && (
          <div className="space-y-4 animate-fade-in">
            <h3 className="text-lg font-black text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-800 pb-3">{t('contact_us')}</h3>
            <p className="text-xs text-gray-600 dark:text-gray-300">Buuxi foomka hoose si aad ula xiriirto maamulka farsamada iyo taageerada SomLuul.</p>

            {isSent ? (
              <div className="bg-green-50 dark:bg-green-950/20 text-green-600 dark:text-green-400 p-4 rounded-xl border border-green-200 text-center text-xs font-bold animate-pulse">
                <CheckCircle className="mx-auto text-green-500 mb-2" size={24} />
                Fariintaada waa la diray si guul leh! Shaqaalaheenu waxay kugu soo jawaabi doonaan 24 saac gudahood.
              </div>
            ) : (
              <form onSubmit={handleContactSubmit} className="space-y-4 max-w-md">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Magacaaga (Full Name)</label>
                  <input
                    type="text"
                    required
                    className="w-full text-xs bg-gray-50 dark:bg-[var(--sl-bg-muted)] border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Emailkaaga (Email)</label>
                  <input
                    type="email"
                    required
                    className="w-full text-xs bg-gray-50 dark:bg-[var(--sl-bg-muted)] border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Farriintaada (Message)</label>
                  <textarea
                    required
                    className="w-full text-xs bg-gray-50 dark:bg-[var(--sl-bg-muted)] border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 min-h-[100px]"
                    value={msg}
                    onChange={(e) => setMsg(e.target.value)}
                  />
                </div>
                <button
                  type="submit"
                  className="bg-[var(--somluul-primary)] hover:brightness-110 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-all shadow-md shadow-blue-500/10 flex items-center gap-1.5"
                >
                  <Send size={14} />
                  <span>Dir Farriinta</span>
                </button>
              </form>
            )}
          </div>
        )}

      </div>

    </div>
  );
};
