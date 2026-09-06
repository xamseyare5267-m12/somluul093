import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { AppLogo } from './AppLogo';
import { SomLuulLogo } from './brand/SomLuulLogo';
import { 
  Eye, 
  EyeOff, 
  Shield, 
  Mail, 
  Lock, 
  User, 
  Check, 
  ArrowRight, 
  AlertCircle, 
  RefreshCw, 
  ChevronDown, 
  Laptop, 
  Phone, 
  Smartphone, 
  Calendar, 
  Chrome, 
  Facebook, 
  ArrowLeft,
  Key,
  Flame,
  Globe,
  Plus,
  X
} from 'lucide-react';
import { AuthSession } from '../types';
import { useLanguage, SUPPORTED_LANGUAGES } from './LanguageContext';
import { LandingPage } from './LandingPage';

interface AuthPagesProps {
  onLoginSuccess: (session: AuthSession) => void;
  onShowToast: (message: string, type: 'success' | 'error') => void;
}

// Support multi-screen layout for all auth options
type ViewState = 
  | 'welcome'         // Main choice screen
  | 'email-login'     // Standard Email Login
  | 'email-signup'    // Modern Email Signup with DOB, Username, Bio
  | 'email-verify'    // Code verification after signup
  | 'phone-login'     // Country code + Phone number input
  | 'phone-otp'       // SMS OTP input and countdown
  | 'forgot'          // Request forgot password code
  | 'reset';          // Confirm password reset with code

interface CountryOption {
  code: string;
  name: string;
  flag: string;
}

const COUNTRIES: CountryOption[] = [
  { code: '+252', name: 'Somalia', flag: '🇸🇴' },
  { code: '+254', name: 'Kenya', flag: '🇰🇪' },
  { code: '+251', name: 'Ethiopia', flag: '🇪🇹' },
  { code: '+253', name: 'Djibouti', flag: '🇩🇯' },
  { code: '+256', name: 'Uganda', flag: '🇺🇬' },
  { code: '+255', name: 'Tanzania', flag: '🇹🇿' },
  { code: '+249', name: 'Sudan', flag: '🇸🇩' },
  { code: '+211', name: 'South Sudan', flag: '🇸🇸' },
  { code: '+20', name: 'Egypt', flag: '🇪🇬' },
  { code: '+1', name: 'USA', flag: '🇺🇸' },
  { code: '+1', name: 'Canada', flag: '🇨🇦' },
  { code: '+44', name: 'UK', flag: '🇬🇧' },
  { code: '+46', name: 'Sweden', flag: '🇸🇪' },
  { code: '+47', name: 'Norway', flag: '🇳🇴' },
  { code: '+45', name: 'Denmark', flag: '🇩🇰' },
  { code: '+358', name: 'Finland', flag: '🇫🇮' },
  { code: '+49', name: 'Germany', flag: '🇩🇪' },
  { code: '+33', name: 'France', flag: '🇫🇷' },
  { code: '+90', name: 'Turkey', flag: '🇹🇷' },
  { code: '+966', name: 'Saudi Arabia', flag: '🇸🇦' },
  { code: '+971', name: 'UAE', flag: '🇦🇪' },
  { code: '+974', name: 'Qatar', flag: '🇶🇦' },
  { code: '+965', name: 'Kuwait', flag: '🇰🇼' },
  { code: '+968', name: 'Oman', flag: '🇴🇲' },
  { code: '+967', name: 'Yemen', flag: '🇾🇪' },
  { code: '+60', name: 'Malaysia', flag: '🇲🇾' },
  { code: '+91', name: 'India', flag: '🇮🇳' },
  { code: '+92', name: 'Pakistan', flag: '🇵🇰' },
  { code: '+880', name: 'Bangladesh', flag: '🇧🇩' },
  { code: '+61', name: 'Australia', flag: '🇦🇺' },
  { code: '+64', name: 'New Zealand', flag: '🇳🇿' },
  { code: '+27', name: 'South Africa', flag: '🇿🇦' },
  { code: '+234', name: 'Nigeria', flag: '🇳🇬' },
  { code: '+233', name: 'Ghana', flag: '🇬🇭' },
  { code: '+250', name: 'Rwanda', flag: '🇷🇼' },
  { code: '+257', name: 'Burundi', flag: '🇧🇮' },
  { code: '+86', name: 'China', flag: '🇨🇳' },
  { code: '+81', name: 'Japan', flag: '🇯🇵' },
  { code: '+82', name: 'South Korea', flag: '🇰🇷' },
  { code: '+39', name: 'Italy', flag: '🇮🇹' },
  { code: '+31', name: 'Netherlands', flag: '🇳🇱' },
  { code: '+32', name: 'Belgium', flag: '🇧🇪' },
  { code: '+41', name: 'Switzerland', flag: '🇨🇭' },
  { code: '+43', name: 'Austria', flag: '🇦🇹' },
  { code: '+55', name: 'Brazil', flag: '🇧🇷' }
];

