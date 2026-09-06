# SomLuul — GitHub + Vercel (production)

## 1. GitHub
```bash
cd m888
git init
git add .
git commit -m "SomLuul production ready"
# create repo on GitHub, then:
git remote add origin https://github.com/YOUR_USER/somluul.git
git branch -M main
git push -u origin main
```

**Do not commit `.env`** (already in `.gitignore`).

## 2. Vercel
1. https://vercel.com → Add New Project → Import GitHub repo
2. Framework: Other / configure:
   - Build Command: `npm run build`
   - Output Directory: `dist`
3. **Environment Variables** (Settings → Environment Variables):

| Name | Required | Example |
|------|----------|---------|
| `NODE_ENV` | yes | `production` |
| `JWT_SECRET` | **yes** | long random 32+ chars |
| `OWNER_USERNAME` | yes | your owner username |
| `OWNER_PASSWORD` | yes | strong password |
| `OWNER_PHONE` | no | `+252615666561` |
| `ALLOW_DEV_OTP` | yes | `0` |
| `GCS_BUCKET_NAME` | **recommended** | your bucket |
| `GCP_PROJECT_ID` | with GCS | project id |
| `SUPABASE_URL` | **or** GCS | https://xxx.supabase.co |
| `SUPABASE_SERVICE_ROLE_KEY` | with Supabase | service role key |
| `SUPABASE_ANON_KEY` | optional | anon key |
| `SMTP_HOST` | for email OTP | smtp.gmail.com |
| `SMTP_USER` / `SMTP_PASS` | email | Gmail app password |
| `TEXTBELT_KEY` | free SMS | `textbelt` |
| `STRIPE_SECRET_KEY` | paid wallet | sk_live_... |

## 3. CRITICAL — data persistence on Vercel
Vercel serverless filesystem is **ephemeral**. Without **GCS or Supabase**, posts/users can reset when instances restart.

**Minimum for public launch:** set `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` **or** `GCS_BUCKET_NAME`.

## 4. After deploy
- Open `https://YOUR_PROJECT.vercel.app/api/health` → `{ "ok": true }`
- Register a normal user, post, message
- Owner login with `OWNER_USERNAME` / `OWNER_PASSWORD`

## 5. Domain somluul.com
Vercel → Project → Domains → add `somluul.com` + `www` → DNS as instructed.
