# SomLuul Commercial Production Gate

Run `npm install`, `npm run preflight`, `npm run lint`, `npm run build`.

For the full profile set:
- NODE_ENV=production
- PRODUCTION_PROFILE=full
- SCALE_MODE=1
- SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / SUPABASE_BUCKET
- JWT_SECRET (32+ random chars) / OTP_SECRET
- CORS_ORIGINS=https://somluul.com,https://www.somluul.com
- UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN
- TURN_URL / TURN_USERNAME / TURN_CREDENTIAL
- REQUIRE_MEDIA_MODERATION=1
- GEMINI_API_KEY
- MEDIA_MODERATION_WEBHOOK_URL (+ optional token)
- LIVE_PROVIDER=livekit + LIVEKIT_URL/API_URL/API_KEY/API_SECRET
- STRIPE keys for real wallet topups
- real SMS/SMTP credentials for verification

Normalized Postgres is the production path for feed, messaging, wallet and live metadata. `app_state` remains migration compatibility storage.
Persistent realtime should run on a long-lived Node service (Railway/Fly/Cloud Run/ECS) rather than short-lived serverless SSE.
The repository cannot create third-party accounts, DNS/TLS, payment contracts, SMS/SMTP, TURN, LiveKit, moderation provider, monitoring or legal/compliance approvals.
