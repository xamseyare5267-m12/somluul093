# Core reliability: calls, messages, posts

## What works in this app (with correct env)

| Feature | How |
|---------|-----|
| **Voice/video call** | WebRTC + `/api/webrtc` or scale signaling + **TURN** required on mobile |
| **Messages** | Chat API + SSE realtime + dual-write to `chat_messages` when SCALE_MODE=1 |
| **Posts + media** | Create post → `writeDBAsync` (Supabase app_state) + `dualWritePost` (posts table) |
| **Media not lost** | Upload to **Supabase Storage / GCS**; avoid pure `/uploads` on serverless |

## Required env for durability

```
SCALE_MODE=1
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_BUCKET=files-bucket   # public read
JWT_SECRET=
TURN_URL= + TURN_USERNAME= + TURN_CREDENTIAL=   # calls
REDIS_URL=   # if more than one API instance
```

## Concurrent posts (“millions at once”)

Code supports many concurrent **requests** via Postgres + rate limits, but:

- **Millions of simultaneous users** needs: load-balanced API fleet, Postgres capacity (or shards), Redis, CDN for media, and load testing.
- This ZIP does **not** magically equal Facebook capacity.
- Practical path: start 1 region → monitor `/api/ops/metrics` → scale Render/Railway instances + Supabase plan + Redis.

## Never-lose posts checklist

1. Schema v2 applied  
2. SCALE_MODE=1  
3. Storage bucket public  
4. Client uses `uploadMediaFile` (signed upload) when possible  
5. Server awaits `writeDBAsync` + `dualWritePost`  
6. Verify: create post → restart API → post still on `GET /api/posts` with `source: tables`

## Calls checklist

1. HTTPS page  
2. TURN configured  
3. `GET /api/webrtc/ice-servers` returns TURN  
4. Two devices different networks  

## Messages checklist

1. SSE `/api/scale/realtime` or `/api/chat/stream`  
2. Redis if multiple API replicas  
3. dualWriteMessage + scale chat tables  
