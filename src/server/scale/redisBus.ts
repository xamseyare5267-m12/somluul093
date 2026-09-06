/**
 * Phase 7 — Redis pub/sub bus for multi-instance realtime fan-out.
 * When REDIS_URL is unset, publishes are no-ops (local hub only).
 */
import { EventEmitter } from 'events';

const CHANNEL = process.env.REDIS_REALTIME_CHANNEL || 'somluul:realtime';
const local = new EventEmitter();
local.setMaxListeners(50);

let pub: any = null;
let sub: any = null;
let ready = false;
let initTried = false;

async function getRedisCtor(): Promise<any | null> {
  try {
    const mod = await import(/* webpackIgnore: true */ 'ioredis' as any);
    return mod.default || mod;
  } catch {
    return null;
  }
}

export async function initRedisBus(): Promise<{ ok: boolean; mode: 'redis' | 'local'; reason?: string }> {
  if (initTried) return { ok: ready, mode: ready ? 'redis' : 'local' };
  initTried = true;
  const url = process.env.REDIS_URL?.trim();
  if (!url) {
    return { ok: false, mode: 'local', reason: 'REDIS_URL not set' };
  }
  const Redis = await getRedisCtor();
  if (!Redis) {
    return { ok: false, mode: 'local', reason: 'ioredis not installed — using local bus' };
  }
  try {
    pub = new Redis(url, { maxRetriesPerRequest: 2, lazyConnect: true, enableReadyCheck: true });
    sub = new Redis(url, { maxRetriesPerRequest: 2, lazyConnect: true, enableReadyCheck: true });
    if (pub.connect) await pub.connect();
    if (sub.connect) await sub.connect();
    await sub.subscribe(CHANNEL);
    sub.on('message', (channel: string, message: string) => {
      if (channel !== CHANNEL) return;
      try {
        const parsed = JSON.parse(message);
        local.emit('bus', parsed);
      } catch {
        /* ignore bad payload */
      }
    });
    ready = true;
    console.log('[RedisBus] subscribed on', CHANNEL);
    return { ok: true, mode: 'redis' };
  } catch (err: any) {
    console.warn('[RedisBus] init failed:', err?.message || err);
    pub = null;
    sub = null;
    ready = false;
    return { ok: false, mode: 'local', reason: err?.message || 'init failed' };
  }
}

export function isRedisBusReady(): boolean {
  return ready;
}

/** Publish event to all app instances (and local subscribers). */
export async function busPublish(event: string, payload: unknown, targetUserIds?: string[]): Promise<void> {
  const envelope = {
    event,
    payload,
    targetUserIds: targetUserIds || null,
    at: Date.now(),
    origin: process.env.VERCEL_REGION || process.env.RAILWAY_REPLICA_ID || 'local',
  };
  // Only cross-instance: local delivery is handled by realtimeHub.deliverLocal
  // to avoid double-emit on the same process.
  if (ready && pub) {
    try {
      await pub.publish(CHANNEL, JSON.stringify(envelope));
    } catch (err: any) {
      console.warn('[RedisBus] publish failed:', err?.message || err);
    }
  }
}

/** Subscribe to bus events (local + Redis). */
export function busSubscribe(handler: (msg: {
  event: string;
  payload: unknown;
  targetUserIds: string[] | null;
}) => void): () => void {
  const fn = (msg: any) => handler(msg);
  local.on('bus', fn);
  return () => local.off('bus', fn);
}

export function busStats(): { ready: boolean; channel: string } {
  return { ready, channel: CHANNEL };
}
