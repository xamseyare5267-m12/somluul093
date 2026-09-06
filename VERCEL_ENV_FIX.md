# SomLuul — Vercel Fix (Owner Login + API 500)

## Problem
- All `/api/*` return 500
- Owner login fails
- Page shows "Offline" or React error #31

**Root cause:** Required environment variables are missing or incomplete on Vercel. The server was previously hard-crashing on boot.

## Required Environment Variables (Vercel → Project → Settings → Environment Variables)

Set these for **Production** (and Preview if you use it):

| Variable | Required | Example / how to get |
|----------|----------|----------------------|
| `JWT_SECRET` | **YES** | Generate: `openssl rand -hex 32` (64 hex chars). Must be **≥ 32 characters**. |
| `OWNER_USERNAME` | **YES** | e.g. `MXDdeeq207` (exact username you type in the form) |
| `OWNER_PASSWORD` | **YES** | Strong password you will use for owner login |
| `OWNER_EMAIL` | Recommended | e.g. `qaalidyare6130@gmail.com` |
| `SUPABASE_URL` | **YES** | `https://xxxxx.supabase.co` from Supabase project settings |
| `SUPABASE_SERVICE_ROLE_KEY` | **YES** | Service role key (secret) from Supabase → Settings → API |
| `SUPABASE_ANON_KEY` | Optional | Anon key from same page |
| `SUPABASE_BUCKET` | Recommended | Create a storage bucket named `files-bucket` (or any name you set here) |
| `CORS_ORIGINS` | Recommended | `https://somluul091.vercel.app,https://somluul.com,https://www.somluul.com` (your real URLs) |
| `NODE_ENV` | Recommended | `production` |
| `ALLOW_DEV_OTP` | Recommended | `0` |
| `PRODUCTION_PROFILE` | Optional | Leave **empty** or `basic` for launch. Do **not** set `full` until Redis/TURN/LiveKit are ready. |
| `SCALE_MODE` | Optional | `0` for simple launch, or `1` after running scale SQL schema |

### Optional later
- Redis / Upstash, TURN, LiveKit, Gemini, SMTP, Stripe — only when you enable full scale features.

## Supabase setup (minimum)
1. Create project at https://supabase.com
2. Run SQL from `supabase/schema.sql` (SQL Editor)
3. Storage → New bucket → name `files-bucket` (or match `SUPABASE_BUCKET`)
   - For public media you can enable Public bucket, or keep private and use signed URLs
4. Copy Project URL + service_role key into Vercel env

## After setting env vars
1. Vercel → Deployments → **Redeploy** (or push a new commit)
2. Open `https://YOUR_APP.vercel.app/api/health`
   - Expect `"status":"ok"` and `"jwtConfigured":true`
   - If `configErrors` is non-empty, fix those variables
3. Owner login with exact `OWNER_USERNAME` / `OWNER_PASSWORD`

## Local test before deploy
```bash
cp .env.example .env
# fill JWT_SECRET, OWNER_*, SUPABASE_*
npm install
npm run build
npm start
```

## Notes
- Username comparison is case-insensitive.
- Password must match `OWNER_PASSWORD` env exactly (or the stored hash after first successful login).
- Do not commit `.env` to git.
