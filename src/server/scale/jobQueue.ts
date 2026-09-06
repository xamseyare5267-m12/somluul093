/**
 * Phase 7 — Lightweight job queue + workers.
 * Uses Redis lists when available; otherwise in-memory queue on this process.
 */
import { randomUUID } from 'crypto';
import { restDelete, isScaleMode, supabaseConfig } from './supabaseRest.js';
import { busPublish } from './redisBus.js';

export type JobType =
  | 'cleanup_webrtc'
  | 'cleanup_stories'
  | 'cleanup_idempotency'
  | 'notify_fanout'
  | 'dual_write_flush';

export type Job = {
  id: string;
  type: JobType;
  payload?: Record<string, unknown>;
  createdAt: number;
  attempts: number;
};

const memoryQueue: Job[] = [];
const QUEUE_KEY = process.env.REDIS_JOB_QUEUE || 'somluul:jobs';
const results: Array<{ id: string; type: string; ok: boolean; detail?: string; at: number }> = [];
const MAX_RESULTS = 100;

let redis: any = null;
let workerTimer: ReturnType<typeof setInterval> | null = null;
let cronTimer: ReturnType<typeof setInterval> | null = null;
let processing = false;

async function getRedis(): Promise<any | null> {
  if (redis) return redis;
  const url = process.env.REDIS_URL?.trim();
  if (!url) return null;
  try {
    const mod = await import(/* webpackIgnore: true */ 'ioredis' as any);
    const Redis = mod.default || mod;
    redis = new Redis(url, { maxRetriesPerRequest: 2, lazyConnect: true });
    if (redis.connect) await redis.connect();
    return redis;
  } catch {
    return null;
  }
}

export async function enqueueJob(type: JobType, payload?: Record<string, unknown>): Promise<string> {
  const job: Job = {
    id: randomUUID(),
    type,
    payload: payload || {},
    createdAt: Date.now(),
    attempts: 0,
  };
  const r = await getRedis();
  if (r) {
    try {
      await r.lpush(QUEUE_KEY, JSON.stringify(job));
      return job.id;
    } catch {
      /* fall through */
    }
  }
  memoryQueue.push(job);
  return job.id;
}

async function dequeueJob(): Promise<Job | null> {
  const r = await getRedis();
  if (r) {
    try {
      const raw = await r.rpop(QUEUE_KEY);
      if (raw) return JSON.parse(raw) as Job;
    } catch {
      /* fall through */
    }
  }
  return memoryQueue.shift() || null;
}

function recordResult(id: string, type: string, ok: boolean, detail?: string) {
  results.unshift({ id, type, ok, detail, at: Date.now() });
  if (results.length > MAX_RESULTS) results.length = MAX_RESULTS;
}

async function runCleanupWebrtc(): Promise<string> {
  if (!isScaleMode() || !supabaseConfig()) return 'skipped: scale off';
  await restDelete(`webrtc_signals?expires_at=lt.${encodeURIComponent(new Date().toISOString())}`);
  return 'webrtc expired signals deleted';
}

async function runCleanupStories(): Promise<string> {
  if (!isScaleMode() || !supabaseConfig()) return 'skipped: scale off';
  await restDelete(`stories?expires_at=lt.${encodeURIComponent(new Date().toISOString())}`);
  return 'expired stories deleted';
}

async function runCleanupIdempotency(): Promise<string> {
  if (!isScaleMode() || !supabaseConfig()) return 'skipped: scale off';
  await restDelete(`idempotency_keys?expires_at=lt.${encodeURIComponent(new Date().toISOString())}`);
  return 'expired idempotency keys deleted';
}

async function runNotifyFanout(payload?: Record<string, unknown>): Promise<string> {
  const userIds = (payload?.userIds as string[]) || [];
  const event = String(payload?.event || 'notification');
  const data = payload?.data || {};
  if (!userIds.length) return 'no targets';
  await busPublish(event, data, userIds);
  return `fanout ${event} → ${userIds.length} users`;
}

async function processJob(job: Job): Promise<void> {
  job.attempts += 1;
  try {
    let detail = '';
    switch (job.type) {
      case 'cleanup_webrtc':
        detail = await runCleanupWebrtc();
        break;
      case 'cleanup_stories':
        detail = await runCleanupStories();
        break;
      case 'cleanup_idempotency':
        detail = await runCleanupIdempotency();
        break;
      case 'notify_fanout':
        detail = await runNotifyFanout(job.payload);
        break;
      case 'dual_write_flush':
        detail = 'noop (dual-write is inline)';
        break;
      default:
        detail = 'unknown job';
    }
    recordResult(job.id, job.type, true, detail);
  } catch (err: any) {
    recordResult(job.id, job.type, false, err?.message || String(err));
    if (job.attempts < 3) {
      memoryQueue.push(job);
    }
  }
}

async function tickWorker(): Promise<void> {
  if (processing) return;
  processing = true;
  try {
    for (let i = 0; i < 10; i++) {
      const job = await dequeueJob();
      if (!job) break;
      await processJob(job);
    }
  } finally {
    processing = false;
  }
}

/** Start background worker + periodic cleanup cron. */
export function startJobWorkers(opts?: { intervalMs?: number; cronMs?: number }): void {
  if (workerTimer) return;
  const intervalMs = opts?.intervalMs ?? 3000;
  const cronMs = opts?.cronMs ?? 5 * 60 * 1000;

  workerTimer = setInterval(() => {
    void tickWorker();
  }, intervalMs);

  cronTimer = setInterval(() => {
    void enqueueJob('cleanup_webrtc');
    void enqueueJob('cleanup_stories');
    void enqueueJob('cleanup_idempotency');
  }, cronMs);

  // Run one cleanup soon after boot
  setTimeout(() => {
    void enqueueJob('cleanup_webrtc');
    void enqueueJob('cleanup_stories');
  }, 15000);

  console.log('[JobQueue] workers started');
}

export function stopJobWorkers(): void {
  if (workerTimer) clearInterval(workerTimer);
  if (cronTimer) clearInterval(cronTimer);
  workerTimer = null;
  cronTimer = null;
}

export function jobQueueStats() {
  return {
    memoryPending: memoryQueue.length,
    recent: results.slice(0, 20),
    redisQueue: QUEUE_KEY,
  };
}

export async function enqueueNotifyFanout(
  userIds: string[],
  event: string,
  data: Record<string, unknown>
): Promise<string> {
  return enqueueJob('notify_fanout', { userIds, event, data });
}
