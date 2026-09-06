# SomLuul — Push + Deploy (hadda)

## 1) Unzip oo geli folder-ka
```bash
# Windows (PowerShell) tusaale:
cd $HOME\Desktop
# unzip SomLuul_FIXED_VERCEL_2026-09-06.zip
cd SomLuul
```

## 2) GitHub (haddii repo cusub ama update)
```bash
git init
git add .
git commit -m "SomLuul: Vercel soft-fail production guard + owner login JWT message"
# Haddii aad hore u leedahay remote:
# git remote add origin https://github.com/YOUR_USER/YOUR_REPO.git
git branch -M main
git push -u origin main
```
**Ha commit-garayn `.env`** (wuxuu ku jiraa `.gitignore`).

## 3) Vercel Environment Variables (muhiim ka hor redeploy)
Settings → Environment Variables → Production:

| Name | Value |
|------|--------|
| JWT_SECRET | (openssl rand -hex 32) — ugu yaraan 32 xaraf |
| OWNER_USERNAME | tusaale MXDdeeq207 |
| OWNER_PASSWORD | password-kaaga |
| OWNER_EMAIL | email-kaaga (la taliyay) |
| SUPABASE_URL | https://xxxx.supabase.co |
| SUPABASE_SERVICE_ROLE_KEY | service_role key |
| SUPABASE_BUCKET | files-bucket |
| CORS_ORIGINS | https://somluul091.vercel.app,https://somluul.com |
| NODE_ENV | production |
| ALLOW_DEV_OTP | 0 |
| PRODUCTION_PROFILE | basic |

## 4) Supabase (haddii aan weli la sameyn)
1. supabase.com → project
2. SQL Editor → orod `supabase/schema.sql`
3. Storage → Create bucket `files-bucket`

## 5) Deploy / Redeploy
- Haddii Vercel uu ku xiran yahay GitHub: push = auto deploy
- Ama Vercel → Deployments → Redeploy

## 6) Hubi
```
https://YOUR_APP.vercel.app/api/health
```
Waa inay noqoto: `"status":"ok"`, `"jwtConfigured":true`, `"ownerConfigured":true`

Kadib owner login: OWNER_USERNAME + OWNER_PASSWORD.
