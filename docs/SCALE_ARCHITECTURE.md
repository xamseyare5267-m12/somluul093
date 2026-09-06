# SomLuul Scale Architecture (Phase 2)

This package adds the **production scale path** required to grow beyond a single JSONB `app_state` blob toward patterns used by large social platforms.

## Honest scope

No ZIP alone can provision:

- Global multi-region data centers
- Facebook-scale social graph shards
- TikTok-scale recommendation clusters
- WhatsApp-scale message queues for billions of users
- Physical CDN PoPs worldwide

What this phase **does** deliver in code:

| Layer | What was added | Comparable pattern |
|-------|----------------|--------------------|
| Database | Normalized tables (`posts`, `chat_messages`, `follows`, …) + indexes | FB/IG feed + graph edges |
| Compatibility | `app_state` kept for dual-write period | Migration bridge |
| Media | Direct signed upload to object storage + `CDN_BASE_URL` | TikTok/IG CDN origin |
| Calls | Dedicated `webrtc_signals` + `/api/webrtc/ice-servers` + TURN env | WhatsApp/Telegram VoIP |
| Cache | Redis optional + in-memory LRU | Edge/hot-path cache |
| API | `/api/scale/*` routes for feed, chat, social, calls, notifications | Domain-separated services |

## Enable scale mode

1. **Run schema**
   ```sql
   -- In Supabase SQL Editor
   -- Run supabase/schema.sql then:
   -- supabase/schema_v2_scale.sql
   ```

2. **Environment**
   ```bash
   SCALE_MODE=1
   SUPABASE_URL=https://<ref>.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=<server-only>
   SUPABASE_BUCKET=files-bucket
   JWT_SECRET=<32+ chars>
   CORS_ORIGINS=https://your-domain.com
   CDN_BASE_URL=https://cdn.your-domain.com   # optional but recommended
   REDIS_URL=redis://...                      # optional
   TURN_URL=turn:turn.example.com:3478
   TURN_USERNAME=...
   TURN_CREDENTIAL=...
   ```

3. **Verify**
   ```bash
   curl https://your-api/api/scale/status
   # expect scaleMode:true, repos true, turnConfigured when TURN set
   curl https://your-api/api/health
   # expect ready:true
   ```

## New API surface (`SCALE_MODE=1`)

### Media (CDN path)
- `POST /api/media/sign` → `{ uploadUrl, publicUrl, objectKey }`
- Client uploads **directly** to storage (not through serverless body)

### Feed / Reels
- `GET /api/scale/feed`
- `POST /api/scale/posts`
- `GET /api/scale/reels`
- `POST /api/scale/posts/:id/react`
- `POST /api/scale/posts/:id/comments`
- `DELETE /api/scale/posts/:id`

### Messenger
- `POST /api/scale/chat/dm` `{ peerId }`
- `POST /api/scale/chat/group`
- `GET /api/scale/chat/rooms`
- `GET /api/scale/chat/:roomId/messages`
- `POST /api/scale/chat/:roomId/messages`
- `POST /api/scale/chat/:roomId/read`

### Calls
- `GET /api/webrtc/ice-servers` (STUN + TURN)
- `POST /api/scale/webrtc/signal`
- `GET /api/scale/webrtc/poll`
- `POST /api/scale/webrtc/consumed`

### Social / notifications
- `POST|DELETE /api/scale/follow/:id`
- `POST|DELETE /api/scale/block/:id`
- `GET /api/scale/search/users?q=`
- `POST /api/scale/presence`
- `GET /api/scale/notifications`

## Infrastructure checklist (real global launch)

### Must have
- [ ] Supabase (or Postgres) with schema v2
- [ ] `SCALE_MODE=1`
- [ ] Object storage bucket **public read** for media + private signed upload
- [ ] CDN in front of bucket (Cloudflare / CloudFront / Fastly)
- [ ] TURN server for calls (Twilio / Metered / self-hosted coturn)
- [ ] Strong `JWT_SECRET` + owner credentials
- [ ] HTTPS domain + `CORS_ORIGINS`

### Strongly recommended
- [ ] Redis (Upstash) for feed/profile cache
- [ ] Separate region read replicas when traffic grows
- [ ] Background worker for signal/story TTL cleanup
- [ ] Error tracking (Sentry) + uptime checks
- [ ] Rate limiting at edge (Cloudflare WAF)

### Later (true hyperscale)
- [ ] Cut remaining legacy routes off `app_state` JSONB
- [ ] Message queue (SQS / PubSub) for fan-out notifications
- [ ] Shard chat by room id range
- [ ] Dedicated realtime gateway (WebSocket cluster)
- [ ] Recommendation / ranking service for Reels
- [ ] Multi-region active-active with conflict strategy

## Client integration notes

1. Prefer `/api/scale/*` when `GET /api/scale/status` reports repos enabled.
2. For media: sign → PUT to `uploadUrl` → create post/message with `publicUrl`.
3. For calls: fetch ICE servers once per session; use scale WebRTC poll/signal endpoints.
4. Keep legacy endpoints during migration; dual operation is intentional.

## File map

```
supabase/schema_v2_scale.sql
src/server/scale/supabaseRest.ts
src/server/scale/mediaUpload.ts
src/server/scale/cache.ts
src/server/scale/mountScaleRoutes.ts
src/server/repos/postsRepo.ts
src/server/repos/messagesRepo.ts
src/server/repos/profilesRepo.ts
src/server/repos/webrtcRepo.ts
src/server/repos/notificationsRepo.ts
docs/SCALE_ARCHITECTURE.md
docs/SCALE_ACTIVATE_SO.md
```
