# SomLuul — Runbook Infra Dhab ah (Somali)

## Maxaan aniga (AI) samayn karin

- Account Cloudflare / Supabase / Render abuurid
- Kaadhka bankiga ku bixinta
- DNS adiga oo leh domain

**Adigu** ayaa tallaabooyinkan ku orodda dashboard-yada.

---

## A. Minimum production (hal region) — bilow halkan

### 1) Supabase (database + storage)
1. [supabase.com](https://supabase.com) → New project  
2. SQL Editor → orod `supabase/schema.sql`  
3. SQL Editor → orod `supabase/schema_v2_scale.sql`  
4. Storage → New bucket `files-bucket` → **Public** ON  
5. Project Settings → API → copy:
   - Project URL → `SUPABASE_URL`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (**ha gelin browser**)

### 2) API host (Render ama Railway)
1. New Web Service → ku xir repo-ga  
2. Build: `npm install && npm run build`  
3. Start: `node dist/server.cjs`  
4. Health: `/api/ops/ready`  
5. Env vars:
```text
NODE_ENV=production
SCALE_MODE=1
JWT_SECRET=<openssl rand -hex 32>
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
SUPABASE_BUCKET=files-bucket
CORS_ORIGINS=https://yourdomain.com
OWNER_USERNAME=...
OWNER_PASSWORD=...
ALLOW_DEV_OTP=0
```
6. Deploy → `bash infra/scripts/99-verify.sh` with `API_BASE=https://...`

### 3) Web frontend
- Vercel/Pages: same repo, build `vite build`, output `dist`  
- `VITE_API_URL=https://api.yourdomain.com` haddii API gooni yahay  

### 4) Domain + Cloudflare CDN
1. Domain ku dar Cloudflare  
2. CNAME `api` → Render/Railway hostname (Proxied)  
3. CNAME `@` / `www` → Vercel  
4. SSL Full (strict)  
5. Cache: `/assets/*` cache; `/api/*` bypass  
6. WAF rate limit: `/api/auth/*` adag  
7. API env: `CDN_BASE_URL=https://cdn.yourdomain.com` (marka media CDN diyaar)

### 5) TURN (wacitaanka)
**Fudud:** [Metered](https://www.metered.ca/) ama Twilio Network Traversal  
```text
TURN_URL=turn:...
TURN_USERNAME=...
TURN_CREDENTIAL=...
```
**Self-host:** `docker compose --profile turn up` + `infra/docker/coturn/turnserver.conf` (IP public)

### 6) Redis (replicas ≥ 2)
- Upstash Redis → `REDIS_URL`  
- `npm install ioredis` production image  

### 7) Migration xog
```bash
SCALE_MODE=1 SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
  npm run migrate:app-state-to-tables
```

### 8) Hubin dadweyne
- Labo browser: signup, post+sawir, message, call  
- `GET /api/ops/ready` = 200  

---

## B. Fleet (API replicas)

**Render blueprint:** `infra/render/render.yaml` (`numInstances: 2`)  
**Shardi:** `REDIS_URL` waa **lagama maarmaan** si SSE + jobs u wada shaqeeyaan.

Worker gooni: service `somluul-jobs` same blueprint.

---

## C. Shard DBs (hyperscale path)

1. Hal DB ha degdegin ilaa load dhab ah  
2. Marka la baahdo:
```bash
export SHARD_COUNT=4
bash infra/scripts/02-supabase-shards.sh
```
3. 4 projects Supabase → isla schema  
4. Secrets:
```text
SHARD_COUNT=4
SHARD_0_SUPABASE_URL=...
SHARD_0_SUPABASE_SERVICE_ROLE_KEY=...
# ...
```
5. App helpers: `/api/scale/sharding`  
6. **Xusuus:** query-yada oo dhan per-shard pool waa engineering xiga; bilow logical routing.

---

## D. CDN global media

1. Cloudflare R2 bucket `somluul-media`  
2. Custom domain `cdn.yourdomain.com`  
3. `CDN_BASE_URL=https://cdn.yourdomain.com`  
4. Upload path: `POST /api/media/sign` → client PUT → public URL CDN  

ama: Cloudflare proxy in front of Supabase storage public URL.

---

## E. Qiimo qiyaas (tusaale)

| Adeeg | Bilow |
|-------|--------|
| Supabase Pro | DB + auth + storage |
| Render Standard ×2 | API fleet |
| Upstash Redis | pay-as-you-go |
| Cloudflare | domain + CDN |
| TURN | Metered/Twilio |

---

## F. Marka wax xumaado

| Calaamad | Hubi |
|----------|------|
| `ready: false` | JWT_SECRET, SUPABASE keys, schema |
| Media 403 | bucket public / CDN |
| Call fail mobile | TURN_URL credentials |
| Message ma soo gaadho replica kale | REDIS_URL + ioredis |
| 429 | Cloudflare WAF ama in-app rate limit |
