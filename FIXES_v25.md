# SomLuul v25.2 — production fixes

## Fixed (code)
1. DB memory cache cleared after Supabase/GCS restore (empty feed root cause)
2. GET /api/me + GET /api/users aliases (stop 404 in logs)
3. GET /api/profiles and /api/profiles/:id public (stop 401 when logged out)
4. Feed: error state + retry button
5. Profile: clear 401/404 messages
6. Reels: parse `{ data: [] }` posts response (was always empty)
7. Landing stats: real counts from /api/health (removed fake 100M+/10B+)
8. File upload: await cloud backup before response (media survives cold start)
9. Health: returns posts, profiles, persistence

## REQUIRED for production (not optional)
Vercel Environment Variables:
- JWT_SECRET (long random, never change after launch)
- SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
- Storage bucket name: **files-bucket**
- OWNER_USERNAME / OWNER_PASSWORD
- ALLOW_DEV_OTP=0

Without Supabase (or GCS), posts/users **will still disappear** on cold starts.

## Honest limits (not bugs — need external services)
| Feature | Needs |
|---------|--------|
| Android APK / iOS IPA download | Build + put files in public/downloads or dist_electron |
| Email OTP | SMTP_HOST, SMTP_USER, SMTP_PASS |
| SMS OTP | TEXTBELT_KEY or other SMS provider |
| Card wallet top-up | STRIPE_SECRET_KEY |
| Reliable video calls (NAT) | WEBRTC_TURN_URL + credentials |
| AI sexual-media filter | GEMINI_API_KEY or GOOGLE_API_KEY |

Windows download falls back to a real .bat launcher that opens the web app.

## Deploy checklist
1. Unzip → push GitHub
2. Vercel import + env vars above
3. Supabase: create private bucket `files-bucket`
4. Deploy → open /api/health → persistence:true
5. Register → post image → hard refresh → post still there
6. Hard refresh browser (clear SW cache) after deploy
