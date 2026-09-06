/**
 * Phase 10 — Logical service split registry.
 * Today everything runs in one Node process; URLs allow gradual extraction.
 */
export type ServiceName =
  | 'api_gateway'
  | 'auth'
  | 'feed'
  | 'chat'
  | 'media'
  | 'realtime'
  | 'jobs'
  | 'ranking';

export type ServiceEndpoint = {
  name: ServiceName;
  baseUrl: string;
  mode: 'in_process' | 'remote';
};

function envUrl(key: string): string | null {
  const v = process.env[key]?.trim();
  return v || null;
}

/** Self base (empty = same origin) */
function selfBase(): string {
  return (
    process.env.PUBLIC_API_URL?.replace(/\/$/, '') ||
    process.env.VITE_API_URL?.replace(/\/$/, '') ||
    ''
  );
}

export function resolveServices(): ServiceEndpoint[] {
  const self = selfBase();
  const defs: Array<{ name: ServiceName; env: string }> = [
    { name: 'auth', env: 'SERVICE_AUTH_URL' },
    { name: 'feed', env: 'SERVICE_FEED_URL' },
    { name: 'chat', env: 'SERVICE_CHAT_URL' },
    { name: 'media', env: 'SERVICE_MEDIA_URL' },
    { name: 'realtime', env: 'SERVICE_REALTIME_URL' },
    { name: 'jobs', env: 'SERVICE_JOBS_URL' },
    { name: 'ranking', env: 'SERVICE_RANKING_URL' },
  ];

  const list: ServiceEndpoint[] = [
    { name: 'api_gateway', baseUrl: self || '/', mode: 'in_process' },
  ];

  for (const d of defs) {
    const remote = envUrl(d.env);
    list.push({
      name: d.name,
      baseUrl: remote || self || '/',
      mode: remote ? 'remote' : 'in_process',
    });
  }
  return list;
}

export function serviceStatus() {
  const services = resolveServices();
  const remote = services.filter((s) => s.mode === 'remote').map((s) => s.name);
  return {
    services,
    remoteCount: remote.length,
    allInProcess: remote.length === 0,
    extractionOrder: [
      'media (already direct-to-storage)',
      'realtime (SSE/WebSocket gateway)',
      'chat',
      'feed + ranking',
      'auth',
      'jobs',
    ],
  };
}

/**
 * Proxy helper path for future remote services.
 * Currently returns null → caller uses in-process handlers.
 */
export function remoteBase(name: ServiceName): string | null {
  const s = resolveServices().find((x) => x.name === name);
  if (!s || s.mode !== 'remote') return null;
  return s.baseUrl;
}
