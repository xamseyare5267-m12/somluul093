/**
 * Phase 9 — Ops: metrics, security headers, enhanced health, edge-friendly limits.
 */
import type { Request, Response, NextFunction, Express } from 'express';
import { checkSupabaseHealth } from '../db.js';
import { isScaleMode, supabaseConfig } from './supabaseRest.js';
import { busStats, isRedisBusReady } from './redisBus.js';
import { jobQueueStats } from './jobQueue.js';
import { realtimeStats } from './realtimeHub.js';
import { cutoverEnabled } from './cutoverReads.js';
import { shardingStatus } from './sharding.js';
import { serviceStatus } from './serviceRegistry.js';

type LatSample = { path: string; ms: number; status: number; at: number };

const startedAt = Date.now();
const counters = {
  requests: 0,
  errors4xx: 0,
  errors5xx: 0,
  rateLimited: 0,
};
const latencies: LatSample[] = [];
const MAX_LAT = 500;

export function opsMetricsMiddleware(req: Request, res: Response, next: NextFunction): void {
  if (!req.path.startsWith('/api/')) return next();
  const t0 = Date.now();
  counters.requests += 1;
  const end = () => {
    const ms = Date.now() - t0;
    const status = res.statusCode || 200;
    if (status >= 500) counters.errors5xx += 1;
    else if (status >= 400) counters.errors4xx += 1;
    if (status === 429) counters.rateLimited += 1;
    latencies.push({ path: req.path.slice(0, 80), ms, status, at: Date.now() });
    if (latencies.length > MAX_LAT) latencies.splice(0, latencies.length - MAX_LAT);
  };
  res.on('finish', end);
  res.on('close', end);
  next();
}

export function securityHeadersMiddleware(_req: Request, res: Response, next: NextFunction): void {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(self), microphone=(self), geolocation=()');
  res.setHeader('X-DNS-Prefetch-Control', 'on');
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
}

/** CDN / browser cache hints for public GETs */
export function cacheHeadersMiddleware(req: Request, res: Response, next: NextFunction): void {
  if (req.method !== 'GET') return next();
  if (req.path.startsWith('/api/')) {
    // Default: no store for authenticated APIs
    if (
      req.path === '/api/health' ||
      req.path === '/api/ops/health' ||
      req.path === '/api/scale/status'
    ) {
      res.setHeader('Cache-Control', 'no-store');
    } else if (req.path.startsWith('/api/scale/feed') || req.path.startsWith('/api/posts')) {
      // Short edge cache only if you put CDN in front and strip cookies — still no-store by default
      res.setHeader('Cache-Control', 'private, max-age=0, must-revalidate');
    }
    return next();
  }
  // Static assets
  if (/\.(js|css|png|jpg|jpeg|webp|svg|woff2|ico)$/i.test(req.path)) {
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    if (process.env.CDN_BASE_URL) {
      res.setHeader('CDN-Cache-Control', 'public, max-age=31536000');
    }
  }
  next();
}

function percentile(sorted: number[], p: number): number {
  if (!sorted.length) return 0;
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[idx];
}

export function getOpsSnapshot() {
  const ms = latencies.map((l) => l.ms).sort((a, b) => a - b);
  const uptimeSec = Math.floor((Date.now() - startedAt) / 1000);
  return {
    uptimeSec,
    counters: { ...counters },
    latencyMs: {
      count: ms.length,
      p50: percentile(ms, 50),
      p95: percentile(ms, 95),
      p99: percentile(ms, 99),
    },
    region:
      process.env.VERCEL_REGION ||
      process.env.FLY_REGION ||
      process.env.AWS_REGION ||
      process.env.RAILWAY_REGION ||
      null,
    instance:
      process.env.RAILWAY_REPLICA_ID ||
      process.env.RENDER_INSTANCE_ID ||
      process.env.HOSTNAME ||
      null,
    cdnBase: process.env.CDN_BASE_URL || null,
    scaleMode: isScaleMode(),
    cutover: cutoverEnabled(),
    redisBusReady: isRedisBusReady(),
    bus: busStats(),
    jobs: jobQueueStats(),
    realtime: realtimeStats(),
  };
}

export async function buildDeepHealth() {
  const supabase = await checkSupabaseHealth().catch((e: any) => ({
    ok: false,
    error: e?.message || String(e),
  }));
  const snap = getOpsSnapshot();
  const jwtOk = !!(process.env.JWT_SECRET && process.env.JWT_SECRET.length >= 16);
  const hasSupabase = !!supabaseConfig();
  const ready = jwtOk && hasSupabase && !!(supabase as any).ok;
  return {
    status: ready ? 'ok' : 'degraded',
    ready,
    jwtConfigured: jwtOk,
    supabaseConfigured: hasSupabase,
    supabaseHealth: supabase,
    scaleMode: isScaleMode(),
    cutover: cutoverEnabled(),
    turnConfigured: !!(process.env.TURN_URL && process.env.TURN_USERNAME && process.env.TURN_CREDENTIAL),
    redisConfigured: !!process.env.REDIS_URL,
    redisBusReady: isRedisBusReady(),
    cdnBase: process.env.CDN_BASE_URL || null,
    corsOrigins: (process.env.CORS_ORIGINS || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean).length,
    ops: snap,
    version: process.env.npm_package_version || '1.2.0',
    sharding: shardingStatus(),
    services: serviceStatus(),
    time: new Date().toISOString(),
  };
}

/** Redis-backed rate limit when REDIS_URL set; else caller uses memory. */
export async function redisRateLimit(
  key: string,
  limit: number,
  windowSec: number
): Promise<{ allowed: boolean; remaining: number }> {
  const url = process.env.REDIS_URL?.trim();
  if (!url) return { allowed: true, remaining: limit };
  try {
    const mod = await import(/* webpackIgnore: true */ 'ioredis' as any);
    const Redis = mod.default || mod;
    const r = new Redis(url, { maxRetriesPerRequest: 1, lazyConnect: true });
    if (r.connect) await r.connect();
    const k = `rl:${key}`;
    const n = await r.incr(k);
    if (n === 1) await r.expire(k, windowSec);
    const ttl = await r.ttl(k);
    if (ttl < 0) await r.expire(k, windowSec);
    try {
      r.disconnect?.();
    } catch {
      /* ignore */
    }
    return { allowed: n <= limit, remaining: Math.max(0, limit - n) };
  } catch {
    return { allowed: true, remaining: limit };
  }
}

export function mountOpsRoutes(app: Express, deps?: { authMiddleware?: any }): void {
  app.get('/api/ops/health', async (_req, res) => {
    const body = await buildDeepHealth();
    res.status(body.ready ? 200 : 503).json(body);
  });

  app.get('/api/ops/metrics', (req, res) => {
    // Optional protect with OPS_METRICS_TOKEN
    const token = process.env.OPS_METRICS_TOKEN?.trim();
    if (token) {
      const got = String(req.headers['x-ops-token'] || req.query.token || '');
      if (got !== token) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }
    }
    res.json(getOpsSnapshot());
  });

  app.get('/api/ops/ready', async (_req, res) => {
    const body = await buildDeepHealth();
    if (body.ready) res.status(200).json({ ready: true });
    else res.status(503).json({ ready: false, body });
  });
}
