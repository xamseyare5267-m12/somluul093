/**
 * Optional Redis-compatible cache for hot paths (feed, profile, presence).
 * Falls back to in-process LRU when REDIS_URL is not set.
 *
 * Production: set REDIS_URL to Upstash / Redis Cloud / ElastiCache.
 */
type Entry = { value: string; expiresAt: number };

const memory = new Map<string, Entry>();
const MAX_MEMORY_KEYS = 5000;

function memoryGet(key: string): string | null {
  const e = memory.get(key);
  if (!e) return null;
  if (Date.now() > e.expiresAt) {
    memory.delete(key);
    return null;
  }
  return e.value;
}

function memorySet(key: string, value: string, ttlSeconds: number): void {
  if (memory.size >= MAX_MEMORY_KEYS) {
    // Drop oldest ~10%
    const drop = Math.floor(MAX_MEMORY_KEYS * 0.1);
    let i = 0;
    for (const k of memory.keys()) {
      memory.delete(k);
      if (++i >= drop) break;
    }
  }
  memory.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
}

function memoryDel(key: string): void {
  memory.delete(key);
}

let redisClient: any = null;
let redisTried = false;

async function getRedis(): Promise<any | null> {
  if (redisTried) return redisClient;
  redisTried = true;
  const url = process.env.REDIS_URL?.trim();
  if (!url) return null;
  try {
    // Optional dependency — do not hard-require ioredis at build time
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Redis = (await import(/* webpackIgnore: true */ 'ioredis' as any)).default;
    redisClient = new Redis(url, {
      maxRetriesPerRequest: 2,
      enableReadyCheck: true,
      lazyConnect: true,
    });
    await redisClient.connect?.();
    return redisClient;
  } catch (err: any) {
    console.warn('[Cache] Redis unavailable, using in-memory cache:', err?.message || err);
    redisClient = null;
    return null;
  }
}

export async function cacheGet(key: string): Promise<string | null> {
  try {
    const r = await getRedis();
    if (r) {
      const v = await r.get(key);
      return v ?? null;
    }
  } catch {
    /* fall through */
  }
  return memoryGet(key);
}

export async function cacheSet(key: string, value: string, ttlSeconds = 60): Promise<void> {
  try {
    const r = await getRedis();
    if (r) {
      await r.set(key, value, 'EX', ttlSeconds);
      return;
    }
  } catch {
    /* fall through */
  }
  memorySet(key, value, ttlSeconds);
}

export async function cacheDel(key: string): Promise<void> {
  try {
    const r = await getRedis();
    if (r) {
      await r.del(key);
      return;
    }
  } catch {
    /* fall through */
  }
  memoryDel(key);
}

export async function cacheGetJson<T>(key: string): Promise<T | null> {
  const raw = await cacheGet(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function cacheSetJson(key: string, value: unknown, ttlSeconds = 60): Promise<void> {
  await cacheSet(key, JSON.stringify(value), ttlSeconds);
}

/** Cache key helpers */
export const CacheKeys = {
  feed: (cursor?: string) => `feed:v1:${cursor || 'head'}`,
  profile: (id: string) => `profile:v1:${id}`,
  roomMessages: (roomId: string, cursor?: string) => `msg:v1:${roomId}:${cursor || 'head'}`,
  iceConfig: () => 'ice:v1',
};
