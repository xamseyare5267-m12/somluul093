/**
 * Browser / OS notifications for SomLuul.
 * Works when the tab is open or in the background (via Service Worker).
 * True closed-app push needs Web Push + VAPID (optional later).
 */

const PERM_KEY = 'somluul_notif_perm_asked';

export async function ensureNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied';
  }
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';
  try {
    const result = await Notification.requestPermission();
    try {
      localStorage.setItem(PERM_KEY, result);
    } catch (_) {}
    return result;
  } catch (_) {
    return Notification.permission;
  }
}

export function hasNotificationSupport(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

type NotifyOpts = {
  title: string;
  body: string;
  tag?: string;
  icon?: string;
  requireInteraction?: boolean;
  renotify?: boolean;
  silent?: boolean;
  data?: Record<string, unknown>;
  /** Play even if document is focused (default: false — skip when focused) */
  force?: boolean;
};

/**
 * Show a system notification. Prefer Service Worker so it works in background tabs.
 */
export async function showSystemNotification(opts: NotifyOpts): Promise<void> {
  if (!hasNotificationSupport()) return;
  if (Notification.permission !== 'granted') {
    const p = await ensureNotificationPermission();
    if (p !== 'granted') return;
  }

  // When user is actively looking at the app, skip OS toast unless forced
  if (!opts.force && typeof document !== 'undefined' && document.visibilityState === 'visible') {
    return;
  }

  const payload = {
    type: 'SHOW_NOTIFICATION' as const,
    title: opts.title,
    body: opts.body,
    tag: opts.tag || 'somluul',
    icon: opts.icon || '/icon-512x512.png',
    requireInteraction: !!opts.requireInteraction,
    renotify: opts.renotify !== false,
    silent: !!opts.silent,
    data: opts.data || {},
    vibrate: opts.requireInteraction ? [400, 150, 400, 150, 400] : [200, 100, 200],
  };

  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.ready;
      if (reg.active) {
        reg.active.postMessage(payload);
        return;
      }
      // SW registered but not active yet — show via Registration API
      await reg.showNotification(payload.title, {
        body: payload.body,
        icon: payload.icon,
        badge: '/favicon-16x16.png',
        tag: payload.tag,
        renotify: payload.renotify,
        requireInteraction: payload.requireInteraction,
        silent: payload.silent,
        data: payload.data,
      } as any);
      return;
    }
  } catch (_) {}

  // Fallback: page-level Notification (works only while page is somewhat alive)
  try {
    const n = new Notification(payload.title, {
      body: payload.body,
      icon: payload.icon,
      tag: payload.tag,
      requireInteraction: payload.requireInteraction,
      silent: payload.silent,
      data: payload.data,
    });
    n.onclick = () => {
      try {
        window.focus();
        n.close();
      } catch (_) {}
    };
  } catch (_) {}
}

export function notifyNewMessage(senderName: string, preview: string, roomId?: string) {
  return showSystemNotification({
    title: `💬 ${senderName}`,
    body: preview || 'Farriin cusub',
    tag: `msg-${roomId || 'all'}`,
    data: { type: 'message', roomId, url: '/?tab=messenger' },
  });
}

export function notifyIncomingCall(fromName: string, callType: 'voice' | 'video', roomId?: string) {
  const isVideo = callType === 'video';
  return showSystemNotification({
    title: isVideo ? '📹 Video call' : '📞 Voice call',
    body: languageSafe(`${fromName} ayaa kuu wacaya...`, `${fromName} is calling you...`),
    tag: `call-${roomId || 'incoming'}`,
    requireInteraction: true,
    renotify: true,
    force: true,
    data: { type: 'call', callType, roomId, url: '/?tab=messenger' },
  });
}

function languageSafe(so: string, en: string) {
  try {
    const lang = localStorage.getItem('somluul_lang') || localStorage.getItem('language') || '';
    if (lang.startsWith('so')) return so;
  } catch (_) {}
  return so; // default Somali for this product
}

export function notifyGeneric(title: string, body: string, tag?: string) {
  return showSystemNotification({ title, body, tag: tag || 'somluul-generic' });
}
