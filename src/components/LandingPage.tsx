import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { AppLogo } from './AppLogo';
import { SomLuulLogo } from './brand/SomLuulLogo';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Smartphone, 
  Shield, 
  ShieldCheck, 
  MessageSquare, 
  PhoneCall, 
  Video, 
  Users, 
  Radio, 
  Tv, 
  ShoppingBag, 
  Wallet, 
  DollarSign, 
  Brain, 
  Briefcase, 
  HardDrive, 
  Languages, 
  Lock, 
  Gift, 
  Star, 
  Percent, 
  Megaphone, 
  UserCheck, 
  Coins, 
  Download, 
  Laptop, 
  Info, 
  Globe, 
  ChevronRight, 
  Play, 
  ArrowRight, 
  ChevronDown, 
  CheckCircle2, 
  Menu, 
  X, 
  TrendingUp, 
  Sparkles, 
  Heart, 
  Activity, 
  Bell,
  MessageCircle,
  Share2
} from 'lucide-react';
import { useLanguage } from './LanguageContext';

interface LandingPageProps {
  onOpenAuth: (initialView: 'email-login' | 'email-signup') => void;
  appLogo: string;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onOpenAuth, appLogo }) => {
  const { language, setLanguage, t, isRtl, appName } = useLanguage();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activePhoneTab, setActivePhoneTab] = useState<'chat' | 'stories' | 'call' | 'wallet' | 'monetization' | 'live'>('chat');
  const [estimatedFollowers, setEstimatedFollowers] = useState<number>(0);
  const [activeScreenshotTab, setActiveScreenshotTab] = useState<string>('Home');
  const [faqOpenIndex, setFaqOpenIndex] = useState<number | null>(null);
  
  // Real counters only (from API / health — never invent millions of users)
  const [liveOnlineUsers, setLiveOnlineUsers] = useState<number>(0);
  const [downloadCount, setDownloadCount] = useState<number>(0);
  const [realUserCount, setRealUserCount] = useState<number>(0);
  const [realPostCount, setRealPostCount] = useState<number>(0);
  const [newsletterEmail, setNewsletterEmail] = useState<string>('');
  const [newsletterSubscribed, setNewsletterSubscribed] = useState<boolean>(false);

  // Direct file downloads route
  const triggerFileDownload = async (filename: string) => {
    // Legacy .bat names → real Windows x64 EXE when available
    const names = (filename.includes('.bat') || filename.includes('Launcher'))
      ? ['SomLuul-Setup-1.0.0-x64.exe', 'SomLuul-Portable-1.0.0-x64.exe']
      : [filename];
    for (const name of names) {
      try {
        const r = await fetch(`/api/downloads/file?name=${encodeURIComponent(name)}`, { method: 'HEAD' });
        if (r.ok) {
          window.open(`/api/downloads/file?name=${encodeURIComponent(name)}`, '_blank');
          return;
        }
      } catch (_) {}
    }
    alert(
      'Windows x64 EXE weli lama dhisin / File not on server.\n\n' +
      'PC Windows: npm run build:exe\n' +
      'Soo geli: dist_electron\\*.exe → public\\downloads\\\n' +
      'Kadib restart npm start / redeploy.\n\n' +
      'Web-ka weli wuu shaqeynayaa — Login / Sign up browser-ka.'
    );
  };

  const [landingSettings, setLandingSettings] = useState<any>(null);

  useEffect(() => {
    axios.get('/api/landing-settings')
      .then(res => {
        if (res.data) {
          setLandingSettings(res.data);
          try {
            if (res.data.primaryColor) document.documentElement.style.setProperty('--somluul-primary', res.data.primaryColor);
            if (res.data.accentColor) document.documentElement.style.setProperty('--somluul-accent', res.data.accentColor);
            if (typeof res.data.liveOnlineUsers === 'number') setLiveOnlineUsers(res.data.liveOnlineUsers);
            if (typeof res.data.downloadCount === 'number') setDownloadCount(res.data.downloadCount);
            if (typeof res.data.estimatedFollowers === 'number') setEstimatedFollowers(res.data.estimatedFollowers);
          } catch (_) {}
        }
      })
      .catch(err => {
        console.warn('Failed to load dynamic landing settings:', err);
      });
    // Real platform counts from health (no fake 100M+)
    axios.get('/api/health')
      .then(res => {
        if (typeof res.data?.profiles === 'number') setRealUserCount(res.data.profiles);
        if (typeof res.data?.posts === 'number') setRealPostCount(res.data.posts);
      })
      .catch(() => {});
  }, []);

  // Format numbers nicely
  const formatNumber = (num: number) => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };

  // Estimate monthly earnings
  const calculateEarnings = (followers: number) => {
    const starsValue = Math.floor(followers * 0.15);
    const videoViewsValue = Math.floor(followers * 3.5 * 0.005);
    const giftsValue = Math.floor(followers * 0.08);
    const premiumValue = Math.floor(followers * 0.02 * 2.5);
    return starsValue + videoViewsValue + giftsValue + premiumValue;
  };

  const currentEstimatedEarnings = calculateEarnings(estimatedFollowers);

  // Notifications that slide in
  const [notificationIndex, setNotificationIndex] = useState(0);
  const notificationsList: { id: number; text: string; icon: string; time: string }[] = [
    // Real notifications come from the authenticated user feed / API.
    // Landing page shows none until the user is logged in.
  ];

  useEffect(() => {
    if (notificationsList.length === 0) return;
    const interval = setInterval(() => {
      setNotificationIndex(prev => (prev + 1) % notificationsList.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const features = [
    { id: "messaging", title: "Messaging", desc: "Fast private messaging.", icon: MessageSquare, color: "text-purple-500", bg: "bg-purple-500/10" },
    { id: "voice_calls", title: "HD Voice Calls", desc: "Voice calling.", icon: PhoneCall, color: "text-indigo-500", bg: "bg-indigo-500/10" },
    { id: "video_calls", title: "HD Video Calls", desc: "Video calling when both users are online.", icon: Video, color: "text-cyan-500", bg: "bg-cyan-500/10" },
    { id: "groups", title: "Groups", desc: "Create communities.", icon: Users, color: "text-emerald-500", bg: "bg-emerald-500/10" },
    { id: "channels", title: "Channels", desc: "Broadcast channels for your audience.", icon: Radio, color: "text-indigo-500", bg: "bg-indigo-500/10" },
    { id: "stories", title: "Stories", desc: "Share your daily life.", icon: Sparkles, color: "text-pink-500", bg: "bg-pink-500/10" },
    { id: "reels", title: "Reels", desc: "Short videos.", icon: Tv, color: "text-red-500", bg: "bg-red-500/10" },
    { id: "live_streaming", title: "Live Streaming", desc: "Live streaming tools.", icon: Activity, color: "text-orange-500", bg: "bg-orange-500/10" },
    { id: "marketplace", title: "Marketplace", desc: "Buy and sell.", icon: ShoppingBag, color: "text-yellow-500", bg: "bg-yellow-500/10" },
    { id: "wallet", title: "Wallet", desc: "Wallet for credits and withdrawals.", icon: Wallet, color: "text-teal-500", bg: "bg-teal-500/10" },
    { id: "monetization", title: "Monetization", desc: "Monetization tools for creators.", icon: DollarSign, color: "text-amber-500", bg: "bg-amber-500/10" },
    { id: "ai_assistant", title: "AI Assistant", desc: "Optional AI tools when API keys are set.", icon: Brain, color: "text-indigo-400", bg: "bg-indigo-400/10" },
    { id: "business_pages", title: "Business Pages", desc: "Create your business.", icon: Briefcase, color: "text-indigo-400", bg: "bg-blue-400/10" },
    { id: "cloud_storage", title: "Cloud Storage", desc: "Store your files.", icon: HardDrive, color: "text-purple-400", bg: "bg-purple-400/10" },
    { id: "translation", title: "Translation", desc: "Translation tools for messages.", icon: Languages, color: "text-emerald-400", bg: "bg-emerald-400/10" },
    { id: "encryption", title: "Secure Messaging", desc: "Private messaging with secure transport.", icon: Lock, color: "text-cyan-400", bg: "bg-cyan-400/10" },
  ];

  const monetizationCards = [
    { title: "Monetize Videos", desc: "Earn monthly ad revenue from premium long videos.", icon: Tv, color: "from-amber-400 to-orange-500" },
    { title: "Monetize Live Streams", desc: "Accept direct viewer donations while live streaming.", icon: Activity, color: "from-purple-500 to-indigo-600" },
    { title: "Gifts", desc: "Receive gorgeous animated gifts convertable to cash.", icon: Gift, color: "from-pink-500 to-rose-600" },
    { title: "Stars", desc: "Redeem stars sent by loyal supporters.", icon: Star, color: "from-yellow-400 to-amber-500" },
    { title: "Ads Revenue", desc: "Show ads on your content and receive generous cuts.", icon: Megaphone, color: "from-indigo-500 to-violet-500" },
    { title: "Affiliate Marketing", desc: "Promote marketplace products and earn high commissions.", icon: Percent, color: "from-emerald-500 to-teal-600" },
    { title: "Premium Subscription", desc: "Charge monthly VIP club fees for exclusive posts.", icon: UserCheck, color: "from-purple-600 to-pink-600" },
    { title: "Marketplace Sales", desc: "List and manage local marketplace items.", icon: ShoppingBag, color: "from-cyan-500 to-teal-500" },
  ];

  const appScreenshots = [
    { id: "Home", title: "Home Feed", desc: "Share status, photos, and connect with global community.", imageText: "🌟 SomLuul Global Feed 🌟\n• Trending posts in Somalia\n• Live creator updates\n• Business advertising\n• Instant like & comment interaction", bg: "bg-gradient-to-br from-indigo-900 to-[#141b2d]" },
    { id: "Messenger", title: "Messenger", desc: "Secure chats with themes and voice notes.", imageText: "💬 SomLuul Messenger 💬\n• Private messaging and voice notes\n• Voice and file sharing\n• Inline translation in 30+ languages\n• Real-time typing indicators", bg: "bg-gradient-to-br from-purple-950 to-[#141b2d]" },
    { id: "Calls", title: "HD Calls", desc: "Voice and video calling.", imageText: "📞 High Definition Connection 📞\n• Low-latency video streaming calls\n• Intelligent background noise cancellation\n• Interactive screen sharing\n• Encrypted call history", bg: "bg-gradient-to-br from-blue-950 to-[#141b2d]" },
    { id: "Wallet", title: "My Wallet", desc: "Fast money transfers, coin balance, and deposits.", imageText: "💳 SomLuul Wallet 💳\n• Wallet & coins (real balances from your account)\n• Wallet balance and QR transfers\n• Withdrawals when a supported payout provider is configured", bg: "bg-gradient-to-br from-emerald-950 to-[#141b2d]" },
    { id: "Profile", title: "User Profile", desc: "Customizable profile bios, followers, and creator status.", imageText: "👤 Customized Profile Hub 👤\n• @xamseyare • Verified Creator Badge\n• 154,200 loyal followers\n• Showcase stories, reels, and marketplace listings\n• Detailed Creator statistics", bg: "bg-gradient-to-br from-pink-950 to-[#141b2d]" },
    { id: "Marketplace", title: "Marketplace", desc: "Browse local listings, filter items, and contact sellers.", imageText: "🛍️ SomLuul Marketplace 🛍️\n• Post local products in seconds\n• Direct in-app seller messaging\n• Classified listings map locator\n• Direct seller communication and order records", bg: "bg-gradient-to-br from-yellow-950 to-[#141b2d]" },
    { id: "Stories", title: "Stories", desc: "Share 24-hour visual moments with interactive stickers.", imageText: "📸 Stories Moment View 📸\n• Vertical video & photo slides\n• Smart face filter support\n• Interactive poll stickers & music\n• Custom view analytics", bg: "bg-gradient-to-br from-purple-900 to-[#141b2d]" },
    { id: "Reels", title: "Reels", desc: "Enjoy endless vertical feeds of high-quality short videos.", imageText: "⚡ Interactive Reels View ⚡\n• AI-driven content algorithm\n• Direct tip sending (Coins) to creators\n• Sound reuse and lip-sync options\n• Instant video stitching", bg: "bg-gradient-to-br from-rose-950 to-[#141b2d]" },
    { id: "Live", title: "Go Live", desc: "Broadcast live, interact with real-time chat and gifts.", imageText: "🔴 Live Video Stream Overlay 🔴\n• Multi-guest streaming\n• Animated 3D gifts (Ferrari, Lions, Stars)\n• Scrolling live chat feedback\n• Superb ultra-low latency technology", bg: "bg-gradient-to-br from-red-950 to-[#141b2d]" },
  ];

  const testimonials = [
    { name: "SomLuul", role: "Messaging", text: "Private chat, groups, photos, voice notes — built for everyday use in Somalia and the diaspora.", stars: 5 },
    { name: "SomLuul", role: "Feed & Stories", text: "Share posts, photos, and stories with people you follow. Your content stays on your profile.", stars: 5 },
    { name: "SomLuul", role: "Wallet", text: "Wallet top-up uses real card checkout when Stripe is configured. Withdrawals are reviewed by the owner.", stars: 5 }
  ];

  const faqItems = [
    { q: "Waa maxay SomLuul?", a: "SomLuul waa barnaamij casri ah oo isku dhowray farriimaha degdegga ah (chat), wicitaannada maqalka iyo muuuqaalka ee HD-ga ah, kaydinta cloud-ka shakhsiga ah, suuqa iibka (marketplace), iyo fursadaha lacag-sameynta ee hal-abuurayaasha." },
    { q: "Sidee lacag looga sameeyaa SomLuul?", a: "Waxaad lacag ku kasban kartaa adoo soo dhiga muuqaallo gaagaaban (reels) ama toos u baahisa (live stream) si aad u hesho hadiyado (gifts/stars), adoo xayeysiin sameeya, ama adoo ku iibiya alaabadaada SomLuul Marketplace." },
    { q: "Aamin ma tahay SomLuul?", a: "Haa, dhammaan farriimaha iyo wicitaannada SomLuul waxaa lagu ilaaliyay sir-qaris aad u adag oo dhinac-ka-dhinac ah (HTTPS/TLS transport and account security). Macluumaadkaaga shakhsiga ah iyo lacagahaaga marna lala wadaagi maayo cid saddexaad." },
    { q: "Barnaamijku ma lacag baa mise waa bilaash?", a: "SomLuul waa bilaash in la soo dejiyo; qaar ka mid ah adeegyada lacag-bixinta waxay ku xiran yihiin adeeg-bixiyeyaasha dibadda. Adeegyada lacag-bixinta waxaa la heli karaa marka payment provider-ka rasmiga ah la habeeyo." },
    { q: "Waa kuwee aaladaha laga soo dejisan karo?", a: "SomLuul waxaa loo isticmaali karaa Android (Play Store/APK), iPhone (App Store), Windows, macOS, Linux, iyo directly mareegta internetka (Web Version)." }
  ];

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsletterEmail) return;
    try {
      await axios.post('/api/newsletter/subscribe', { email: newsletterEmail });
      setNewsletterSubscribed(true);
      setNewsletterEmail('');
    } catch (err: any) {
      console.error('Newsletter subscription failed:', err);
      alert(err?.response?.data?.error || 'Newsletter subscription failed. Please try again.');
    }
  };

  return (
    <div className="w-full bg-[#0F172A] text-white selection:bg-[#5B21B6] selection:text-white font-sans overflow-x-hidden">
      
      {/* GLOWING AMBIENT BACKGROUNDS */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-purple-900/15 rounded-full blur-[140px] pointer-events-none z-0"></div>
      <div className="absolute top-1/3 right-1/4 w-[600px] h-[600px] bg-blue-900/15 rounded-full blur-[150px] pointer-events-none z-0"></div>
      <div className="absolute top-2/3 left-10 w-[450px] h-[450px] bg-cyan-900/10 rounded-full blur-[120px] pointer-events-none z-0"></div>

      {/* HEADER NAVBAR */}
      <header className="sticky top-0 z-50 bg-[#0F172A]/80 backdrop-blur-xl border-b border-gray-800/60 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          
          {/* Logo */}
          <div className="flex items-center">
            <SomLuulLogo 
              size={42} 
              mode="dark" 
              variant="horizontal" 
              showTagline 
              taglineText="Digital Social Platform"
            />
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-gray-300">
            <a href="#features" className="hover:text-purple-400 transition-colors">Features</a>
            <a href="#earn" className="hover:text-amber-400 transition-colors">Monetize</a>
            <a href="#screenshots" className="hover:text-pink-400 transition-colors">App Screens</a>
            <a href="#security" className="hover:text-cyan-400 transition-colors">Security</a>
            <a href="#downloads" className="hover:text-indigo-400 transition-colors">Downloads</a>
            <a href="#faq" className="hover:text-purple-400 transition-colors">FAQ</a>
          </nav>

          {/* Actions */}
          <div className="hidden md:flex items-center gap-3">
            
            {/* Direct Download Button */}
            <button 
              onClick={() => triggerFileDownload('SomLuul-Setup-1.0.0-x64.exe')}
              className="flex items-center gap-1.5 px-4.5 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-500 hover:from-indigo-500 hover:to-violet-500 text-white font-black text-xs rounded-xl shadow-lg shadow-indigo-500/25 hover:scale-[1.03] transition-all cursor-pointer"
            >
              <Download size={14} className="animate-bounce" />
              <span>Soo Deji App-ka</span>
            </button>

            {/* Live Indicator */}
            <div className="flex items-center gap-2 px-3 py-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-[11px] font-bold text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>{formatNumber(liveOnlineUsers)} online now</span>
            </div>

            {/* Login button */}
            <button 
              onClick={() => onOpenAuth('email-login')}
              className="px-5 py-2.5 bg-gray-900 border border-gray-800 hover:bg-black text-gray-200 font-bold text-xs rounded-xl shadow-lg hover:scale-[1.03] transition-all cursor-pointer"
            >
              Ku gal SomLuul
            </button>
          </div>

          {/* Mobile menu trigger */}
          <div className="flex md:hidden items-center gap-2">
            <button 
              onClick={() => alert('Install: browser menu → Add to Home Screen / Install app. Website stays online.')}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-[var(--somluul-primary)] hover:brightness-110 text-white font-bold text-[10px] rounded-lg transition-all cursor-pointer"
              title="Soo deji APK"
            >
              <Download size={11} className="animate-pulse" />
              <span>Soo Deji</span>
            </button>
            <button 
              onClick={() => onOpenAuth('email-login')}
              className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-[10px] rounded-lg transition-all cursor-pointer"
            >
              Login
            </button>
            <button 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="text-gray-300 hover:text-white p-1 cursor-pointer"
            >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Panel */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden bg-[#0F172A] border-b border-gray-800"
            >
              <div className="px-4 py-4 space-y-3 flex flex-col font-bold">
                <a href="#features" onClick={() => setIsMobileMenuOpen(false)} className="py-2 text-gray-300 hover:text-purple-400 transition-colors">Features</a>
                <a href="#earn" onClick={() => setIsMobileMenuOpen(false)} className="py-2 text-gray-300 hover:text-amber-400 transition-colors">Monetize</a>
                <a href="#screenshots" onClick={() => setIsMobileMenuOpen(false)} className="py-2 text-gray-300 hover:text-pink-400 transition-colors">App Screens</a>
                <a href="#security" onClick={() => setIsMobileMenuOpen(false)} className="py-2 text-gray-300 hover:text-cyan-400 transition-colors">Security</a>
                <a href="#downloads" onClick={() => setIsMobileMenuOpen(false)} className="py-2 text-gray-300 hover:text-indigo-400 transition-colors">Downloads</a>
                <a href="#faq" onClick={() => setIsMobileMenuOpen(false)} className="py-2 text-gray-300 hover:text-purple-400 transition-colors">FAQ</a>
                
                <div className="pt-3 border-t border-gray-800 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-emerald-400">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span>{formatNumber(liveOnlineUsers)} Active Now</span>
                  </div>
                  <button 
                    onClick={() => { setIsMobileMenuOpen(false); onOpenAuth('email-login'); }}
                    className="px-4 py-2 bg-gradient-to-r from-purple-600 to-violet-500 text-white rounded-lg text-xs"
                  >
                    Ku Gal Web
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* HERO SECTION */}
      <section className="relative pt-8 pb-20 md:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 z-10">
        
        {/* Decorative rotating background circles */}
        <div className="absolute top-10 right-10 w-96 h-96 border border-purple-500/5 rounded-full animate-[spin_60s_linear_infinite] pointer-events-none hidden lg:block"></div>
        <div className="absolute top-20 right-20 w-[600px] h-[600px] border border-indigo-500/5 rounded-full animate-[spin_90s_linear_infinite] pointer-events-none hidden lg:block"></div>

        <div className="grid lg:grid-cols-12 gap-12 items-center">
          
          {/* Left Text Column */}
          <div className="lg:col-span-7 space-y-8 text-center lg:text-left relative">
            
            {/* SomLuul Beta Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-purple-500/10 to-indigo-500/10 border border-purple-500/20 rounded-full text-xs font-bold text-purple-300 hover:scale-[1.02] transition-transform">
              <span className="bg-purple-500 text-white text-[9px] font-black uppercase px-2 py-0.5 rounded-md">NEW</span>
              <span>SomLuul Social Multi-App V2.0</span>
            </div>

            {/* Giant Title */}
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight leading-none text-white font-sans">
              {landingSettings?.heroTitle ? (
                <span className="block font-sans whitespace-pre-line">
                  {landingSettings.heroTitle}
                </span>
              ) : (
                <>
                  The Future of <br className="hidden sm:inline" />
                  <span className="bg-gradient-to-r from-amber-200 via-amber-100 to-white bg-clip-text text-transparent drop-shadow-sm font-sans">
                    Social Media
                  </span> <br />
                  is Here
                </>
              )}
            </h1>

            {/* Subtext */}
            <p className="text-gray-300 text-base sm:text-lg md:text-xl max-w-2xl mx-auto lg:mx-0 leading-relaxed font-normal">
              {landingSettings?.heroSubtext || "Connect with the world, chat, call, create content, earn money, grow your community, and build your business—all inside SomLuul."}
            </p>

            {/* Multi Download and Web Buttons */}
            <div className="flex flex-col sm:flex-row flex-wrap gap-4 justify-center lg:justify-start">
              
              {/* Google Play */}
              <button 
                type="button"
                onClick={() => {
                  if (typeof window !== 'undefined' && (window as any).__somluulInstall) {
                    (window as any).__somluulInstall();
                  } else {
                    alert(language === 'so'
                      ? 'Browser-ka → menu → Install app / Add to Home Screen. Website-ku weli wuu shaqeynayaa.'
                      : 'Browser menu → Install app / Add to Home Screen. Website stays online.');
                  }
                }}
                className="flex items-center justify-center gap-2.5 px-6 py-3.5 bg-[#1e3a5f] hover:bg-[#162d4a] text-white rounded-xl border border-white/10 shadow-lg hover:scale-[1.02] transition-all group cursor-pointer text-left"
              >
                <Smartphone size={18} className="text-amber-300" />
                <div className="leading-tight">
                  <div className="text-[10px] uppercase font-bold text-gray-300 font-sans">Install App</div>
                  <div className="text-xs font-bold font-sans">Android / iOS (PWA)</div>
                </div>
              </button>

              {/* App Store */}
              <button 
                type="button"
                onClick={() => alert('iPhone: Safari → Share button → Add to Home Screen. Website remains available for everyone.')}
                className="flex items-center justify-center gap-2.5 px-6 py-3.5 bg-white/10 hover:bg-white/15 text-white rounded-xl border border-white/20 shadow-lg hover:scale-[1.02] transition-all group cursor-pointer text-left"
              >
                <Smartphone size={18} className="text-cyan-300" />
                <div className="leading-tight">
                  <div className="text-[10px] uppercase font-bold text-gray-300 font-sans">Install App</div>
                  <div className="text-xs font-bold font-sans">iPhone (Add to Home)</div>
                </div>
              </button>

              {/* Windows Web Buttons */}
              <div className="w-full sm:w-auto flex gap-3 justify-center">
                <button 
                  onClick={() => triggerFileDownload('SomLuul-Setup-1.0.0-x64.exe')}
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-3 bg-gray-800/40 hover:bg-gray-800 text-xs font-bold text-gray-300 rounded-xl border border-gray-700/50 transition-all cursor-pointer"
                >
                  <Laptop size={14} className="text-indigo-400" />
                  <span>Windows x64 EXE</span>
                </button>

                <button 
                  onClick={() => onOpenAuth('email-login')}
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-purple-600/90 to-indigo-600/90 hover:from-purple-600 hover:to-indigo-600 text-xs font-bold text-white rounded-xl shadow-md cursor-pointer"
                >
                  <Globe size={14} className="text-cyan-300" />
                  <span>Web Version</span>
                </button>
              </div>
            </div>

            {/* Real app navigation + live counters */}
            <div className="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start pt-2">
              <a
                href="#screenshots"
                className="inline-flex items-center gap-2 text-sm font-semibold text-purple-400 hover:text-purple-300 cursor-pointer"
              >
                <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center">
                  <Play size={12} className="fill-current text-purple-400" />
                </div>
                <span>Explore the app</span>
              </a>

              <div className="text-gray-400 text-xs flex items-center gap-1.5 bg-gray-900/40 px-3.5 py-1.5 rounded-full border border-gray-800/60">
                <Activity size={12} className="text-emerald-400 animate-pulse" />
                <span>Download Counter: <b className="text-white font-mono">{formatNumber(downloadCount)}</b> times</span>
              </div>
            </div>

            {/* Dynamic Custom Links Added by Admin */}
            {landingSettings?.customLinks && landingSettings.customLinks.length > 0 && (
              <div className="flex flex-wrap gap-3 pt-3 justify-center lg:justify-start">
                {landingSettings.customLinks.map((link: any, idx: number) => (
                  <a
                    key={link.id || idx}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-1.5 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 rounded-full text-xs font-bold text-purple-300 transition-all flex items-center gap-1.5"
                  >
                    <Globe size={11} className="text-cyan-400" />
                    <span>{link.label}</span>
                  </a>
                ))}
              </div>
            )}

            {/* Notification Animators Showcase — only when real items exist */}
            {notificationsList.length > 0 && (
            <div className="absolute -bottom-16 left-4 right-4 sm:left-auto sm:right-10 z-20 hidden md:block">
              <AnimatePresence mode="wait">
                <motion.div 
                  key={notificationIndex}
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -20, scale: 0.95 }}
                  transition={{ duration: 0.4 }}
                  className="flex items-center gap-3 p-3 bg-gray-900/90 backdrop-blur-md border border-purple-500/20 rounded-2xl shadow-xl max-w-xs"
                >
                  <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-lg shadow-inner">
                    {notificationsList[notificationIndex]?.icon}
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-xs font-bold text-white">{notificationsList[notificationIndex]?.text}</p>
                    <p className="text-[10px] text-purple-300 font-semibold">{notificationsList[notificationIndex]?.time}</p>
                  </div>
                  <div className="shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-500 block"></span>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
            )}

          </div>

          {/* Right Phone preview column */}
          <div className="lg:col-span-5 flex justify-center relative mt-8 lg:mt-0">
            
            {/* Visual glow backdrop for phone */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-purple-600/20 rounded-full blur-[80px] pointer-events-none"></div>

            {/* Outer mobile container */}
            <motion.div 
              animate={{ y: [0, -10, 0] }}
              transition={{ repeat: Infinity, duration: 6, ease: "easeInOut" }}
              className="w-[290px] h-[580px] bg-black rounded-[42px] p-2.5 shadow-2xl border-4 border-gray-800 relative z-10 hover:border-purple-500/30 transition-colors"
            >
              {/* Speaker & camera notch */}
              <div className="absolute top-3.5 left-1/2 -translate-x-1/2 w-32 h-4.5 bg-black rounded-full z-30 flex items-center justify-between px-4">
                <div className="w-2.5 h-2.5 rounded-full bg-gray-900"></div>
                <div className="w-12 h-1 bg-gray-900 rounded-full"></div>
              </div>

              {/* Inner screen glassmorphism */}
              <div className="w-full h-full bg-[#0b0f19] rounded-[32px] overflow-hidden relative flex flex-col pt-6 font-sans">
                
                {/* App header preview */}
                <div className="px-4 py-2 bg-[#141b2d] border-b border-gray-800 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-black tracking-tight text-purple-400">SomLuul</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  </div>
                  <div className="flex items-center gap-2 text-[9px] text-gray-400 font-bold">
                    <Activity size={10} className="text-purple-400" />
                    <span>Live feed</span>
                  </div>
                </div>

                {/* Main Screen Content dependent on activePhoneTab */}
                <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5">
                  
                  {activePhoneTab === 'chat' && (
                    <div className="space-y-3.5">
                      <div className="text-[10px] uppercase font-black text-purple-400 tracking-wider">Messenger Chat</div>
                      
                      <div className="space-y-2 text-[10px]">
                        <div className="bg-gray-800/80 p-2.5 rounded-2xl rounded-tl-none max-w-[85%] text-left text-gray-200">
                          <p className="font-bold text-purple-300 mb-0.5">Ali</p>
                          <p>Hey bro, did you receive the 500 Coins? 🪙</p>
                        </div>
                        
                        <div className="bg-[#5B21B6]/80 p-2.5 rounded-2xl rounded-tr-none max-w-[85%] ml-auto text-right text-white">
                          <p className="font-bold text-cyan-200 mb-0.5">Me</p>
                          <p>Yeah thanks! That fast-pay wallet is crazy ⚡</p>
                        </div>

                        <div className="bg-gray-800/80 p-2.5 rounded-2xl rounded-tl-none max-w-[85%] text-left text-gray-200">
                          <p className="font-bold text-purple-300 mb-0.5">Ali</p>
                          <p>Of course, SomLuul secure messaging is 🔥!</p>
                        </div>
                      </div>

                      {/* Typing preview */}
                      <div className="flex items-center gap-1 text-[9px] text-gray-400 italic">
                        <MessageSquare size={10} className="text-purple-400 animate-bounce" />
                        <span>Ali is typing...</span>
                      </div>
                    </div>
                  )}

                  {activePhoneTab === 'stories' && (
                    <div className="space-y-3">
                      <div className="text-[10px] uppercase font-black text-pink-400 tracking-wider">Stories & Moments</div>
                      
                      {/* Story Circles */}
                      <div className="flex gap-2.5 overflow-x-auto pb-1">
                        {[
                          { name: "Amira", flag: "🇸🇴", color: "from-purple-500 to-pink-500" },
                          { name: "Khadar", flag: "🇰🇪", color: "from-indigo-500 to-violet-500" },
                          { name: "Fartuun", flag: "🇬🇧", color: "from-emerald-500 to-teal-500" },
                          { name: "Anas", flag: "🇸🇴", color: "from-amber-500 to-orange-500" }
                        ].map((u, idx) => (
                          <div key={idx} className="flex flex-col items-center gap-1 shrink-0">
                            <div className={`w-10 h-10 rounded-full bg-gradient-to-tr ${u.color} p-[1.5px] shadow-md`}>
                              <div className="w-full h-full rounded-full bg-gray-900 flex items-center justify-center font-bold text-xs">
                                {u.flag}
                              </div>
                            </div>
                            <span className="text-[8px] text-gray-400">{u.name}</span>
                          </div>
                        ))}
                      </div>

                      {/* Featured Story Card */}
                      <div className="h-28 rounded-2xl bg-gradient-to-br from-pink-500/10 to-purple-500/10 border border-pink-500/20 p-3 flex flex-col justify-end relative overflow-hidden">
                        <div className="absolute top-2 right-2 bg-pink-500 text-[8px] font-black uppercase px-1.5 py-0.5 rounded-md">HOT</div>
                        <div className="text-left">
                          <p className="text-[10px] font-bold text-white">Beach Day 🏖️</p>
                          <p className="text-[8px] text-pink-300 font-semibold">2,482 views • Hargeisa</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {activePhoneTab === 'call' && (
                    <div className="space-y-4 text-center py-2">
                      <div className="text-[10px] uppercase font-black text-cyan-400 tracking-wider">HD Video Call</div>
                      
                      {/* Camera grid preview */}
                      <div className="grid grid-cols-2 gap-2">
                        <div className="h-24 rounded-xl bg-gray-800 border border-gray-700/60 p-2 flex flex-col justify-between text-left relative overflow-hidden">
                          <span className="text-[8px] bg-black/60 px-1.5 py-0.5 rounded-md">Ali (Hargeisa)</span>
                          <div className="text-center text-xl my-auto">🧑🏾‍💼</div>
                        </div>
                        <div className="h-24 rounded-xl bg-purple-950/40 border border-purple-500/20 p-2 flex flex-col justify-between text-left relative overflow-hidden">
                          <span className="text-[8px] bg-black/60 px-1.5 py-0.5 rounded-md">You (Mogadishu)</span>
                          <div className="text-center text-xl my-auto">👨🏽‍💻</div>
                        </div>
                      </div>

                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-cyan-500/10 border border-cyan-500/20 rounded-full text-[8px] font-bold text-cyan-300">
                        <Video size={8} className="text-cyan-400 animate-pulse" />
                        <span>Crystal Clear audio & Video Active</span>
                      </div>
                    </div>
                  )}

                  {activePhoneTab === 'wallet' && (
                    <div className="space-y-3 text-left">
                      <div className="text-[10px] uppercase font-black text-emerald-400 tracking-wider">SomLuul Secure Pay</div>
                      
                      {/* Glassmorphic Visa Card */}
                      <div className="bg-gradient-to-r from-emerald-500/20 to-teal-600/20 border border-emerald-500/30 p-3 rounded-2xl shadow-inner text-left space-y-2">
                        <div>
                          <p className="text-[8px] text-emerald-300 uppercase font-bold">Wallet Balance</p>
                          <p className="text-sm font-black font-mono text-white">$1,428.50 USD</p>
                        </div>
                        <div className="flex justify-between items-center text-[8px] font-mono text-gray-300 pt-1">
                          <div>
                            <p className="text-[6px] text-gray-400">COINS</p>
                            <p className="font-bold text-amber-400">142,850 🪙</p>
                          </div>
                          <div>
                            <p className="text-[6px] text-gray-400">HOLDER</p>
                            <p className="font-bold text-white">@xamseyare</p>
                          </div>
                        </div>
                      </div>

                      {/* Quick Transfer panel */}
                      <div className="grid grid-cols-3 gap-1.5 text-center text-[9px] font-bold">
                        <div className="p-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-700/60 rounded-xl cursor-pointer">💸 Send</div>
                        <div className="p-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-700/60 rounded-xl cursor-pointer">📥 Request</div>
                        <div className="p-1.5 bg-emerald-500/25 border border-emerald-500/30 rounded-xl text-emerald-300 cursor-pointer">💳 Payout</div>
                      </div>
                    </div>
                  )}

                  {activePhoneTab === 'monetization' && (
                    <div className="space-y-3 text-left">
                      <div className="text-[10px] uppercase font-black text-amber-400 tracking-wider">Creator Economy</div>
                      
                      <div className="bg-gray-900/60 p-2.5 rounded-xl border border-gray-800 space-y-2">
                        <div className="flex justify-between items-center text-[9px]">
                          <span className="text-gray-400 font-semibold">Daily Star Count:</span>
                          <span className="font-bold text-amber-400 font-mono">⭐ 24,193 Stars</span>
                        </div>
                        <div className="flex justify-between items-center text-[9px]">
                          <span className="text-gray-400 font-semibold">Reels Ads Income:</span>
                          <span className="font-bold text-emerald-400 font-mono">+$270.40 today</span>
                        </div>
                        <div className="flex justify-between items-center text-[9px]">
                          <span className="text-gray-400 font-semibold">Direct Fan Tips:</span>
                          <span className="font-bold text-purple-400 font-mono">15,800 Coins 🪙</span>
                        </div>
                      </div>

                      <div className="p-2 bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-xl flex items-center justify-between">
                        <div className="text-[8px] font-bold text-amber-200">LEVEL: PLATINUM INFLUENCER</div>
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping"></span>
                      </div>
                    </div>
                  )}

                  {activePhoneTab === 'live' && (
                    <div className="space-y-2 text-left relative h-full flex flex-col justify-between">
                      <div className="flex justify-between items-center">
                        <div className="bg-red-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded-md animate-pulse">🔴 LIVE</div>
                        <div className="bg-black/60 px-2 py-0.5 rounded-md text-[7px] font-mono text-gray-300">👁️ 4,285 watching</div>
                      </div>

                      {/* Floating comment feed */}
                      <div className="space-y-1.5 text-[8px] max-w-[85%] bg-black/40 p-2 rounded-xl backdrop-blur-sm self-end">
                        <p><b className="text-amber-400">Anas:</b> Wow nice stream quality! ⚡</p>
                        <p><b className="text-pink-400">Hodan:</b> Sent 100 Stars ⭐! Amazing</p>
                        <p><b className="text-cyan-400">Khadar:</b> Love from Somalia! 🇸🇴</p>
                      </div>
                    </div>
                  )}

                </div>

                {/* Micro App Interactive Bottom Tabs */}
                <div className="grid grid-cols-6 border-t border-gray-800 bg-[#141b2d] py-2 text-center text-gray-400 font-bold">
                  {[
                    { key: 'chat', label: 'Chat', icon: MessageSquare, color: "text-purple-400" },
                    { key: 'stories', label: 'Story', icon: Sparkles, color: "text-pink-400" },
                    { key: 'call', label: 'Call', icon: Video, color: "text-cyan-400" },
                    { key: 'wallet', label: 'Pay', icon: Wallet, color: "text-emerald-400" },
                    { key: 'monetization', label: 'Earn', icon: DollarSign, color: "text-amber-400" },
                    { key: 'live', label: 'Live', icon: Activity, color: "text-red-400" }
                  ].map(tab => (
                    <button 
                      key={tab.key}
                      onClick={() => setActivePhoneTab(tab.key as any)}
                      className={`flex flex-col items-center gap-0.5 cursor-pointer hover:text-white transition-colors ${
                        activePhoneTab === tab.key ? `${tab.color} text-xs scale-105` : 'text-[9px]'
                      }`}
                    >
                      <tab.icon size={13} />
                      <span className="text-[7px] uppercase font-bold tracking-tighter">{tab.label}</span>
                    </button>
                  ))}
                </div>

              </div>
            </motion.div>

            {/* Extra glowing design floating icons around the phone */}
            <div className="absolute -top-6 -left-6 bg-gradient-to-r from-purple-500 to-indigo-600 p-3 rounded-2xl shadow-lg border border-purple-400/20 animate-[bounce_5s_infinite] hidden lg:block">
              <MessageSquare size={20} className="text-white" />
            </div>
            <div className="absolute bottom-10 -right-8 bg-gradient-to-r from-emerald-500 to-teal-500 p-3.5 rounded-2xl shadow-lg border border-emerald-400/20 animate-[bounce_6s_infinite] hidden lg:block">
              <Wallet size={20} className="text-white" />
            </div>
            <div className="absolute top-1/2 -right-12 bg-gradient-to-r from-amber-500 to-orange-500 p-3 rounded-2xl shadow-lg border border-amber-400/20 animate-[bounce_4s_infinite] hidden lg:block">
              <Coins size={20} className="text-white animate-spin" style={{ animationDuration: '8s' }} />
            </div>
          </div>

        </div>
      </section>

      {/* STATISTICS BADGES STRIP */}
      <section className="bg-gray-900/60 border-y border-gray-800/80 py-10 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            
            <div className="space-y-1 hover:scale-105 transition-transform">
              <div className="text-3xl sm:text-4xl font-black bg-gradient-to-r from-purple-400 to-indigo-500 bg-clip-text text-transparent font-mono">{formatNumber(realUserCount)}</div>
              <div className="text-xs font-bold uppercase tracking-widest text-gray-400">Registered Users</div>
            </div>

            <div className="space-y-1 hover:scale-105 transition-transform">
              <div className="text-3xl sm:text-4xl font-black bg-gradient-to-r from-blue-400 to-violet-500 bg-clip-text text-transparent font-mono">{formatNumber(realPostCount)}</div>
              <div className="text-xs font-bold uppercase tracking-widest text-gray-400">Posts</div>
            </div>

            <div className="space-y-1 hover:scale-105 transition-transform">
              <div className="text-3xl sm:text-4xl font-black bg-gradient-to-r from-pink-400 to-rose-500 bg-clip-text text-transparent font-mono">{formatNumber(liveOnlineUsers)}</div>
              <div className="text-xs font-bold uppercase tracking-widest text-gray-400">Online Now</div>
            </div>

            <div className="space-y-1 hover:scale-105 transition-transform">
              <div className="text-3xl sm:text-4xl font-black bg-gradient-to-r from-emerald-400 to-teal-500 bg-clip-text text-transparent font-mono">{formatNumber(downloadCount)}</div>
              <div className="text-xs font-bold uppercase tracking-widest text-gray-400">Downloads</div>
            </div>

          </div>
        </div>
      </section>

      {/* FEATURES GRID SECTION */}
      <section id="features" className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        <div className="text-center space-y-4 mb-16">
          <h2 className="text-xs font-black uppercase tracking-widest text-purple-400">Interactive Ecosystem</h2>
          <h3 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-white font-sans">
            Packed with Powerful Features
          </h3>
          <p className="text-gray-400 max-w-2xl mx-auto text-sm sm:text-base">
            SomLuul is designed to replace over 5 traditional apps, giving you messaging, crystal clear calling, a digital wallet, content monetization, and cloud storage—all built in one unified place.
          </p>
        </div>

        {/* Features Bento Grid */}
        <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {features.map((f, index) => {
            const IconComponent = f.icon;
            return (
              <motion.div 
                key={f.id}
                whileHover={{ y: -6, scale: 1.01 }}
                className="bg-gray-900/40 backdrop-blur-md border border-gray-800/80 p-6 rounded-2xl shadow-md flex flex-col justify-between hover:border-purple-500/30 transition-all cursor-default group"
              >
                <div className="space-y-4">
                  
                  {/* Icon wrap */}
                  <div className={`w-11 h-11 rounded-xl ${f.bg} flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform`}>
                    <IconComponent size={20} className={`${f.color}`} />
                  </div>

                  <h4 className="text-base font-bold text-white group-hover:text-purple-300 transition-colors">{f.title}</h4>
                  <p className="text-xs text-gray-400 leading-relaxed font-normal">{f.desc}</p>
                </div>

                <div className="pt-4 flex items-center gap-1.5 text-[10px] font-bold text-purple-400/80 group-hover:text-purple-300 transition-colors mt-auto">
                  <span>Learn more</span>
                  <ChevronRight size={12} className="group-hover:translate-x-1 transition-transform" />
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* EARN MONEY CREATOR ECONOMY SECTION */}
      <section id="earn" className="py-20 bg-gradient-to-b from-gray-950/20 via-purple-950/10 to-gray-950/20 border-y border-gray-800/60 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="grid lg:grid-cols-12 gap-12 items-center">
            
            {/* Calculator & text on Left */}
            <div className="lg:col-span-6 space-y-8">
              
              <div className="space-y-3">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded-full text-xs font-bold text-amber-300">
                  <Coins size={14} className="text-amber-400 animate-pulse" />
                  <span>Earn Money Without Leaving SomLuul</span>
                </div>
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white leading-none font-sans">
                  Monetize Your Influence, <br />
                  Get Paid Directly
                </h2>
                <p className="text-gray-300 text-sm sm:text-base leading-relaxed">
                  SomLuul hosts a dynamic Creator Economy. Post reels, share high-value feeds, go live with fans, or launch a shop on Marketplace to receive instant cash flow directly into your secure wallet.
                </p>
              </div>

              {/* Creator Economy Interactive Revenue Slider */}
              <div className="p-6 bg-gray-900/70 border border-amber-500/20 rounded-2xl space-y-6 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-xl pointer-events-none"></div>
                
                <div className="flex justify-between items-center">
                  <span className="text-xs uppercase font-black text-amber-400 tracking-wider">Creator Revenue Calculator</span>
                  <span className="text-[10px] bg-amber-500/10 text-amber-300 font-bold px-2.5 py-1 rounded-full border border-amber-500/20">Somali Payouts Supported</span>
                </div>

                {/* Slider */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-sm font-bold text-gray-200">
                    <span>Estimated Followers</span>
                    <span className="text-white font-mono font-black">{formatNumber(estimatedFollowers)} fans</span>
                  </div>
                  <input 
                    type="range" 
                    min="1000" 
                    max="500000" 
                    step="5000"
                    className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                    value={estimatedFollowers}
                    onChange={(e) => setEstimatedFollowers(parseInt(e.target.value))}
                  />
                  <div className="flex justify-between text-[10px] text-gray-500 font-bold">
                    <span>1,000</span>
                    <span>250,000</span>
                    <span>500,000+</span>
                  </div>
                </div>

                {/* Outcome estimate */}
                <div className="p-4 bg-gray-950/80 rounded-xl border border-gray-800/85 flex items-center justify-between">
                  <div className="text-left">
                    <p className="text-[10px] text-gray-400 uppercase font-black">Estimated Monthly Earnings</p>
                    <p className="text-3xl font-black font-mono text-amber-400">${formatNumber(currentEstimatedEarnings)}<span className="text-xs text-gray-500 font-bold ml-1">/ mo</span></p>
                  </div>
                  <button 
                    onClick={() => onOpenAuth('email-signup')}
                    className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
                  >
                    Start Earning
                  </button>
                </div>

                <p className="text-[10px] text-gray-500 leading-normal text-left">
                  *Estimates are calculated based on active viewer star tipping, ads commission matching, and marketplace engagement. Actual earnings fluctuate depending on fan interaction.
                </p>

              </div>

            </div>

            {/* Grid on Right */}
            <div className="lg:col-span-6 grid sm:grid-cols-2 gap-4">
              {monetizationCards.map((c, idx) => {
                const IconComponent = c.icon;
                return (
                  <div 
                    key={idx}
                    className="p-5 bg-[#141b2d]/60 hover:bg-[#1e293b]/60 border border-gray-800 rounded-2xl hover:border-amber-500/20 transition-all text-left space-y-3 shadow-md group cursor-default"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-lg shadow-inner group-hover:scale-110 transition-transform">
                        <IconComponent className="text-amber-400" size={18} />
                      </div>
                      <h4 className="text-sm font-bold text-white group-hover:text-amber-300 transition-colors">{c.title}</h4>
                    </div>
                    <p className="text-xs text-gray-400 leading-normal font-normal">{c.desc}</p>
                  </div>
                );
              })}
            </div>

          </div>

        </div>
      </section>

      {/* APP INTERACTIVE SCREENSHOTS SECTION */}
      <section id="screenshots" className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        <div className="text-center space-y-4 mb-12">
          <h2 className="text-xs font-black uppercase tracking-widest text-pink-400">Visual Tour</h2>
          <h3 className="text-3xl sm:text-4xl font-black text-white font-sans">
            Sleek, Modern App Screen Experience
          </h3>
          <p className="text-gray-400 max-w-xl mx-auto text-sm">
            Toggle through different interface workspaces inside SomLuul. Explore our polished UI designed for high performance.
          </p>
        </div>

        {/* Horizontal tabs */}
        <div className="flex flex-wrap gap-2 justify-center mb-8">
          {appScreenshots.map(s => (
            <button
              key={s.id}
              onClick={() => setActiveScreenshotTab(s.id)}
              className={`px-4 py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                activeScreenshotTab === s.id
                  ? 'bg-gradient-to-r from-pink-500/15 to-purple-500/15 border-pink-500 text-pink-300 shadow-lg'
                  : 'bg-gray-900/40 border-gray-800 text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              {s.title}
            </button>
          ))}
        </div>

        {/* Carousel Preview Content with nice device previews */}
        <div className="bg-gray-950/40 border border-gray-800 p-6 md:p-10 rounded-[32px] shadow-2xl relative overflow-hidden">
          
          {/* Inner ambient lights */}
          <div className="absolute top-0 left-0 w-48 h-48 bg-pink-500/5 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute bottom-0 right-0 w-48 h-48 bg-purple-500/5 rounded-full blur-3xl pointer-events-none"></div>

          <div className="grid md:grid-cols-12 gap-8 items-center">
            
            {/* Selected Tab Screenshot graphic */}
            <div className="md:col-span-5 flex justify-center">
              <AnimatePresence mode="wait">
                {appScreenshots.map(s => {
                  if (s.id !== activeScreenshotTab) return null;
                  return (
                    <motion.div
                      key={s.id}
                      initial={{ opacity: 0, scale: 0.95, rotate: -1 }}
                      animate={{ opacity: 1, scale: 1, rotate: 0 }}
                      exit={{ opacity: 0, scale: 0.95, rotate: 1 }}
                      transition={{ duration: 0.3 }}
                      className={`w-[240px] h-[480px] ${s.bg} rounded-[36px] p-4 shadow-xl border-2 border-gray-700 flex flex-col justify-between text-left`}
                    >
                      <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-2">
                        <span className="text-[9px] font-black tracking-tight text-white">{appName} Live</span>
                        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
                      </div>

                      <div className="flex-1 flex flex-col justify-center text-center px-2 py-4">
                        <pre className="text-xs text-gray-200 font-sans whitespace-pre-line leading-relaxed tracking-wide text-left font-semibold">
                          {s.imageText}
                        </pre>
                      </div>

                      <div className="border-t border-white/10 pt-2 text-[8px] text-gray-400 flex justify-between items-center font-mono">
                        <span>@somluul_systems</span>
                        <span>v2.0.0</span>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>

            {/* Info details of active screen */}
            <div className="md:col-span-7 space-y-6 text-center md:text-left">
              <AnimatePresence mode="wait">
                {appScreenshots.map(s => {
                  if (s.id !== activeScreenshotTab) return null;
                  return (
                    <motion.div
                      key={s.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.3 }}
                      className="space-y-4"
                    >
                      <h4 className="text-2xl font-black text-white">{s.title} Overview</h4>
                      <p className="text-gray-300 text-sm leading-relaxed">{s.desc}</p>
                      
                      {/* Check bullets */}
                      <ul className="space-y-3.5 text-xs text-gray-300 text-left max-w-md mx-auto md:mx-0">
                        <li className="flex items-center gap-2.5">
                          <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                          <span>Fully optimized for zero network lag on Somali telco providers.</span>
                        </li>
                        <li className="flex items-center gap-2.5">
                          <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                          <span>Interactive notification alerts and persistent memory storage.</span>
                        </li>
                        <li className="flex items-center gap-2.5">
                          <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                          <span>Easy-to-use intuitive interface suitable for all age brackets.</span>
                        </li>
                      </ul>

                      <div className="pt-4 flex gap-4 justify-center md:justify-start">
                        <button 
                          onClick={() => onOpenAuth('email-signup')}
                          className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl"
                        >
                          Join Now
                        </button>
                        <a
                          href="#screenshots"
                          className="px-5 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold text-xs rounded-xl"
                        >
                          View App Screens
                        </a>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>

          </div>

        </div>
      </section>

      {/* SECURITY SECTION */}
      <section id="security" className="py-20 bg-gray-950/40 border-y border-gray-800/60 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-12 gap-12 items-center">
            
            {/* Shield animation Left */}
            <div className="lg:col-span-5 flex justify-center relative">
              <div className="absolute w-72 h-72 bg-cyan-600/10 rounded-full blur-[80px] pointer-events-none"></div>
              
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 25, ease: "linear" }}
                className="w-56 h-56 border-2 border-dashed border-cyan-500/20 rounded-full flex items-center justify-center relative"
              >
                <div className="absolute inset-4 border border-purple-500/10 rounded-full"></div>
                <div className="absolute inset-8 border-2 border-dashed border-indigo-500/10 rounded-full animate-[spin_12s_linear_infinite_reverse]"></div>
                
                {/* Real rotating shield center */}
                <div className="w-28 h-28 bg-[#141b2d] border border-cyan-500/30 rounded-3xl flex items-center justify-center shadow-xl shadow-cyan-500/10 hover:scale-105 transition-transform">
                  <Shield size={48} className="text-cyan-400 animate-pulse" />
                </div>
              </motion.div>
            </div>

            {/* Shield description Right */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              <div className="space-y-3">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-cyan-500/10 border border-cyan-500/20 rounded-full text-xs font-bold text-cyan-300">
                  <ShieldCheck size={14} className="text-cyan-400" />
                  <span>Transport & Account Security</span>
                </div>
                <h3 className="text-3xl sm:text-4xl font-black text-white font-sans">
                  Protected by secure transport and account controls.
                </h3>
                <p className="text-gray-300 text-sm sm:text-base leading-relaxed">
                  SomLuul places security at its core. Every text message, voice note, document file, or HD video call is locked with keys generated instantly on your device. We follow a strict zero-knowledge policy.
                </p>
              </div>

              {/* Bento checklist */}
              <div className="grid sm:grid-cols-2 gap-4 text-left pt-2">
                
                {[
                  { title: "Secure Messaging", desc: "No middleman can intercept your calls." },
                  { title: "Secure Verified Login", desc: "Hardware token and session verification." },
                  { title: "Two-Factor Authentication", desc: "Add extra password layers to your phone." },
                  { title: "Encrypted Cloud Backup", desc: "Securely restore files at will." },
                  { title: "Device Session Protection", desc: "Sign out remote devices instantly." }
                ].map((s, idx) => (
                  <div key={idx} className="flex gap-3 items-start p-3 bg-gray-900/50 rounded-xl border border-gray-800">
                    <CheckCircle2 size={16} className="text-cyan-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-white">{s.title}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">{s.desc}</p>
                    </div>
                  </div>
                ))}

              </div>

            </div>

          </div>
        </div>
      </section>

      {/* INVESTMENT & CREATOR HIGHLIGHT (ADDONS) */}
      <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid lg:grid-cols-12 gap-12 items-center">
          
          <div className="lg:col-span-6 space-y-6 text-center lg:text-left">
            <h2 className="text-xs font-black uppercase tracking-widest text-purple-400">Join the Economy</h2>
            <h3 className="text-3xl sm:text-4xl font-black text-white font-sans">
              Creator Economy & Future Growth
            </h3>
            <p className="text-gray-300 text-sm sm:text-base leading-relaxed">
              We are building a robust network connecting Somali and global developers, creators, investors, and local businesses. Support local talent and explore limitless advertising possibilities on SomLuul.
            </p>

            <div className="p-5 bg-gradient-to-r from-purple-500/10 to-indigo-500/10 border border-purple-500/20 rounded-2xl text-left space-y-3.5">
              <p className="text-xs font-bold text-purple-200 uppercase tracking-wider">🌟 Investor Pitch Highlights</p>
              <ul className="space-y-2 text-xs text-gray-300">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span>
                  <span>Fastest-growing tech ecosystem in the Horn of Africa.</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span>
                  <span>Wallet and payment integrations are available only when the required provider is configured.</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span>
                  <span>Active monetization models yielding highly engaged micro-economies.</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Creators display on Right */}
          <div className="lg:col-span-6 space-y-4">
            <div className="text-left">
              <p className="text-xs font-black uppercase text-pink-400 tracking-wider mb-2">What you can do on SomLuul</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              
              {[
                { name: "Creators Hub", role: "Earn with real content", avatar: "🎬", balance: "Live on SomLuul" },
                { name: "Stories", role: "24h status updates", avatar: "📱", balance: "Share freely" },
                { name: "Marketplace", role: "Buy & sell locally", avatar: "🛒", balance: "Real listings" },
                { name: "Messenger", role: "Private & group chat", avatar: "💬", balance: "Encrypted option" },
              ].map((c, index) => (
                <div key={index} className="p-4 bg-gray-900/60 border border-gray-800 rounded-2xl flex items-center gap-3.5 hover:border-pink-500/25 transition-all group">
                  <div className="w-11 h-11 rounded-xl bg-gray-800 flex items-center justify-center font-bold text-lg border border-gray-700 shadow group-hover:scale-105 transition-transform">
                    {c.avatar}
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-bold text-white group-hover:text-pink-300 transition-colors">{c.name}</p>
                    <p className="text-[10px] text-gray-400">{c.role}</p>
                    <p className="text-[9px] text-amber-400 font-mono font-bold mt-0.5">💰 {c.balance}</p>
                  </div>
                </div>
              ))}

            </div>

            {/* Investor Link button */}
            <div className="pt-2 text-center lg:text-left">
              <button 
                onClick={() => onOpenAuth('email-signup')}
                className="text-xs font-bold text-purple-400 hover:text-purple-300 inline-flex items-center gap-1 cursor-pointer"
              >
                <span>Interested in partnering or investing? Apply now</span>
                <ArrowRight size={12} />
              </button>
            </div>

          </div>

        </div>
      </section>

      {/* DOWNLOAD PLATFORMS SECTIONS */}
      <section id="downloads" className="py-20 bg-gray-950/40 border-y border-gray-800/60 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-xs font-black uppercase tracking-widest text-indigo-400">Multi-Platform Access</h2>
            <h3 className="text-3xl sm:text-4xl font-black text-white font-sans">
              Download SomLuul For Your Device
            </h3>
            <p className="text-gray-400 max-w-xl mx-auto text-sm">
              Stay connected across all devices. Download the native app or boot up instantly in your web browser.
            </p>
          </div>

          {/* Platforms Bento Grid */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-6">
            
            {/* Google Play */}
            <div className="p-6 bg-[#141b2d]/60 border border-gray-800 rounded-3xl text-center space-y-4 shadow-md hover:border-purple-500/20 transition-all flex flex-col justify-between">
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center mx-auto text-xl">🤖</div>
                <h4 className="text-base font-bold text-white">Android Client</h4>
                <p className="text-xs text-gray-400">Download the official direct APK package for immediate installation on any Android device.</p>
              </div>
              <button 
                onClick={() => alert('Install: browser menu → Add to Home Screen / Install app. Website stays online.')}
                className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Download APK Direct
              </button>
            </div>

            {/* Apple App Store */}
            <div className="p-6 bg-[#141b2d]/60 border border-gray-800 rounded-3xl text-center space-y-4 shadow-md hover:border-cyan-500/20 transition-all flex flex-col justify-between">
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 flex items-center justify-center mx-auto text-xl">🍏</div>
                <h4 className="text-base font-bold text-white">iPhone & iPad iOS</h4>
                <p className="text-xs text-gray-400">Download the official direct enterprise iOS app package for Apple iPhone and iPad devices.</p>
              </div>
              <button 
                onClick={() => alert('iPhone: Safari → Share → Add to Home Screen. Website stays online.')}
                className="w-full py-2 bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Download IPA Direct
              </button>
            </div>

            {/* Windows Desktop */}
            <div className="p-6 bg-[#141b2d]/60 border border-gray-800 rounded-3xl text-center space-y-4 shadow-md hover:border-indigo-500/20 transition-all flex flex-col justify-between">
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center mx-auto text-xl">🪟</div>
                <h4 className="text-base font-bold text-white">Windows Desktop</h4>
                <p className="text-xs text-gray-400">Real Windows x64 installer (Electron). Build with: npm run build:exe</p>
              </div>
              <button 
                onClick={() => triggerFileDownload('SomLuul-Setup-1.0.0-x64.exe')}
                className="w-full py-2 bg-[var(--somluul-primary)] hover:brightness-110 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Download Windows x64
              </button>
            </div>

            {/* macOS Desktop */}
            <div className="p-6 bg-[#141b2d]/60 border border-gray-800 rounded-3xl text-center space-y-4 shadow-md hover:border-pink-500/20 transition-all flex flex-col justify-between">
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-pink-500/10 flex items-center justify-center mx-auto text-xl">💻</div>
                <h4 className="text-base font-bold text-white">macOS Client</h4>
                <p className="text-xs text-gray-400">macOS: use the website in Safari, or build Electron for mac on a Mac (not available as free public DMG here).</p>
              </div>
              <button 
                onClick={() => alert('macOS: use Chrome/Safari → Install app, or open the website. No separate .dmg yet.')}
                className="w-full py-2 bg-pink-600 hover:bg-pink-700 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Download DMG Installer
              </button>
            </div>

            {/* Linux Desktop */}
            <div className="p-6 bg-[#141b2d]/60 border border-gray-800 rounded-3xl text-center space-y-4 shadow-md hover:border-orange-500/20 transition-all flex flex-col justify-between">
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-orange-500/10 flex items-center justify-center mx-auto text-xl">🐧</div>
                <h4 className="text-base font-bold text-white">Linux Client</h4>
                <p className="text-xs text-gray-400">AppImage and deb packages supporting Ubuntu, Debian, Fedora and Arch distributions.</p>
              </div>
              <button 
                onClick={() => alert('Linux: open the website in browser, or Install as PWA. No AppImage yet.')}
                className="w-full py-2 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Download AppImage
              </button>
            </div>

          </div>

        </div>
      </section>

      {/* USER TESTIMONIALS */}
      <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        <div className="text-center space-y-4 mb-14">
          <h2 className="text-xs font-black uppercase tracking-widest text-purple-400">User Reviews</h2>
          <h3 className="text-3xl sm:text-4xl font-black text-white font-sans">
            Trusted by the Global Somali Community
          </h3>
          <p className="text-gray-400 max-w-xl mx-auto text-sm">
            See how everyday users, digital creators, and business minds utilize SomLuul to simplify their daily communication.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {testimonials.map((t, idx) => (
            <div 
              key={idx}
              className="p-6 bg-gray-900/40 border border-gray-800 rounded-2xl flex flex-col justify-between text-left shadow-lg relative"
            >
              <div className="absolute top-6 right-6 text-gray-800 text-5xl font-serif pointer-events-none">“</div>
              <div className="space-y-4">
                
                {/* Stars */}
                <div className="flex gap-1">
                  {[...Array(t.stars)].map((_, i) => (
                    <Star key={i} size={14} className="fill-current text-amber-400" />
                  ))}
                </div>

                <p className="text-gray-300 text-xs sm:text-sm leading-relaxed italic">"{t.text}"</p>
              </div>

              <div className="pt-6 border-t border-gray-800/60 mt-6 flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-purple-500/10 flex items-center justify-center font-bold text-xs text-purple-300">
                  {t.name.substring(0, 2)}
                </div>
                <div>
                  <p className="text-xs font-bold text-white">{t.name}</p>
                  <p className="text-[10px] text-gray-400">{t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* DYNAMIC CUSTOM DESCRIPTION & IMAGE GALLERY SECTION */}
      {((landingSettings?.longDescription) || (landingSettings?.heroImages && landingSettings.heroImages.length > 0)) && (
        <section className="py-20 border-t border-gray-800 bg-[#0F172A] relative z-10">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
            
            {/* Long Description Text Block */}
            {landingSettings?.longDescription && (
              <div className="max-w-4xl mx-auto text-center space-y-6">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-500/10 border border-purple-500/20 rounded-full text-xs font-bold text-purple-300">
                  <Info size={12} />
                  <span>Farriinta Maamulka & Platform Updates</span>
                </div>
                <h3 className="text-3xl font-black text-white font-sans">
                  Warbixin Dheeraad ah oo ku saabsan SomLuul
                </h3>
                <div className="w-16 h-1 bg-gradient-to-r from-purple-500 to-indigo-500 mx-auto rounded-full"></div>
                
                <p className="text-gray-300 text-sm sm:text-base leading-relaxed font-sans text-left bg-gray-900/40 p-6 md:p-8 rounded-3xl border border-gray-800/80 whitespace-pre-wrap shadow-xl">
                  {landingSettings.longDescription}
                </p>
              </div>
            )}

            {/* Custom Dynamic Image Gallery Slider */}
            {landingSettings?.heroImages && landingSettings.heroImages.length > 0 && (
              <div className="space-y-8">
                <div className="text-center space-y-2">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-pink-500/10 border border-pink-500/20 rounded-full text-xs font-bold text-pink-300">
                    <Star size={12} />
                    <span>Madal Sawiro (Platform Showcase)</span>
                  </div>
                  <h3 className="text-3xl font-black text-white font-sans">
                    Muqaalka iyo Sawirada Cusub ee SomLuul
                  </h3>
                  <p className="text-gray-400 text-xs max-w-xl mx-auto">
                    Kani waa sawirada aan xadidnayn ee uu soo galiyay maamulaha (super admin) ee muujinaya bilicda iyo shaqada super-app-ka SomLuul.
                  </p>
                </div>

                {/* Grid gallery */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                  {landingSettings.heroImages.map((imgUrl: string, idx: number) => (
                    <motion.div
                      key={idx}
                      whileHover={{ scale: 1.02 }}
                      className="group relative rounded-2xl overflow-hidden border border-gray-800 bg-gray-900/30 aspect-video shadow-md hover:border-purple-500/40 transition-all duration-300"
                    >
                      <img
                        src={imgUrl}
                        alt={`SomLuul Platform Showcase ${idx + 1}`}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all flex items-end p-4">
                        <p className="text-xs font-bold text-white font-sans">
                          SomLuul Showcase #{idx + 1}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

          </div>
        </section>
      )}

      {/* INTERACTIVE ACCORDION FAQ SECTION */}
      <section id="faq" className="py-20 bg-gray-950/40 border-t border-gray-800/60 relative z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          
          <div className="text-center space-y-4 mb-14">
            <h2 className="text-xs font-black uppercase tracking-widest text-purple-400">FAQ Help Center</h2>
            <h3 className="text-3xl font-black text-white font-sans">Su’aalaha Inta badan la Iska Weydiiyo</h3>
            <p className="text-gray-400 text-sm">
              Wax kasta oo aad u baahan tahay inaad ka ogaato adeegyada SomLuul, amnigaaga, iyo diiwaan-gelinta.
            </p>
          </div>

          <div className="space-y-4">
            {faqItems.map((item, index) => {
              const isOpen = faqOpenIndex === index;
              return (
                <div 
                  key={index} 
                  className="bg-gray-900/40 border border-gray-800 rounded-2xl overflow-hidden transition-all duration-300"
                >
                  <button
                    onClick={() => setFaqOpenIndex(isOpen ? null : index)}
                    className="w-full px-6 py-5 flex items-center justify-between text-left font-bold text-white hover:bg-gray-800/40 transition-colors cursor-pointer"
                  >
                    <span className="text-sm pr-4">{item.q}</span>
                    <ChevronDown 
                      size={16} 
                      className={`text-purple-400 transition-transform duration-300 shrink-0 ${isOpen ? 'rotate-180' : ''}`} 
                    />
                  </button>

                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: "easeInOut" }}
                      >
                        <div className="px-6 pb-5 pt-1 text-xs sm:text-sm text-gray-400 leading-relaxed text-left border-t border-gray-800/60 bg-gray-950/20">
                          {item.a}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>

        </div>
      </section>

      {/* FOOTER SECTION */}
      <footer className="bg-gray-950/80 border-t border-gray-800/80 pt-16 pb-10 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="grid grid-cols-1 md:grid-cols-12 gap-12 pb-12 border-b border-gray-800/60">
            
            {/* Logo Column */}
            <div className="md:col-span-5 space-y-6 text-left">
              <div className="flex items-center gap-3 justify-start">
                <AppLogo 
                  src={appLogo} 
                  alt="SomLuul Logo" 
                  className="w-10 h-10 rounded-xl" 
                />
                <span className="text-lg font-black bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                  {appName}
                </span>
              </div>
              <p className="text-gray-400 text-xs leading-relaxed max-w-sm">
                Ku xiriir asxaabtaada, ku raaxayso wicitaano tayo sare leh, kaydi faylashaada daruuraha, oo dakhli ku samee hal-abuurkaaga adoon ka bixin SomLuul.
              </p>

              {/* Social links */}
              <div className="flex gap-4">
                <a href="#footer" className="w-8 h-8 rounded-full bg-gray-900 border border-gray-800 flex items-center justify-center text-gray-400 hover:text-white hover:border-purple-500/30 transition-all">
                  <MessageCircle size={15} />
                </a>
                <a href="#footer" className="w-8 h-8 rounded-full bg-gray-900 border border-gray-800 flex items-center justify-center text-gray-400 hover:text-white hover:border-cyan-500/30 transition-all">
                  <Share2 size={15} />
                </a>
                <a href="#footer" className="w-8 h-8 rounded-full bg-gray-900 border border-gray-800 flex items-center justify-center text-gray-400 hover:text-white hover:border-pink-500/30 transition-all">
                  <Heart size={15} />
                </a>
              </div>
            </div>

            {/* Links Columns */}
            <div className="md:col-span-3 grid grid-cols-2 gap-8 text-left text-xs font-semibold text-gray-400">
              <div className="space-y-3">
                <p className="text-xs font-black text-white uppercase tracking-wider">Company</p>
                <a href="#footer" className="block hover:text-white transition-colors">About Us</a>
                <a href="#footer" className="block hover:text-white transition-colors">Careers</a>
                <a href="#footer" className="block hover:text-white transition-colors">Blog</a>
                <a href="#footer" className="block hover:text-white transition-colors">Safety Center</a>
              </div>

              <div className="space-y-3">
                <p className="text-xs font-black text-white uppercase tracking-wider">Legal</p>
                <a href="#footer" className="block hover:text-white transition-colors">Privacy Policy</a>
                <a href="#footer" className="block hover:text-white transition-colors">Terms of Service</a>
                <a href="#footer" className="block hover:text-white transition-colors">Cookies Policy</a>
                <a href="#footer" className="block hover:text-white transition-colors">Developers API</a>
              </div>
            </div>

            {/* Newsletter Subscription */}
            <div className="md:col-span-4 space-y-4 text-left">
              <p className="text-xs font-black text-white uppercase tracking-wider">Stay Updated</p>
              <p className="text-gray-400 text-xs">Ku biir wargeyskeena si aad u hesho wararkii ugu dambeeyay iyo sifooyinka cusub ee lagu daro SomLuul.</p>
              
              {newsletterSubscribed ? (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 size={14} />
                  <span>Waad ku guuleysatay inaad is qorto!</span>
                </div>
              ) : (
                <form onSubmit={handleNewsletterSubmit} className="flex gap-2">
                  <input 
                    type="email" 
                    required
                    placeholder="E-mailkaaga..."
                    className="flex-1 px-3.5 py-2 bg-gray-900 border border-gray-800 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500"
                    value={newsletterEmail}
                    onChange={(e) => setNewsletterEmail(e.target.value)}
                  />
                  <button 
                    type="submit"
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
                  >
                    Kuso biir
                  </button>
                </form>
              )}
            </div>

          </div>

          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-[11px] text-gray-500 font-bold">
            <p>{landingSettings?.footerText || (`© ${new Date().getFullYear()} ${appName}. All rights reserved.`)}</p>
            <div className="flex gap-4 mt-4 sm:mt-0">
              <a href="#footer" className="hover:underline">Contact Support</a>
              <span>•</span>
              <a href="#footer" className="hover:underline">Somali Local Integration</a>
            </div>
          </div>

        </div>
      </footer>


    </div>
  );
};
