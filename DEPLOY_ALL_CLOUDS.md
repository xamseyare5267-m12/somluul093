# SomLuul — Deploy Anywhere

SomLuul is a single Node process (`server.ts` → `dist/server.cjs`) that serves the Vite-built SPA and the API.  
It runs on **any** platform that can run Node 18+ and expose one HTTP port.

## Required environment variables

```bash
NODE_ENV=production
PORT=3000
JWT_SECRET=          # openssl rand -hex 32
OWNER_USERNAME=
OWNER_PASSWORD=

# Persistence (pick at least one for production)
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
# and/or
GCS_BUCKET_NAME=
GCP_PROJECT_ID=

# Optional email OTP
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
MAIL_FROM=

ALLOW_DEV_OTP=0
```

See `.env.example` for the full list.

## Build locally

```bash
npm install
npm run build    # vite build + esbuild server
npm start        # node dist/server.cjs
```

Health check: `GET /api/health`

---

## 1) Vercel

Files: `vercel.json`, `api/index.ts`

1. Import the Git repo in Vercel.
2. Framework: Other / Vite.
3. Build command: `npm run vercel-build` (or `npm run build`).
4. Output: `dist` (static) + serverless API via `api/`.
5. Add all env vars under Project → Settings → Environment Variables.
6. For durable data on Vercel, **Supabase or GCS is required** (filesystem is ephemeral).

```bash
npx vercel --prod
```

---

## 2) Render

File: `render.yaml`

1. New → Blueprint → connect repo (uses `render.yaml`), **or**
2. New Web Service → Node
   - Build: `npm install && npm run build`
   - Start: `npm start` / `node dist/server.cjs`
   - Health: `/api/health`
3. Attach a **persistent disk** at `/data` and set `DATA_DIR=/data` if not using Supabase/GCS.
4. Set env vars in the dashboard.

---

## 3) Railway

File: `railway.toml`

1. New Project → Deploy from GitHub.
2. Railway detects Node; or use Dockerfile.
3. Set env vars; optional volume for `/data`.
4. Generate public domain.

```bash
railway up
```

---

## 4) Google Cloud Run

Uses the included `Dockerfile`.

```bash
gcloud builds submit --tag gcr.io/PROJECT_ID/somluul
gcloud run deploy somluul \
  --image gcr.io/PROJECT_ID/somluul \
  --platform managed \
  --region REGION \
  --allow-unauthenticated \
  --set-env-vars "NODE_ENV=production,JWT_SECRET=...,SUPABASE_URL=...,SUPABASE_SERVICE_ROLE_KEY=..."
```

Mount a volume or use Supabase/GCS for persistence.

---

## 5) Docker (any VPS / Fly.io / ECS / Azure / DigitalOcean)

```bash
docker build -t somluul .
docker run -d -p 3000:3000 \
  -e JWT_SECRET=... \
  -e SUPABASE_URL=... \
  -e SUPABASE_SERVICE_ROLE_KEY=... \
  -v somluul-data:/data \
  somluul
```

`Dockerfile` already:
- Builds frontend + server
- Exposes `PORT` (default 3000)
- Healthchecks `/api/health`
- Uses `DATA_DIR=/data` when set

---

## 6) Fly.io

```bash
fly launch
fly secrets set JWT_SECRET=... SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=...
fly deploy
```

Use the Dockerfile; add a volume for `/data` if needed.

---

## 7) Plain VPS (Ubuntu)

```bash
git clone <repo> && cd somluul_prod
npm install && npm run build
# systemd or pm2:
pm2 start dist/server.cjs --name somluul
pm2 save
```

Put Nginx/Caddy in front with HTTPS.

---

## Persistence notes

| Platform | Local `db.json` / uploads | Recommendation |
|----------|---------------------------|----------------|
| Vercel   | Ephemeral                 | **Supabase or GCS required** |
| Render / Railway / Fly / VPS | Persistent disk OK     | Disk **or** Supabase/GCS |
| Cloud Run | Ephemeral by default      | Supabase/GCS or volume |

Without remote storage, posts/files can reset on redeploy on serverless platforms.

## Checklist before go-live

- [ ] `JWT_SECRET` set (long random)
- [ ] `ALLOW_DEV_OTP=0`
- [ ] Supabase bucket `files-bucket` or GCS configured
- [ ] SMTP for email OTP (optional but recommended)
- [ ] `/api/health` returns OK
- [ ] Login, feed post, messenger smoke-tested

No fake deploy targets — only platforms this codebase is wired for.