export const AuthPages: React.FC<AuthPagesProps> = ({ onLoginSuccess, onShowToast }) => {
  const { language, setLanguage, t, isRtl, appName, appLogo } = useLanguage();
  const [view, setView] = useState<ViewState>('email-login');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Respect Web Owner public signup switch
  const [publicSignupAllowed, setPublicSignupAllowed] = useState(true);
  useEffect(() => {
    axios.get('/api/landing-settings').then(r => {
      if (r.data && r.data.allowPublicSignup === false) setPublicSignupAllowed(false);
    }).catch(() => {});
  }, []);

  const [error, setError] = useState<string | null>(null);
  const [showLangMenu, setShowLangMenu] = useState(false);

  // Form Fields
  const [email, setEmail] = useState(() => localStorage.getItem('last_user_email') || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | ''>('');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Email/Phone Verification States
  const [verificationCode, setVerificationCode] = useState('');
  const [inputCode, setInputCode] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedCountry, setSelectedCountry] = useState(COUNTRIES[0]);
  const [showCountryMenu, setShowCountryMenu] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');
  const [phoneOtpCode, setPhoneOtpCode] = useState('');
  const [otpCountdown, setOtpCountdown] = useState(0);

  // Password Visibilities
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Active PWA status
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isAppInstallable, setIsAppInstallable] = useState(false);

  // Hidden Owner Entry State
  const [ownerClicksCount, setOwnerClicksCount] = useState(0);
  const [ownerClickTimer, setOwnerClickTimer] = useState<any>(null);
  const [showHiddenDot, setShowHiddenDot] = useState(false);
  const [dotClicksCount, setDotClicksCount] = useState(0);
  const [showHiddenPortal, setShowHiddenPortal] = useState(false);
  const [editClicksCount, setEditClicksCount] = useState(0);
  const [showOwnerValidation, setShowOwnerValidation] = useState(false);
  
  // Credentials for validate
  const [ownerUsernameInput, setOwnerUsernameInput] = useState('');
  const [ownerPasswordInput, setOwnerPasswordInput] = useState('');
  const [isValidatingOwner, setIsValidatingOwner] = useState(false);



  // Load active Remote Config parameters from API on startup
  const [remoteConfig, setRemoteConfig] = useState({
    secretClickTarget: 7,
    dotClickTarget: 30,
    editClickTarget: 5,
    invisibleAreaLocation: 'left-of-logo',
    dotLocation: 'top-right'
  });

  useEffect(() => {
    axios.get('/api/remote-config')
      .then(res => {
        if (res.data) setRemoteConfig(res.data);
      })
      .catch(() => {});
  }, []);

  const handleInvisibleAreaClick = () => {
    // Reset sequence timer after 2 seconds
    if (ownerClickTimer) clearTimeout(ownerClickTimer);
    
    const nextCount = ownerClicksCount + 1;
    setOwnerClicksCount(nextCount);

    const timer = setTimeout(() => {
      setOwnerClicksCount(0);
    }, 2000);
    setOwnerClickTimer(timer);

    if (nextCount >= remoteConfig.secretClickTarget) {
      setShowHiddenDot(true);
      onShowToast("Habka qarsoon waa la hawlgaliyay.", "success");
      setOwnerClicksCount(0);
    }
  };

  const handleDotClick = () => {
    const nextCount = dotClicksCount + 1;
    setDotClicksCount(nextCount);
    if (nextCount >= remoteConfig.dotClickTarget) {
      setShowHiddenPortal(true);
      setShowHiddenDot(false);
      setDotClicksCount(0);
      onShowToast("Albaabka qarsoon waa furmay.", "success");
    }
  };

  const handleEditClick = () => {
    const nextCount = editClicksCount + 1;
    setEditClicksCount(nextCount);
    if (nextCount >= remoteConfig.editClickTarget) {
      setShowOwnerValidation(true);
      setShowHiddenPortal(false);
      setEditClicksCount(0);
    }
  };

  const handleOwnerValidationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsValidatingOwner(true);
    try {
      const response = await axios.post('/api/owner/auth/validate', {
        username: ownerUsernameInput,
        password: ownerPasswordInput
      });
      onShowToast(response.data.message, 'success');
      
      const session = {
        token: response.data.token,
        user: response.data.user
      };
      // Mark as Owner session in localStorage so we can direct them properly
      localStorage.setItem('auth_session', JSON.stringify(session));
      localStorage.setItem('is_owner_session', 'true');
      onLoginSuccess(session);
    } catch (err: any) {
      const errMsg = err.response?.data?.error || 'Xaqiijinta Mulkiilaha waa ku fashilantay.';
      onShowToast(errMsg, 'error');
    } finally {
      setIsValidatingOwner(false);
    }
  };

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsAppInstallable(true);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  // Listen for popup-based OAuth postMessages
  useEffect(() => {
    const handleOAuthMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'OAUTH_AUTH_SUCCESS') {
        const session = event.data.session;
        localStorage.setItem('auth_session', JSON.stringify(session));
        onShowToast(event.data.message || 'Galka OAuth waa lagu guuleystay!', 'success');
        onLoginSuccess(session);
      }
    };
    window.addEventListener('message', handleOAuthMessage);
    return () => window.removeEventListener('message', handleOAuthMessage);
  }, [onLoginSuccess, onShowToast]);

  // Handle OTP countdown timer
  useEffect(() => {
    if (otpCountdown > 0) {
      const timer = setTimeout(() => setOtpCountdown(otpCountdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [otpCountdown]);

  const triggerPwaInstallation = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        onShowToast("SomLuul waxaa lagu guuleystay in lagu rakibo!", "success");
        setIsAppInstallable(false);
        setDeferredPrompt(null);
      } else {
        onShowToast("Rakibaada waa la joojiyay.", "error");
      }
    } else {
      const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
      if (isIOS) {
        onShowToast('Safari → Share → Add to Home Screen', 'success');
      } else if (/Android/i.test(navigator.userAgent)) {
        onShowToast('Chrome → menu → Install app / Add to Home Screen', 'success');
      } else {
        // Prefer real x64 EXE when present; else instruct user
        const tryExe = async () => {
          for (const name of ['SomLuul-Setup-1.0.0-x64.exe', 'SomLuul-Portable-1.0.0-x64.exe']) {
            try {
              const r = await fetch(`/api/downloads/file?name=${encodeURIComponent(name)}`, { method: 'HEAD' });
              if (r.ok) {
                window.open(`/api/downloads/file?name=${encodeURIComponent(name)}`, '_blank');
                onShowToast('Windows x64 EXE waa la soo dejinayaa…', 'success');
                return;
              }
            } catch (_) {}
          }
          onShowToast(
            language === 'so'
              ? 'Windows EXE weli lama dhisin. PC-ga: npm run build:exe → soo geli public/downloads/'
              : 'Windows EXE not built yet. On PC: npm run build:exe → put files in public/downloads/',
            'error'
          );
        };
        void tryExe();
      }
    }
  };

  // Launch Social OAuth Popup Safely under Iframe Constraints
  const handleSocialOAuth = async (provider: 'google' | 'facebook' | 'apple') => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await axios.get(`/api/auth/oauth/url?provider=${provider}`);
      const authUrl = response.data.url;
      
      if (!authUrl) {
        throw new Error('Url-ka galka lama heli karo.');
      }
      
      // Open clean centered popup window for production custom configured keys
      const width = 500;
      const height = 650;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;
      
      const popup = window.open(
        authUrl,
        `Ku gal SomLuul - ${provider}`,
        `width=${width},height=${height},top=${top},left=${left},resizable=yes,scrollbars=yes,status=yes`
      );

      if (!popup) {
        throw new Error('Fariin: Daaqadda popup-ka waxaa celiyay browser-kaaga. Fadlan u ogolow popups-ka browser-kaaga.');
      }
    } catch (err: any) {
      const errMsg = err.response?.data?.error || err.message || 'La xiriirka OAuth waa ku fashilantay.';
      setError(errMsg);
      onShowToast(errMsg, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // 1. STANDARD EMAIL LOGIN
  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Fadlan buuxi meelaha bannaan.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await axios.post('/api/auth/login', { 
        email, 
        password,
        deviceId: localStorage.getItem('somluul_device_id') || undefined
      });
      onShowToast(response.data.message || 'Galka waa lagu guuleystay!', 'success');
      
      const session = response.data.session;
      localStorage.setItem('auth_session', JSON.stringify(session));
      localStorage.setItem('has_registered', 'true');
      localStorage.setItem('last_user_email', session.user.email);
      if (session.deviceId) {
        localStorage.setItem('somluul_device_id', session.deviceId);
      }
      onLoginSuccess(session);
    } catch (err: any) {
      if (err.response?.data?.notVerified) {
        onShowToast(err.response.data.error, 'success');
        if (err.response.data.verificationCode) {
          setVerificationCode(err.response.data.verificationCode);
        }
        setView('email-verify');
        return;
      }
      const errMsg = err.response?.data?.error || 'Email-ka ama password-ka aad gelisay waa khalad.';
      setError(errMsg);
      onShowToast(errMsg, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // 2. EMAIL SIGNUP
  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName || !lastName || !email || !password || !confirmPassword || !phone || !gender) {
      setError('Fadlan buuxi dhammaan meelaha muhiimka ah (magacyada, emailka, telefoonka, jinsiga iyo passwordka).');
      return;
    }

    if (password.length < 6) {
      setError('Password-ku waa inuu ka koobnaadaa ugu yaraan 6 xaraf.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords-ku isma laha.');
      return;
    }

    if (!acceptTerms) {
      setError('Fadlan ogolaanshaha shuruudaha nidaamka ku dhufo.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const fullPhone = `${selectedCountry.code}${phone.replace(/\s+/g, '')}`;
      const response = await axios.post('/api/auth/signup', {
        email,
        password,
        first_name: firstName,
        last_name: lastName,
        username: username || undefined,
        bio,
        dob,
        phone: fullPhone,
        gender,
        deviceId: localStorage.getItem('somluul_device_id') || undefined
      });

      // If server returned a direct session (auto-login), log in immediately!
      if (response.data.session) {
        onShowToast(language === 'so' ? 'Akoonkaaga si guul leh ayaa loo sameeyay, si toos ah ayaadna u soo gashay (Lama baahna koodh xaqiijin ah)!' : 'Account created successfully, and you have been logged in automatically (No verification code required)!', 'success');
        const session = response.data.session;
        localStorage.setItem('auth_session', JSON.stringify(session));
        localStorage.setItem('has_registered', 'true');
        localStorage.setItem('last_user_email', session.user.email);
        if (session.deviceId) {
          localStorage.setItem('somluul_device_id', session.deviceId);
        }
        onLoginSuccess(session);
        return;
      }

      // Fallback (for older backend versions or alternative signup designs)
      onShowToast(response.data.message, 'success');
      if (response.data.verificationCode) {
        setVerificationCode(response.data.verificationCode);
      }
      setView('email-verify');
    } catch (err: any) {
      const errMsg = err.response?.data?.error || 'Diiwaan-gelintu waa ay guuldareysatay.';
      setError(errMsg);
      onShowToast(errMsg, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // 3. EMAIL VERIFY CODE
  const handleVerifyEmailCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputCode) {
      setError('Fadlan geli koodhka xaqiijinta.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await axios.post('/api/auth/email/verify-code', {
        email,
        code: inputCode,
        deviceId: localStorage.getItem('somluul_device_id') || undefined
      });

      onShowToast(response.data.message || 'Email-ka waa la xaqiijiyay!', 'success');
      
      const session = response.data.session;
      localStorage.setItem('auth_session', JSON.stringify(session));
      localStorage.setItem('has_registered', 'true');
      localStorage.setItem('last_user_email', session.user.email);
      if (session.deviceId) {
        localStorage.setItem('somluul_device_id', session.deviceId);
      }
      onLoginSuccess(session);
    } catch (err: any) {
      const errMsg = err.response?.data?.error || 'Koodhka xaqiijinta waa khalad.';
      setError(errMsg);
    } finally {
      setIsLoading(false);
    }
  };

  // Resend Email code
  const handleResendEmailCode = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await axios.post('/api/auth/email/resend-code', { email });
      onShowToast(response.data.message, 'success');
      if (response.data.verificationCode) {
        setVerificationCode(response.data.verificationCode);
      }
    } catch (err: any) {
      const errMsg = err.response?.data?.error || 'Koodh u dirista waa ay guuldareysatay.';
      setError(errMsg);
    } finally {
      setIsLoading(false);
    }
  };

  // 4. PHONE AUTH: SEND SMS OTP
  const handlePhoneSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone) {
      setError('Fadlan qor lambarkaaga telefoonka.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await axios.post('/api/auth/phone/send-otp', {
        phone,
        country_code: selectedCountry.code
      });

      onShowToast(response.data.message, 'success');
      if (response.data.otpCode) {
        setPhoneOtpCode(response.data.otpCode);
      }
      setView('phone-otp');
      setOtpCountdown(60);
    } catch (err: any) {
      const errMsg = err.response?.data?.error || 'OTP dirista telefoonka waa ay guuldareysatay.';
      setError(errMsg);
    } finally {
      setIsLoading(false);
    }
  };

  // 5. PHONE AUTH: VERIFY SMS OTP
  const handlePhoneVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputCode) {
      setError('Fadlan geli koodhka xaqiijinta (OTP).');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const fullPhone = `${selectedCountry.code}${phone.replace(/\s+/g, '')}`;
      const response = await axios.post('/api/auth/phone/verify-otp', {
        phone: fullPhone,
        otpCode: inputCode,
        deviceId: localStorage.getItem('somluul_device_id') || undefined
      });

      onShowToast(response.data.message || 'Telefoonka waa la xaqiijiyay!', 'success');
      
      const session = response.data.session;
      localStorage.setItem('auth_session', JSON.stringify(session));
      if (session.deviceId) {
        localStorage.setItem('somluul_device_id', session.deviceId);
      }
      onLoginSuccess(session);
    } catch (err: any) {
      const errMsg = err.response?.data?.error || 'Koodhka OTP ee aad gelisay waa khalad.';
      setError(errMsg);
    } finally {
      setIsLoading(false);
    }
  };

  // 6. FORGOT PASSWORD REQUEST
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Fadlan qor email-ka ku diiwaan gashan.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await axios.post('/api/auth/forgot-password', { email });
      onShowToast(response.data.message, 'success');
      if (response.data.recoveryCode) {
        setVerificationCode(response.data.recoveryCode);
      }
      setView('reset');
    } catch (err: any) {
      const errMsg = err.response?.data?.error || 'Xisaabta email-ka lama helin.';
      setError(errMsg);
    } finally {
      setIsLoading(false);
    }
  };

  // 7. CONFIRM PASSWORD RESET WITH CODE
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !inputCode || !password || !confirmPassword) {
      setError('Fadlan dhammaan meelaha buuxi.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords-ku isma laha.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await axios.post('/api/auth/reset-password', {
        email,
        code: inputCode,
        password
      });

      onShowToast(response.data.message || 'Furaha cusub waa la xaqiijiyay!', 'success');
      setView('email-login');
      setPassword('');
      setConfirmPassword('');
      setInputCode('');
    } catch (err: any) {
      const errMsg = err.response?.data?.error || 'Dib u dajinta furaha waa ay guuldareysatay.';
      setError(errMsg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full bg-[#0F172A] overflow-x-hidden" style={{ direction: isRtl ? 'rtl' : 'ltr' }}>
      
      {/* Dynamic Futuristic Landing Page Background always active */}
      <LandingPage 
        onOpenAuth={(initialView) => {
          setView(initialView);
          setIsAuthModalOpen(true);
          setError(null);
        }} 
        appLogo={appLogo} 
      />

      {/* Auth Modal Overlay */}
      {isAuthModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sl-modal-backdrop overflow-y-auto">
          
          {/* Main Auth Container */}
          <div id="auth-container" className="relative w-full max-w-md my-8 flex flex-col items-center justify-center">
            
            {/* Floating Language Bar inside the modal */}
            <div className="absolute -top-12 right-0 z-50">
              <div className="relative">
                <button
                  id="auth-lang-menu-btn"
                  onClick={() => setShowLangMenu(!showLangMenu)}
                  className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-gray-100 dark:bg-[var(--sl-bg-card)] dark:hover:bg-gray-800 text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer border border-gray-200 dark:border-gray-800"
                >
                  <span>{SUPPORTED_LANGUAGES.find(l => l.code === language)?.flag || '🇬🇧'}</span>
                  <span>{SUPPORTED_LANGUAGES.find(l => l.code === language)?.name || 'English'}</span>
                  <ChevronDown size={12} className="text-gray-400" />
                </button>

                {showLangMenu && (
                  <div className={`absolute ${isRtl ? 'left-0' : 'right-0'} mt-2 w-44 bg-white dark:bg-[var(--sl-bg-card)] border border-gray-150 dark:border-gray-800 rounded-xl shadow-xl p-1 z-50 divide-y divide-gray-50 dark:divide-gray-850 max-h-64 overflow-y-auto`}>
                    {SUPPORTED_LANGUAGES.map(lang => (
                      <button
                        key={lang.code}
                        type="button"
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
            </div>

            {/* Auth Card Content */}
            <div id="auth-card" className="w-full bg-white dark:bg-[var(--sl-bg-card)] border border-[var(--sl-border)] rounded-[20px] shadow-[var(--sl-shadow-xl)] p-8 transition-colors duration-300 relative animate-scale-in">
              
              {/* Close Button to return to landing page */}
              <button
                type="button"
                onClick={() => { setIsAuthModalOpen(false); setError(null); }}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-750 dark:hover:text-white p-1 rounded-lg transition-colors cursor-pointer z-50"
                title="Go back to landing page"
              >
                <X size={18} />
              </button>
        
        {/* Invisible Area Left of SomLuul Logo for Owner bypass sequence */}
        <div 
          onClick={handleInvisibleAreaClick}
          className="absolute top-8 left-8 w-14 h-14 bg-transparent cursor-default select-none z-40"
          title=""
        />

        {/* Dynamic Positioned Invisible Secret Dot */}
        {showHiddenDot && (
          <div 
            onClick={handleDotClick}
            className="absolute w-4 h-4 text-[10px] text-slate-400 dark:text-slate-600 opacity-20 flex items-center justify-center cursor-default select-none z-50 font-mono"
            style={{
              top: remoteConfig.dotLocation.includes('bottom') ? 'auto' : '4px',
              bottom: remoteConfig.dotLocation.includes('bottom') ? '4px' : 'auto',
              left: remoteConfig.dotLocation.includes('left') ? '4px' : 'auto',
              right: remoteConfig.dotLocation.includes('right') ? '4px' : 'auto',
            }}
          >
            .
          </div>
        )}

        {/* Hidden Owner Portal with single "Edit" button */}
        {showHiddenPortal && (
          <div className="absolute inset-0 bg-white dark:bg-[var(--sl-bg-card)] rounded-2xl p-8 flex flex-col items-center justify-center z-50">
            <button
              onClick={handleEditClick}
              className="px-6 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              Edit
            </button>
          </div>
        )}

        {/* Hidden Owner Validation Screen */}
        {showOwnerValidation && (
          <div className="absolute inset-0 bg-white dark:bg-[var(--sl-bg-card)] rounded-2xl p-8 flex flex-col justify-center z-50">
            <div className="text-center mb-6">
              <h3 className="text-lg font-black text-rose-500 font-sans tracking-tight">Xaqiijinta Mulkiilaha</h3>
              <p className="text-xs text-slate-400 mt-1">Geli xogta rasmiga ah ee mulkiilaha SomLuul.</p>
            </div>
            <form onSubmit={handleOwnerValidationSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 font-mono">Owner Username</label>
                <input
                  type="text"
                  required
                  placeholder="Geli Username"
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-955 dark:text-slate-100 focus:outline-none"
                  value={ownerUsernameInput}
                  onChange={(e) => setOwnerUsernameInput(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 font-mono">Owner Password</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••••••"
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-955 dark:text-slate-100 focus:outline-none"
                  value={ownerPasswordInput}
                  onChange={(e) => setOwnerPasswordInput(e.target.value)}
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowOwnerValidation(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isValidatingOwner}
                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {isValidatingOwner ? <RefreshCw size={12} className="animate-spin" /> : 'Confirm'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Header Branding */}
        <div className="flex flex-col items-center mb-6 text-center">
          <SomLuulLogo 
            size="lg" 
            variant="stacked" 
            showTagline 
            taglineText="Digital Social Platform"
            className="mb-2 hover:scale-105 transition-transform duration-300"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 max-w-xs">
            {view === 'welcome' && t('welcome_desc')}
            {view === 'email-login' && t('login_desc')}
            {view === 'email-signup' && t('auth_signup_desc')}
            {view === 'email-verify' && t('auth_verify_desc')}
            {view === 'phone-login' && t('phone_login_desc')}
            {view === 'phone-otp' && t('phone_otp_desc')}
            {view === 'forgot' && t('forgot_desc')}
            {view === 'reset' && t('reset_desc')}
          </p>
        </div>

        {/* Error Alert Box */}
        {error && (
          <div id="auth-error" className="flex items-start gap-2.5 p-3.5 bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-900/40 rounded-xl text-xs mb-5">
            <AlertCircle className="shrink-0 mt-0.5" size={15} />
            <span className="font-semibold">{error}</span>
          </div>
        )}

        {/* VIEW: WELCOME / SIGN IN METHODS */}
        {view === 'welcome' && (
          <div className="space-y-3">
            <div className="rounded-xl border border-[var(--sl-border)] bg-[var(--sl-bg-muted)] px-3 py-2.5 text-[11px] text-[var(--sl-text-secondary)] leading-relaxed">
              {language === 'so'
                ? 'Isticmaal website-ka toos ah: Login ama Sign up. App soo dejin ma aha qasab — dhammaan features (feed, chat, calls) web-ka ayay ku shaqeeyaan.'
                : 'Use the website directly: Login or Sign up. Downloading the app is optional — feed, chat, and calls all work in the browser.'}
            </div>
            
            {/* OAuth buttons */}
            <button
              onClick={() => handleSocialOAuth('google')}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white hover:bg-gray-50 dark:bg-[var(--sl-bg-muted)] dark:hover:bg-[#25324b] text-sm font-bold text-gray-800 dark:text-white border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm hover:shadow transition-all cursor-pointer"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.85z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.85c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              <span>{t('continue_google')}</span>
            </button>

            <button
              onClick={() => handleSocialOAuth('facebook')}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-[var(--somluul-primary)] hover:brightness-110 text-sm font-bold text-white rounded-xl shadow-sm hover:shadow transition-all cursor-pointer"
            >
              <Facebook className="w-4 h-4 shrink-0 fill-current" />
              <span>{t('continue_facebook')}</span>
            </button>

            <button
              onClick={() => handleSocialOAuth('apple')}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-black hover:bg-neutral-900 text-sm font-bold text-white rounded-xl shadow-sm hover:shadow transition-all cursor-pointer"
            >
              <svg className="w-4 h-4 shrink-0 fill-current" viewBox="0 0 24 24">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 4.17c.66-.81 1.11-1.93.99-3.06-1 .04-2.13.67-2.85 1.51-.62.73-1.16 1.87-1.01 2.98 1.1.09 2.15-.55 2.87-1.43z"/>
              </svg>
              <span>{t('continue_apple')}</span>
            </button>

            <div className="relative flex py-2 items-center text-xs">
              <div className="flex-grow border-t border-gray-200 dark:border-gray-800"></div>
              <span className="flex-shrink mx-3 text-gray-400 dark:text-gray-500 uppercase tracking-widest font-bold">{t('or_use')}</span>
              <div className="flex-grow border-t border-gray-200 dark:border-gray-800"></div>
            </div>

            {/* Email and Phone primary paths */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => { setView('email-login'); setError(null); }}
                className="flex flex-col items-center gap-2 p-4 bg-gray-50 hover:bg-gray-100 dark:bg-[var(--sl-bg-muted)] dark:hover:bg-[#25324b] rounded-2xl border border-gray-100 dark:border-gray-850 text-center transition-all cursor-pointer group"
              >
                <div className="w-10 h-10 rounded-full bg-indigo-500/10 text-indigo-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Mail size={18} />
                </div>
                <span className="text-xs font-bold text-gray-700 dark:text-gray-200">{t('signin_btn')}</span>
              </button>

              <button
                onClick={() => { if (!publicSignupAllowed) { setError('Diiwaangelinta dadweynaha waa xiran tahay.'); return; } setView('email-signup'); setError(null); }}
                className="flex flex-col items-center gap-2 p-4 bg-gray-50 hover:bg-gray-100 dark:bg-[var(--sl-bg-muted)] dark:hover:bg-[#25324b] rounded-2xl border border-gray-100 dark:border-gray-850 text-center transition-all cursor-pointer group"
              >
                <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <User size={18} />
                </div>
                <span className="text-xs font-bold text-gray-700 dark:text-gray-200">{t('signup_btn')}</span>
              </button>
            </div>

            <div className="pt-4 text-center">
              <button
                onClick={() => { if (!publicSignupAllowed) { setError('Diiwaangelinta dadweynaha waa xiran tahay.'); return; } setView('email-signup'); setError(null); }}
                className="text-sm font-bold text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
              >
                <span>{t('no_account')} {t('signup_btn')}</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        )}

        {/* VIEW: EMAIL LOGIN */}
        {view === 'email-login' && (
          <form onSubmit={handleEmailLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wider">{t('email_label')}</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3.5 text-gray-400" size={16} />
                <input
                  id="login-email"
                  type="email"
                  required
                  placeholder="john@example.com"
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-[var(--sl-bg-muted)] border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">{t('pass_label')}</label>
                <button
                  type="button"
                  onClick={() => { setView('forgot'); setError(null); }}
                  className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  {t('forgot_pass')}
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3.5 text-gray-400" size={16} />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-3 bg-gray-50 dark:bg-[var(--sl-bg-muted)] border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between py-1">
              <label className="flex items-center gap-2 text-xs font-semibold text-gray-600 dark:text-gray-400 cursor-pointer">
                <input
                  type="checkbox"
                  className="rounded border-gray-300 dark:border-gray-700 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                {t('remember_me')}
              </label>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold py-3 rounded-xl text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/10 disabled:opacity-50 cursor-pointer"
            >
              {isLoading ? <RefreshCw className="animate-spin" size={16} /> : t('signin_btn')}
              {!isLoading && <ArrowRight size={14} />}
            </button>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => { setView('welcome'); setError(null); }}
                className="text-xs font-bold text-gray-500 dark:text-gray-400 hover:underline flex items-center gap-1"
              >
                <ArrowLeft size={12} />
                {t('back_to_welcome_btn')}
              </button>
              <button
                type="button"
                onClick={() => { if (!publicSignupAllowed) { setError('Diiwaangelinta dadweynaha waa xiran tahay.'); return; } setView('email-signup'); setError(null); }}
                className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                {t('signup_btn')}
              </button>
            </div>
          </form>
        )}

        {/* VIEW: EMAIL SIGNUP */}
        {view === 'email-signup' && (
          <form onSubmit={handleEmailSignup} className="space-y-3.5">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1 uppercase">{t('first_name_label')}</label>
                <input
                  type="text"
                  required
                  placeholder="Mohamed"
                  className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-[var(--sl-bg-muted)] border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1 uppercase">{t('last_name_label')}</label>
                <input
                  type="text"
                  required
                  placeholder="Mohamud"
                  className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-[var(--sl-bg-muted)] border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1 uppercase">{t('gender_label')}</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setGender('male')}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all text-center cursor-pointer ${
                      gender === 'male'
                        ? 'bg-indigo-500/15 border-indigo-500 text-indigo-600 dark:text-indigo-400 shadow-sm'
                        : 'bg-gray-50 dark:bg-[var(--sl-bg-muted)] border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                  >
                    {t('male_label')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setGender('female')}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all text-center cursor-pointer ${
                      gender === 'female'
                        ? 'bg-indigo-500/15 border-indigo-500 text-indigo-600 dark:text-indigo-400 shadow-sm'
                        : 'bg-gray-50 dark:bg-[var(--sl-bg-muted)] border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                  >
                    {t('female_label')}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1 uppercase">{t('username_label')}</label>
                <input
                  type="text"
                  required
                  placeholder="xamseyare"
                  className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-[var(--sl-bg-muted)] border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1 uppercase">{t('dob_label')}</label>
                <input
                  type="date"
                  required
                  className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-[var(--sl-bg-muted)] border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1 uppercase">{t('phone_label')}</label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCountryMenu(!showCountryMenu);
                      setCountrySearch('');
                    }}
                    className="absolute left-2.5 top-2.5 flex items-center gap-1 font-bold text-gray-600 dark:text-gray-300 border-r pr-2 border-gray-200 dark:border-gray-700 text-xs hover:text-indigo-500 transition-colors h-5 mt-0.5 cursor-pointer"
                  >
                    <span>{selectedCountry.flag}</span>
                    <span>{selectedCountry.code}</span>
                    <ChevronDown size={11} className="text-gray-400" />
                  </button>
                  <input
                    type="tel"
                    required
                    placeholder="61XXXXXXX"
                    className="w-full pl-24 pr-3 py-2.5 bg-gray-50 dark:bg-[var(--sl-bg-muted)] border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all font-mono"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                  />

                  {showCountryMenu && (
                    <div className="absolute left-0 right-0 top-full mt-2 max-h-56 overflow-y-auto bg-white dark:bg-[var(--sl-bg-card)] border border-gray-150 dark:border-gray-800 rounded-xl shadow-xl p-1.5 z-50 divide-y divide-gray-50 dark:divide-gray-850">
                      <div className="p-1 pb-1.5 sticky top-0 bg-white dark:bg-[var(--sl-bg-card)] z-10">
                        <input
                          type="text"
                          placeholder="Raadi dalka..."
                          className="w-full px-2.5 py-1 text-xs bg-gray-50 dark:bg-[var(--sl-bg-muted)] border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-sans"
                          value={countrySearch}
                          onChange={(e) => setCountrySearch(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                      <div className="pt-1 max-h-40 overflow-y-auto">
                        {COUNTRIES.filter(c => 
                          c.name.toLowerCase().includes(countrySearch.toLowerCase()) || 
                          c.code.includes(countrySearch)
                        ).map(country => (
                          <button
                            key={country.name + country.code}
                            type="button"
                            onClick={() => {
                              setSelectedCountry(country);
                              setShowCountryMenu(false);
                              setCountrySearch('');
                            }}
                            className="w-full flex items-center justify-between px-3 py-2 text-xs font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 text-left cursor-pointer rounded-lg"
                          >
                            <span className="flex items-center gap-2">
                              <span className="text-base">{country.flag}</span>
                              <span>{country.name}</span>
                            </span>
                            <span className="text-gray-400 font-mono text-[10px]">({country.code})</span>
                          </button>
                        ))}
                        {COUNTRIES.filter(c => 
                          c.name.toLowerCase().includes(countrySearch.toLowerCase()) || 
                          c.code.includes(countrySearch)
                        ).length === 0 && (
                          <div className="p-3 text-center text-xs text-gray-400 font-semibold">
                            Dalka la raadiyay lama helin
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1 uppercase">Gmail / {t('email_label')}</label>
              <input
                type="email"
                required
                placeholder="owner@example.com"
                className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-[var(--sl-bg-muted)] border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1 uppercase">{t('pass_label')}</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-[var(--sl-bg-muted)] border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1 uppercase">Confirm {t('pass_label')}</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-[var(--sl-bg-muted)] border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1 uppercase">{t('bio_label')}</label>
              <textarea
                placeholder="Wax ka qor naftaada..."
                rows={1}
                className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-[var(--sl-bg-muted)] border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all resize-none"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
              />
            </div>

            <div>
              <label className="flex items-start gap-2.5 text-xs text-gray-600 dark:text-gray-400 cursor-pointer">
                <input
                  type="checkbox"
                  required
                  className="rounded border-gray-300 dark:border-gray-700 text-indigo-600 focus:ring-indigo-500 mt-0.5 h-4 w-4"
                  checked={acceptTerms}
                  onChange={(e) => setAcceptTerms(e.target.checked)}
                />
                <span>{t('accept_terms_label')}</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold py-3 rounded-xl text-sm transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 cursor-pointer"
            >
              {isLoading ? <RefreshCw className="animate-spin" size={16} /> : t('signup_btn')}
            </button>

            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => { setView('welcome'); setError(null); }}
                className="text-xs font-bold text-gray-500 hover:underline flex items-center justify-center gap-1 mx-auto cursor-pointer"
              >
                <ArrowLeft size={12} />
                {t('back_to_welcome_btn')}
              </button>
            </div>
          </form>
        )}

        {/* VIEW: EMAIL VERIFICATION */}
        {view === 'email-verify' && (
          <form onSubmit={handleVerifyEmailCode} className="space-y-4 text-center">
            <div className="mx-auto w-14 h-14 bg-indigo-500/10 rounded-full flex items-center justify-center text-indigo-500">
              <Shield size={26} />
            </div>
            
            {/* Dev OTP (only when server returns code) */}
            {verificationCode && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-600 font-bold flex flex-col gap-1 items-center animate-bounce">
                <span className="uppercase tracking-widest text-[10px]">Verification code</span>
                <span className="text-lg tracking-widest bg-white dark:bg-[#1a2333] px-3 py-1 rounded-lg border border-amber-200">{verificationCode}</span>
              </div>
            )}

            <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
              {t('verify_desc')} <strong className="text-gray-900 dark:text-white">{email}</strong>.
            </p>

            <div>
              <input
                type="text"
                required
                maxLength={6}
                placeholder="0 0 0 0 0 0"
                className="w-full text-center tracking-widest font-mono text-xl py-3 bg-gray-50 dark:bg-[var(--sl-bg-muted)] border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value.replace(/\D/g, ''))}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold py-3 rounded-xl text-sm transition-all flex items-center justify-center gap-2"
            >
              {isLoading ? <RefreshCw className="animate-spin" size={16} /> : t('verify_btn')}
            </button>

            <div className="flex justify-between pt-2">
              <button
                type="button"
                onClick={handleResendEmailCode}
                className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
              >
                {t('send_otp_btn')}
              </button>
              <button
                type="button"
                onClick={() => { setView('welcome'); setError(null); }}
                className="text-xs font-bold text-gray-500 hover:underline"
              >
                {t('back_to_welcome_btn')}
              </button>
            </div>
          </form>
        )}

        {/* VIEW: PHONE LOGIN */}
        {view === 'phone-login' && (
          <form onSubmit={handlePhoneSendOtp} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wider">Dooro Dalka / Country Code</label>
              
              {/* Custom Selector layout */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setShowCountryMenu(!showCountryMenu);
                    setCountrySearch('');
                  }}
                  className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-[var(--sl-bg-muted)] border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none text-left cursor-pointer hover:border-gray-300 dark:hover:border-gray-600 transition-all"
                >
                  <span className="flex items-center gap-2">
                    <span className="text-base">{selectedCountry.flag}</span>
                    <span className="font-semibold text-gray-700 dark:text-gray-200">{selectedCountry.name}</span>
                    <span className="text-gray-400 font-mono text-xs">({selectedCountry.code})</span>
                  </span>
                  <ChevronDown size={14} className="text-gray-400" />
                </button>

                {showCountryMenu && (
                  <div className="absolute left-0 right-0 mt-1.5 max-h-56 overflow-y-auto bg-white dark:bg-[var(--sl-bg-card)] border border-gray-150 dark:border-gray-800 rounded-xl shadow-xl p-1.5 z-50 divide-y divide-gray-50 dark:divide-gray-850">
                    <div className="p-1 pb-1.5 sticky top-0 bg-white dark:bg-[var(--sl-bg-card)] z-10">
                      <input
                        type="text"
                        placeholder="Raadi dalka..."
                        className="w-full px-2.5 py-1 text-xs bg-gray-50 dark:bg-[var(--sl-bg-muted)] border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-sans"
                        value={countrySearch}
                        onChange={(e) => setCountrySearch(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                    <div className="pt-1 max-h-40 overflow-y-auto">
                      {COUNTRIES.filter(c => 
                        c.name.toLowerCase().includes(countrySearch.toLowerCase()) || 
                        c.code.includes(countrySearch)
                      ).map(country => (
                        <button
                          key={country.name + country.code}
                          type="button"
                          onClick={() => {
                            setSelectedCountry(country);
                            setShowCountryMenu(false);
                            setCountrySearch('');
                          }}
                          className="w-full flex items-center justify-between px-3 py-2 text-xs font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 text-left cursor-pointer rounded-lg"
                        >
                          <span className="flex items-center gap-2">
                            <span className="text-base">{country.flag}</span>
                            <span>{country.name}</span>
                          </span>
                          <span className="text-gray-400 font-mono text-[10px]">({country.code})</span>
                        </button>
                      ))}
                      {COUNTRIES.filter(c => 
                        c.name.toLowerCase().includes(countrySearch.toLowerCase()) || 
                        c.code.includes(countrySearch)
                      ).length === 0 && (
                        <div className="p-3 text-center text-xs text-gray-400 font-semibold">
                          Dalka la raadiyay lama helin
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wider">{t('phone_label')}</label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setShowCountryMenu(!showCountryMenu);
                    setCountrySearch('');
                  }}
                  className="absolute left-3 top-3 flex items-center gap-1 font-bold text-gray-600 dark:text-gray-300 border-r pr-2 border-gray-200 dark:border-gray-700 text-xs hover:text-emerald-500 transition-colors h-6 cursor-pointer"
                >
                  <span>{selectedCountry.flag}</span>
                  <span>{selectedCountry.code}</span>
                  <ChevronDown size={11} className="text-gray-400" />
                </button>
                <input
                  type="tel"
                  required
                  placeholder="61XXXXXXX"
                  className="w-full pl-24 pr-4 py-3 bg-gray-50 dark:bg-[var(--sl-bg-muted)] border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all font-mono"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/10 disabled:opacity-50 cursor-pointer"
            >
              {isLoading ? <RefreshCw className="animate-spin" size={16} /> : t('send_otp_btn')}
              {!isLoading && <ArrowRight size={14} />}
            </button>

            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => { setView('welcome'); setError(null); }}
                className="text-xs font-bold text-gray-500 hover:underline inline-flex items-center gap-1"
              >
                <ArrowLeft size={12} />
                {t('back_to_welcome_btn')}
              </button>
            </div>
          </form>
        )}

        {/* VIEW: PHONE OTP VERIFY */}
        {view === 'phone-otp' && (
          <form onSubmit={handlePhoneVerifyOtp} className="space-y-4 text-center">
            <div className="mx-auto w-14 h-14 bg-emerald-500/10 rounded-full flex items-center justify-center text-emerald-500">
              <Smartphone size={26} />
            </div>

            {/* OTP code (from server when SMS free quota / SMTP) */}
            {phoneOtpCode && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-600 font-bold flex flex-col gap-1 items-center animate-bounce">
                <span className="uppercase tracking-widest text-[10px]">SMS OTP code</span>
                <span className="text-lg tracking-widest bg-white dark:bg-[#1a2333] px-3 py-1 rounded-lg border border-amber-200">{phoneOtpCode}</span>
              </div>
            )}

            <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
              {t('phone_otp_desc')} <strong className="text-gray-900 dark:text-white">{selectedCountry.code} {phone}</strong>.
            </p>

            <div>
              <input
                type="text"
                required
                maxLength={6}
                placeholder="0 0 0 0 0 0"
                className="w-full text-center tracking-widest font-mono text-xl py-3 bg-gray-50 dark:bg-[var(--sl-bg-muted)] border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value.replace(/\D/g, ''))}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl text-sm transition-all flex items-center justify-center gap-2"
            >
              {isLoading ? <RefreshCw className="animate-spin" size={16} /> : t('verify_btn')}
            </button>

            <div className="flex justify-between pt-2 text-xs">
              {otpCountdown > 0 ? (
                <span className="text-gray-400 font-semibold">
                  Dib u dir koodhka ({otpCountdown}s)
                </span>
              ) : (
                <button
                  type="button"
                  onClick={handlePhoneSendOtp}
                  className="font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
                >
                  Koodhka dib u dir
                </button>
              )}

              <button
                type="button"
                onClick={() => { setView('phone-login'); setError(null); }}
                className="font-bold text-gray-500 hover:underline"
              >
                Bedel Lambarka
              </button>
            </div>
          </form>
        )}

        {/* VIEW: FORGOT PASSWORD */}
        {view === 'forgot' && (
          <form onSubmit={handleForgotPassword} className="space-y-4">
            <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed mb-2">
              {t('forgot_desc')}
            </p>

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wider">{t('email_label')}</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3.5 text-gray-400" size={16} />
                <input
                  type="email"
                  required
                  placeholder="name@example.com"
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-[var(--sl-bg-muted)] border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold py-3 rounded-xl text-sm transition-all flex items-center justify-center gap-2"
            >
              {isLoading ? <RefreshCw className="animate-spin" size={16} /> : t('send_otp_btn')}
            </button>

            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => { setView('email-login'); setError(null); }}
                className="text-xs font-bold text-gray-500 hover:underline inline-flex items-center gap-1"
              >
                <ArrowLeft size={12} />
                {t('back_to_welcome_btn')}
              </button>
            </div>
          </form>
        )}

        {/* VIEW: RESET PASSWORD WITH RECOVERY CODE */}
        {view === 'reset' && (
          <form onSubmit={handleResetPassword} className="space-y-4">
            
            {/* Recovery code (from server) */}
            {verificationCode && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-600 font-bold flex flex-col gap-1 items-center animate-bounce">
                <span className="uppercase tracking-widest text-[10px]">Recovery code</span>
                <span className="text-lg tracking-widest bg-white dark:bg-[#1a2333] px-3 py-1 rounded-lg border border-amber-200">{verificationCode}</span>
              </div>
            )}

            <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed mb-2">
              {t('reset_desc')}
            </p>

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wider">{t('recovery_code_label')}</label>
              <div className="relative">
                <Key className="absolute left-3.5 top-3.5 text-gray-400" size={16} />
                <input
                  type="text"
                  required
                  placeholder="123456"
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-[var(--sl-bg-muted)] border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={inputCode}
                  onChange={(e) => setInputCode(e.target.value.replace(/\D/g, ''))}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wider">{t('new_pass_label')}</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3.5 text-gray-400" size={16} />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-[var(--sl-bg-muted)] border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wider">{t('confirm_pass_label')}</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3.5 text-gray-400" size={16} />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-[var(--sl-bg-muted)] border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold py-3 rounded-xl text-sm transition-all flex items-center justify-center gap-2"
            >
              {isLoading ? <RefreshCw className="animate-spin" size={16} /> : t('reset_btn')}
            </button>
          </form>
        )}
            </div>

            {/* PWA App installation banner */}
            {isAppInstallable && (
              <div className="w-full max-w-md mt-6 text-center">
                <button
                  type="button"
                  onClick={triggerPwaInstallation}
                  className="w-full bg-gradient-to-r from-indigo-600 via-indigo-600 to-blue-700 text-white font-extrabold uppercase tracking-wider px-5 py-4 rounded-2xl text-[10px] hover:from-indigo-500 hover:to-indigo-500 transition-all shadow-lg flex items-center justify-center gap-2.5 cursor-pointer hover:-translate-y-0.5 active:translate-y-0"
                >
                  <Laptop size={14} className="animate-pulse" />
                  <span>Ku shubo barnaamijka rasmiga ah ee SomLuul (Install App)</span>
                </button>
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
};
