import axios from 'axios';

/**
 * One API/auth configuration for the whole application.
 * Components may still call axios directly, but authentication is injected here
 * so a request cannot accidentally use a user id, stale token, or omit the token.
 */
function getApiBaseUrl(): string {
  if (typeof window === 'undefined') return '';
  // Split deploy: VITE_API_URL = always-on backend (Railway/Render), e.g. https://somluul.up.railway.app
  try {
    const fromEnv = (import.meta as any)?.env?.VITE_API_URL as string | undefined;
    if (fromEnv && typeof fromEnv === 'string' && fromEnv.trim()) {
      return fromEnv.trim().replace(/\/$/, '');
    }
  } catch (_) {}
  try {
    const fromWindow = (window as any).__SOMLUUL_API__;
    if (fromWindow && typeof fromWindow === 'string') return String(fromWindow).replace(/\/$/, '');
  } catch (_) {}
  if (window.location.protocol === 'http:' || window.location.protocol === 'https:') return '';
  if (window.location.protocol === 'file:' || !window.location.hostname) {
    return 'https://https-file-somluul-com-854058746919.europe-west2.run.app';
  }
  return '';
}

function readStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('auth_session') || sessionStorage.getItem('auth_session');
    if (!raw) return null;
    const session = JSON.parse(raw);
    return typeof session?.token === 'string' && session.token.trim() ? session.token.trim() : null;
  } catch {
    return null;
  }
}

axios.defaults.baseURL = getApiBaseUrl();
axios.defaults.timeout = 30000;
axios.defaults.headers.common.Accept = 'application/json';

// Prevent duplicate interceptors during Vite HMR.
const axiosWithMarker = axios as typeof axios & { __somluulAuthConfigured?: boolean };

if (!axiosWithMarker.__somluulAuthConfigured) {
  axios.interceptors.request.use((config) => {
    const url = String(config.url || '');
    const isApiRequest = url.startsWith('/api/') || url.startsWith('api/');

    if (isApiRequest && typeof window !== 'undefined') {
      const token = readStoredToken();
      if (token) {
        // The stored session token is authoritative. This deliberately replaces
        // accidental headers such as `Bearer ${user.id}` from old components.
        if (config.headers && typeof (config.headers as any).set === 'function') {
          (config.headers as any).set('Authorization', `Bearer ${token}`);
        } else {
          config.headers = Object.assign({}, config.headers, { Authorization: `Bearer ${token}` }) as any;
        }
      }
    }

    return config;
  });

  axios.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error?.response?.status === 401 && typeof window !== 'undefined') {
        // Let the app decide whether to sign out. This event is intentionally
        // non-destructive so a transient request cannot erase a valid session.
        window.dispatchEvent(new CustomEvent('somluul_auth_unauthorized', {
          detail: { url: error.config?.url || '' }
        }));
      }
      return Promise.reject(error);
    }
  );

  axiosWithMarker.__somluulAuthConfigured = true;
}

export { getApiBaseUrl, readStoredToken };
export default axios;
