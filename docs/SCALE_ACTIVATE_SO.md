# SomLuul — Sidee loo shidaa Scale Mode (Phase 2)

## Maxaad heshay?

Code-ka cusub wuxuu keenayaa:

1. **Databases qaybsan** — tables gaar ah (posts, messages, follows, notifications, webrtc_signals…)
2. **Media / CDN path** — upload toos ah object storage + `CDN_BASE_URL`
3. **Call infrastructure** — TURN + ICE servers + signaling table
4. **Cache** — Redis (ikhtiyaari) ama memory LRU
5. **API-yo cusub** — `/api/scale/*`

**Xaqiiq:** Tani waa architecture-ka saxda ah ee koritaanka. Ma aha in ZIP keliya uu noqdo Facebook/TikTok si toos ah — waa inaad isku xirto Supabase, CDN, TURN, domain.

## Tallaabooyin

### 1. Supabase
1. Fur project cusub ama kan jira.
2. SQL Editor → orod `supabase/schema.sql`
3. Kadib orod `supabase/schema_v2_scale.sql`
4. Storage → bucket `files-bucket` → Public ON (ama CDN ka hor mari)

### 2. Environment (Vercel / Render / Railway)
```
SCALE_MODE=1
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...   # server only
SUPABASE_BUCKET=files-bucket
JWT_SECRET=...                     # openssl rand -hex 32
CORS_ORIGINS=https://somluul.com
OWNER_USERNAME=...
OWNER_PASSWORD=...
CDN_BASE_URL=https://cdn.somluul.com
REDIS_URL=                         # ikhtiyaari
TURN_URL=turn:....
TURN_USERNAME=...
TURN_CREDENTIAL=...
ALLOW_DEV_OTP=0
```

### 3. CDN (tusaale Cloudflare)
1. Bucket public URL → Cloudflare proxy ama R2
2. `CDN_BASE_URL` u dhig domain-ka CDN

### 4. TURN (wacitaanka)
Dooro mid:
- [Metered.ca](https://www.metered.ca/tools/openrelay/) (tijaabo)
- Twilio Network Traversal
- coturn self-host

Ku dar `TURN_URL`, `TURN_USERNAME`, `TURN_CREDENTIAL`.

### 5. Hubin
```
GET /api/health          → ready: true
GET /api/scale/status    → scaleMode: true, postsRepo: true, turnConfigured: true
```

### 6. Client
- Media: `POST /api/media/sign` → upload direct → post URL
- Feed/Chat/Calls: isticmaal `/api/scale/*` marka status OK yahay
- ICE: `GET /api/webrtc/ice-servers`

## Wixii aanan ZIP ku xallin karin
- Account Stripe / Twilio / OAuth dhab ah
- DNS + TLS certificates
- Qiimaha CDN iyo TURN production
- Load testing dhabta ah ee malaayiinta users

Kuwaas waa inaad adigu ka sameyso cloud accounts-kaaga.

## Natiijo
Marka tallaabooyinkan la dhammeeyo, app-ku wuxuu isticmaalaa **databases qaybsan**, **media CDN path**, iyo **call infrastructure** — taas oo ah aasaaska inuu u koro sida platform-yada waaweyn, halkii uu ku xisbi lahaa hal JSON blob.
