# SomLuul — Ready to deploy (Phase 2 Scale)

## App status

| Area | Status |
|------|--------|
| Auth (email / phone / session) | Real |
| Feed / Reels / Groups / Live / Marketplace / Pages | Real (legacy API) |
| Scale feed / posts / comments / reactions | Real when `SCALE_MODE=1` |
| Messenger (legacy) | Real |
| Scale messenger (room tables) | Real when `SCALE_MODE=1` |
| WebRTC + ICE/TURN | Real when TURN env set + scale routes |
| Direct media upload (CDN path) | Real (`POST /api/media/sign`) |
| Notifications (scale table) | Real when `SCALE_MODE=1` |
| Redis cache (optional) | Real when `REDIS_URL` set |
| PWA | Present |
| Owner / Admin | Real |

## REQUIRED before public users

1. Run `supabase/schema.sql` then `supabase/schema_v2_scale.sql`
2. Env:
   - `JWT_SECRET`, `OWNER_USERNAME`, `OWNER_PASSWORD`
   - `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_BUCKET`
   - `CORS_ORIGINS`
   - `SCALE_MODE=1` (for normalized tables)
   - `ALLOW_DEV_OTP=0`
3. Recommended: `CDN_BASE_URL`, `TURN_*`, `REDIS_URL`
4. Deploy → `/api/health` ready true → `/api/scale/status` scaleMode true
5. Test two users: post, message, call, media sign upload

## Docs
- `docs/SCALE_ARCHITECTURE.md`
- `docs/SCALE_ACTIVATE_SO.md`

## Never commit
- `.env`, `data/`, `uploads/`, service-account JSON

## Phase 3 — Dual-write + migration

1. `SCALE_MODE=1` + run `schema_v2_scale.sql`
2. After deploy with existing data:
   ```bash
   npm run migrate:app-state-to-tables
   ```
   Or authenticated: `POST /api/scale/migrate-from-memory`
3. Every legacy `writeDB` also schedules dual-write into tables (debounced).
4. Roadmap: `docs/ROADMAP_QAYB_QAYB.md`


## Phase 4 — Client Scale Path
- `src/lib/scaleClient.ts` — auto-detect scale, feed/chat/webrtc/media helpers
- FeedSection / ReelsSection / MessengerSection use scale path when available
- ICE servers loaded from `/api/webrtc/ice-servers` into `window.__SOMLUUL_ICE__`
- Fallback to legacy APIs if scale is off or fails


## Phase 5 — Realtime
- `GET /api/scale/realtime?token=...` SSE
- Client auto-reconnect + presence heartbeat
- Prefer long-lived Node host for SSE (Railway/Render)


## Phase 6 — Cutover
- Legacy GET posts/rooms/messages/profiles prefer tables when SCALE_MODE=1
- Response may include `source: "tables"`
- Blob remains fallback + dual-write target


## Phase 7 — Jobs & Redis fan-out
- Optional: `REDIS_URL` + `npm install ioredis`
- Auto cleanup webrtc/stories every 5 min
- `GET /api/scale/jobs`


## Phase 8 — Ranking
- Feed/Reels ranked by engagement + recency + following
- `GET /api/scale/recommend/:postId`


## Phase 9 — Ops
- `/api/ops/health`, `/api/ops/ready`, `/api/ops/metrics`
- Security + static cache headers
- Set `CDN_BASE_URL`, optional `OPS_METRICS_TOKEN`


## Phase 10 — Hyperscale foundations
- `/api/scale/sharding`, `/api/scale/services`, route helpers
- Optional `SHARD_COUNT` + `SHARD_N_SUPABASE_URL`
- Optional `SERVICE_*_URL` for extracted services
