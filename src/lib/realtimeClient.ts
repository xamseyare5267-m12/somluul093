/**
 * Phase 5 — Browser realtime client (SSE + reconnect backoff).
 */
import { getApiBaseUrl, readStoredToken } from './apiClient';

type Handler = (data: any) => void;

type RealtimeHandlers = {
  onNewMessage?: Handler;
  onTyping?: Handler;
  onPresence?: Handler;
  onCallRing?: Handler;
  onConnected?: Handler;
  onDisconnected?: () => void;
};

let es: EventSource | null = null;
let handlers: RealtimeHandlers = {};
let reconnectAttempt = 0;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let intentionalClose = false;
let presenceTimer: ReturnType<typeof setInterval> | null = null;

function buildUrl(): string | null {
  const token = readStoredToken();
  if (!token) return null;
  const base = getApiBaseUrl() || (typeof window !== 'undefined' ? window.location.origin : '');
  // Prefer scale realtime endpoint; server also has legacy /api/chat/stream
  return `${base}/api/scale/realtime?token=${encodeURIComponent(token)}`;
}

function clearReconnect(): void {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
}

function scheduleReconnect(): void {
  clearReconnect();
  if (intentionalClose) return;
  const delay = Math.min(30000, 1000 * Math.pow(2, reconnectAttempt));
  reconnectAttempt += 1;
  reconnectTimer = setTimeout(() => {
    connectRealtime(handlers);
  }, delay);
}

export function connectRealtime(nextHandlers?: RealtimeHandlers): void {
  if (typeof window === 'undefined' || typeof EventSource === 'undefined') return;
  if (nextHandlers) handlers = { ...handlers, ...nextHandlers };

  intentionalClose = false;
  disconnectRealtime(false);

  const url = buildUrl();
  if (!url) return;

  try {
    es = new EventSource(url);
  } catch {
    scheduleReconnect();
    return;
  }

  es.addEventListener('connected', (ev: MessageEvent) => {
    reconnectAttempt = 0;
    try {
      const data = JSON.parse(ev.data);
      handlers.onConnected?.(data);
    } catch {
      handlers.onConnected?.({});
    }
  });

  es.addEventListener('new_message', (ev: MessageEvent) => {
    try {
      handlers.onNewMessage?.(JSON.parse(ev.data));
    } catch {
      /* ignore */
    }
  });

  es.addEventListener('typing', (ev: MessageEvent) => {
    try {
      handlers.onTyping?.(JSON.parse(ev.data));
    } catch {
      /* ignore */
    }
  });

  es.addEventListener('presence', (ev: MessageEvent) => {
    try {
      handlers.onPresence?.(JSON.parse(ev.data));
    } catch {
      /* ignore */
    }
  });

  es.addEventListener('call_ring', (ev: MessageEvent) => {
    try {
      handlers.onCallRing?.(JSON.parse(ev.data));
    } catch {
      /* ignore */
    }
  });

  es.onerror = () => {
    handlers.onDisconnected?.();
    try {
      es?.close();
    } catch {
      /* ignore */
    }
    es = null;
    scheduleReconnect();
  };

  // Presence heartbeat via HTTP (SSE is receive-only)
  if (presenceTimer) clearInterval(presenceTimer);
  presenceTimer = setInterval(() => {
    const token = readStoredToken();
    if (!token) return;
    const base = getApiBaseUrl() || '';
    fetch(`${base}/api/scale/presence`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ online: true }),
    }).catch(() => {});
  }, 45000);
}

export function disconnectRealtime(clearHandlers = true): void {
  intentionalClose = true;
  clearReconnect();
  if (presenceTimer) {
    clearInterval(presenceTimer);
    presenceTimer = null;
  }
  if (es) {
    try {
      es.close();
    } catch {
      /* ignore */
    }
    es = null;
  }
  if (clearHandlers) handlers = {};
}

export function isRealtimeConnected(): boolean {
  return !!es && es.readyState === EventSource.OPEN;
}
