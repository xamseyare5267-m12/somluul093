# SomLuul — Production Release

## Local development

```powershell
Copy-Item .env.example .env
npm install
npm run build
npm start
```

For local development you may leave `PRODUCTION_PROFILE` unset and use the normal development fallback paths.

## Commercial production

Set `NODE_ENV=production` and `PRODUCTION_PROFILE=full`. The server intentionally refuses to boot if the required production infrastructure is missing.

Required services:

- Supabase PostgreSQL + Storage
- HTTPS domain/CORS
- Redis + Upstash REST rate limiting
- CDN
- TURN
- LiveKit
- Stripe (if monetization is enabled)
- payout provider
- Gemini + the included media-moderation worker
- SMTP/SMS provider for the verification channels you enable

Run:

```powershell
npm install
npm run verify
npm start
```

## Database

Run these in order in Supabase:

1. `supabase/schema.sql`
2. `supabase/schema_v2_scale.sql`

The production server uses the Supabase service-role key server-side. Never expose that key to the browser.

## Production live

Live video uses the LiveKit SFU through `/api/live/start` and `/api/live/:id/join`. Browser P2P fan-out is not the production path.

## Media moderation

Deploy `services/media-moderation-worker` as a private HTTPS service and configure its `/moderate` endpoint in `MEDIA_MODERATION_WEBHOOK_URL`.

## Final launch instructions

Read `PRODUCTION_GO_LIVE.md` and `FINAL_AUDIT_2026-08-30.md` before publishing.
