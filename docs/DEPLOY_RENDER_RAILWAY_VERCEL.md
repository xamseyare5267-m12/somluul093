# SomLuul — Deploy: Render · Railway · Vercel

## Ka hor mid kasta (Supabase)

1. Supabase project cusub  
2. SQL Editor → `supabase/schema.sql` → Run  
3. SQL Editor → `supabase/schema_v2_scale.sql` → Run  
4. Storage → bucket **`files-bucket`** → Public **ON**  
5. Copy:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY` (service_role, **server only**)

```bash
# JWT secret
openssl rand -hex 32
```

---

## Environment variables (dhammaan platforms)

| Variable | Qiimo | Notes |
|----------|--------|--------|
| `NODE_ENV` | `production` | |
| `SCALE_MODE` | `1` | Tables + scale APIs |
| `JWT_SECRET` | 32+ hex | `openssl rand -hex 32` |
| `SUPABASE_URL` | `https://xxx.supabase.co` | |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJ...` | Never in browser |
| `SUPABASE_BUCKET` | `files-bucket` | |
| `CORS_ORIGINS` | `https://yourdomain.com` | comma-separated HTTPS |
| `OWNER_USERNAME` | ... | |
| `OWNER_PASSWORD` | long random | |
| `ALLOW_DEV_OTP` | `0` | |
| `CDN_BASE_URL` | optional | media CDN |
| `REDIS_URL` | optional | needed if multiple instances |
| `TURN_URL` / `TURN_USERNAME` / `TURN_CREDENTIAL` | optional | calls |
| `SMTP_*` | optional | email OTP |

---

## Option A — Railway (ugu fiican API + realtime)

**Sabab:** process dheer (SSE, jobs, WebRTC poll) wuxuu ku fiican yahay long-lived Node.

### Tallaabo
1. [railway.app](https://railway.app) → New Project → Deploy from GitHub  
2. Root = repo SomLuul  
3. Build / Start (haddii Dockerfile jiro wuu isticmaali; haddii kale):
   - **Build:** `npm install && npm run build`  
   - **Start:** `node dist/server.cjs`  
4. Variables → ku dar table-ka kore  
5. Generate domain: `https://somluul-xxx.up.railway.app`  
6. Hubi: `https://YOUR_URL/api/ops/ready` → `{"ready":true}`  

`railway.toml` hore ayaa u jira (`healthcheckPath = /api/health`).

### Web frontend (hadduu API keliya yahay)
- Vercel static ama Railway service labaad (Vite static)  
- `VITE_API_URL=https://your-railway-api.up.railway.app`

### Migration
```bash
# local with prod env
SCALE_MODE=1 SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
  npm run migrate:app-state-to-tables
```

---

## Option B — Render (API fleet)

### Tallaabo
1. [render.com](https://render.com) → New → Web Service → GitHub repo  
2. **Runtime:** Node  
3. **Build Command:** `npm install && npm run build`  
4. **Start Command:** `node dist/server.cjs`  
5. **Health Check Path:** `/api/ops/ready`  
6. Plan: Starter OK; Standard haddii aad rabto 2 instances  
7. Environment → dhammaan vars  

Blueprint: `infra/render/render.yaml` (2 instances + worker).

### Muhiim
- Instances > 1 → **REDIS_URL** waa lagama maarmaan (SSE fan-out)  
- Disk optional (media asalka waa Supabase Storage)

### Domain
Render → Custom Domain → Cloudflare CNAME  

---

## Option C — Vercel (web + serverless API)

**Wanaag:** frontend + `/api` hal domain.  
**Xaddidaad:** serverless = cold start; SSE realtime waa daciif; u fiican traffic yar / frontend-primary.

### Tallaabo
1. [vercel.com](https://vercel.com) → Import Git repo  
2. Framework: Other  
3. **Build Command:** `npm run build` (ama `vercel-build`)  
4. **Output Directory:** `dist`  
5. `vercel.json` hore ayaa u jira (rewrites `/api` → `api/index.ts`)  
6. Project Settings → Environment Variables → same table  
7. Deploy  

### Functions
`api/index.ts` wuxuu load gareeyaa `dist/server.cjs` — **build waa inuu ku jiro** `dist/`.

### Talo Vercel
- Realtime/chat culus → API u rar **Railway/Render**, Vercel = static only  
- `VITE_API_URL=https://api-on-railway...`  
- Ama dhammaan Railway

### maxDuration
`vercel.json` → `maxDuration: 30` (Pro: kordhin kartaa)

---

## Isbarbardhig degdeg ah

| | Railway | Render | Vercel |
|--|---------|--------|--------|
| Long-lived Node | ✅ | ✅ | ❌ serverless |
| SSE / jobs | ✅ | ✅ | daciif |
| Static web | OK | OK | ✅ ugu fiican |
| Multi-instance | Redis | Redis | edge limits |
| Setup fudud | ✅ | ✅ | ✅ |

**Talo ugu fiican production:**  
- **API + realtime:** Railway ama Render  
- **Web UI:** Vercel (ama isla Railway)  
- **DB/Storage:** Supabase  
- **CDN:** Cloudflare  

---

## Ka dib deploy

```bash
export API_BASE=https://your-api-url
bash infra/scripts/99-verify.sh
```

Browser:
1. Signup / login  
2. Post + image  
3. Message labo account  
4. Call (TURN haddii mobile)

Scale:
```
GET /api/scale/status
GET /api/ops/health
```

---

## CORS

Haddii web = `https://app.com` iyo API = `https://api.xxx`:
```
CORS_ORIGINS=https://app.com,https://www.app.com
```

Vercel domain + custom domain dhammaantood ku dar.

---

## Dhibaatooyin caadi ah

| Error | Xal |
|-------|-----|
| `ready: false` | JWT_SECRET / Supabase keys / schema |
| 500 bootstrap | `npm run build` failed — check build logs for `dist/server.cjs` |
| CORS blocked | `CORS_ORIGINS` exact HTTPS origin |
| Media fail | bucket public + `SUPABASE_BUCKET` |
| SSE dead on Vercel | u rar API Railway/Render |
| 401 always | token / JWT_SECRET mismatch between deploys |
