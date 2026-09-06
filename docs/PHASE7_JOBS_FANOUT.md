# Phase 7 — Fan-out & Jobs

## Redis realtime bus
- `src/server/scale/redisBus.ts`
- Channel: `somluul:realtime` (override `REDIS_REALTIME_CHANNEL`)
- When `REDIS_URL` is set and `ioredis` is available, SSE events fan out across instances
- Without Redis: single-process hub only (Railway/Render one instance still fine)

Install Redis client (optional):
```bash
npm install ioredis
```

## Job queue
- `src/server/scale/jobQueue.ts`
- Redis list `somluul:jobs` or in-memory fallback
- Worker tick every 3s
- Cron every 5 min: cleanup webrtc signals, stories, idempotency keys

### Job types
| Type | Action |
|------|--------|
| `cleanup_webrtc` | Delete expired `webrtc_signals` |
| `cleanup_stories` | Delete expired `stories` |
| `cleanup_idempotency` | Delete expired keys |
| `notify_fanout` | Pub/sub event to user ids |

### API
- `GET /api/scale/jobs` — queue stats + bus status
- `POST /api/scale/jobs/enqueue` `{ type, payload }`
- `GET /api/scale/status` includes `redisBusReady`, `jobs`, `bus`

## Boot
`startRealtimeBus()` + `startJobWorkers()` run when the server mounts scale routes.

## Production tips
1. Use Upstash Redis (serverless-friendly) or Redis Cloud
2. Prefer long-lived Node (Render/Railway) for SSE + workers
3. On Vercel-only: workers run per instance / cold start — pair with external cron hitting `/api/scale/jobs/enqueue`
