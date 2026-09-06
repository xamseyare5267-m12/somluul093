import React, { useEffect, useState } from 'react';
import { useLanguage } from './LanguageContext';
import { AppLogo } from './AppLogo';
import {
  Monitor, Smartphone, Tablet, Download, CheckCircle2,
  Info, Globe, Shield
} from 'lucide-react';
import { motion } from 'motion/react';
import axios from 'axios';

interface AppDownloadsProps {
  onShowToast: (message: string, type: 'success' | 'error') => void;
}

export const AppDownloads: React.FC<AppDownloadsProps> = ({ onShowToast }) => {
  const { appName, appLogo, language } = useLanguage();
  const so = language === 'so';
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isAppInstallable, setIsAppInstallable] = useState(false);
  const [isAlreadyInstalled, setIsAlreadyInstalled] = useState(false);
  const [winFiles, setWinFiles] = useState<{ setup?: boolean; portable?: boolean }>({});

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
      setIsAlreadyInstalled(true);
    }
    const onBip = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsAppInstallable(true);
    };
    window.addEventListener('beforeinstallprompt', onBip);
    (async () => {
      const check = async (name: string) => {
        try {
          const r = await axios.head(`/api/downloads/file?name=${encodeURIComponent(name)}`, { validateStatus: () => true });
          return r.status === 200;
        } catch {
          return false;
        }
      };
      setWinFiles({
        setup: await check('SomLuul-Setup-1.0.0-x64.exe'),
        portable: await check('SomLuul-Portable-1.0.0-x64.exe'),
      });
    })();
    return () => window.removeEventListener('beforeinstallprompt', onBip);
  }, []);

  const triggerPwa = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        onShowToast(
          so ? 'App waa la rakibay. Website-ku weli wuu shaqeynayaa.' : 'App installed. Website stays online.',
          'success'
        );
        setIsAppInstallable(false);
        setDeferredPrompt(null);
      } else {
        onShowToast(so ? 'Rakibaada waa la joojiyay.' : 'Install cancelled.', 'error');
      }
      return;
    }
    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    onShowToast(
      isIOS ? 'Safari → Share → Add to Home Screen' : (so ? 'Browser → Install app / Add to Home Screen' : 'Browser → Install app / Add to Home Screen'),
      'success'
    );
  };

  const downloadWin = (name: string) => {
    window.open(`/api/downloads/file?name=${encodeURIComponent(name)}`, '_blank');
    onShowToast(so ? `${name} waa la soo dejinayaa…` : `Downloading ${name}…`, 'success');
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl p-6 md:p-8 bg-[var(--sl-bg-card)] border border-[var(--sl-border)] shadow-[var(--sl-shadow-sm)]">
        <div className="flex flex-col sm:flex-row items-center gap-5">
          <AppLogo src={appLogo} alt={appName} className="w-16 h-16 rounded-2xl" containerClassName="shrink-0" />
          <div className="text-center sm:text-left space-y-1">
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-[var(--sl-text)]">
              {so ? `Soo deji ${appName}` : `Download ${appName}`}
            </h1>
            <p className="text-sm text-[var(--sl-text-secondary)] max-w-xl">
              {so
                ? 'Windows x64 EXE dhab ah (marka la dhiso). Android & iPhone: Install app (PWA). Website-ku weli online.'
                : 'Real Windows x64 EXE when built. Android & iPhone: Install app (PWA). Website stays online.'}
            </p>
          </div>
        </div>
      </motion.div>

      <div className="rounded-2xl border border-[var(--sl-border)] bg-[var(--sl-bg-card)] p-5 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center">
            <Monitor size={22} className="text-blue-600" />
          </div>
          <div>
            <h2 className="font-bold text-sm">Windows x64</h2>
            <p className="text-[11px] text-[var(--sl-text-muted)]">NSIS Setup + Portable · 64-bit</p>
          </div>
        </div>
        {winFiles.setup || winFiles.portable ? (
          <div className="flex flex-wrap gap-2">
            {winFiles.setup && (
              <button type="button" onClick={() => downloadWin('SomLuul-Setup-1.0.0-x64.exe')}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-[var(--somluul-primary)] text-white">
                <Download size={14} /> Setup x64 (.exe)
              </button>
            )}
            {winFiles.portable && (
              <button type="button" onClick={() => downloadWin('SomLuul-Portable-1.0.0-x64.exe')}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold border border-[var(--sl-border)]">
                <Download size={14} /> Portable x64 (.exe)
              </button>
            )}
          </div>
        ) : (
          <p className="text-xs text-[var(--sl-text-secondary)] leading-relaxed">
            {so
              ? 'EXE weli lama gelin server. PC Windows: npm run build:exe → soo geli dist_electron/*.exe → public/downloads/ → redeploy. Fiiri BUILD_INSTALLERS.md'
              : 'EXE not on server yet. Windows PC: npm run build:exe → upload dist_electron/*.exe to public/downloads/ → redeploy. See BUILD_INSTALLERS.md'}
          </p>
        )}
      </div>

      <div className="rounded-2xl border border-[var(--sl-border)] bg-[var(--sl-bg-card)] p-5 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center">
            <Smartphone size={22} className="text-emerald-600" />
          </div>
          <div>
            <h2 className="font-bold text-sm">Android</h2>
            <p className="text-[11px] text-[var(--sl-text-muted)]">PWA install · ogolaansho browser/OS</p>
          </div>
        </div>
        <p className="text-xs text-[var(--sl-text-secondary)] leading-relaxed">
          {so
            ? 'Chrome → Install app. Mic/camera/notifications: Android wuu weydiinayaa. APK signed: Capacitor + Android Studio (BUILD_INSTALLERS.md).'
            : 'Chrome → Install app. Mic/camera/notifications: Android will ask. Signed APK: Capacitor + Android Studio (BUILD_INSTALLERS.md).'}
        </p>
        <button type="button" onClick={triggerPwa}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-[var(--somluul-primary)] text-white">
          <Download size={14} /> {isAlreadyInstalled ? (so ? 'Horey loo rakibay' : 'Already installed') : 'Install Android app'}
        </button>
      </div>

      <div className="rounded-2xl border border-[var(--sl-border)] bg-[var(--sl-bg-card)] p-5 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/40 flex items-center justify-center">
            <Tablet size={22} className="text-amber-600" />
          </div>
          <div>
            <h2 className="font-bold text-sm">iPhone / iPad</h2>
            <p className="text-[11px] text-[var(--sl-text-muted)]">Safari Add to Home Screen (Apple policy)</p>
          </div>
        </div>
        <p className="text-xs text-[var(--sl-text-secondary)] leading-relaxed">
          {so
            ? 'Safari → Share → Add to Home Screen. Apple uma oggola IPA website dadweyne — App Store/TestFlight + Apple Developer ($99/sanad).'
            : 'Safari → Share → Add to Home Screen. Apple does not allow public IPA download for all users — App Store/TestFlight needs Apple Developer ($99/yr).'}
        </p>
        <button type="button" onClick={triggerPwa}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-[var(--somluul-primary)] text-white">
          <Globe size={14} /> {so ? 'Tus sida loo rakibo' : 'Show install steps'}
        </button>
      </div>

      <div className="flex items-start gap-3 rounded-xl border border-[var(--sl-border)] bg-[var(--sl-bg-muted)] p-4 text-xs text-[var(--sl-text-secondary)]">
        <Shield size={16} className="shrink-0 mt-0.5 text-[var(--somluul-primary)]" />
        <p>
          {so
            ? 'Calls: mic & camera permission. Notifications: user ogolaansho. Windows EXE: adiga dhis; SmartScreen ilaa code-signing. iOS IPA dadweyne: App Store keliya.'
            : 'Calls: mic & camera permission. Notifications: user consent. Windows EXE: you build; SmartScreen until code-signed. Public iOS IPA: App Store only.'}
        </p>
      </div>

      {isAlreadyInstalled && (
        <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700 dark:text-emerald-400">
          <CheckCircle2 size={18} />
          {so ? 'Hadda app mode.' : 'You are in app mode.'}
        </div>
      )}
    </div>
  );
};
