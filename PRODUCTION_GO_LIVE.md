# SomLuul — Production Go-Live Contract

This release is **code-hardened for a commercial production deployment**. It intentionally fails closed when required production services are missing. A ZIP cannot create third-party accounts, DNS, payment-provider merchant status, or regulated payout access.

## Required production topology

- Web frontend: Vercel/Cloudflare Pages (static assets)
- API + SSE: persistent Node container on Railway/Render/Fly.io/Cloud Run
- Database: Supabase PostgreSQL (`schema.sql` then `schema_v2_scale.sql`)
- Object storage: Supabase Storage, private bucket
- CDN: Cloudflare/Fastly/CloudFront in front of approved media delivery
- Distributed cache/rate limiting: Redis + Upstash REST
- Calls: TURN credentials
- Live: LiveKit SFU
- Payments: Stripe account + verified webhook
- Payouts: a legally supported bank/mobile-money payout provider connected through `PAYOUT_PROVIDER_URL`
- Media moderation: Gemini + the included `services/media-moderation-worker`

## Production environment

Set `PRODUCTION_PROFILE=full`. The API refuses to start if the critical production controls are absent:

- Supabase URL + service role
- HTTPS CORS origins
- scale mode / normalized repositories
- Redis + Upstash rate limiter
- TURN
- LiveKit
- strict media moderation
- automated payout provider
- CDN base URL

## Database migration

Run the two SQL files in order in the production Supabase SQL editor:

1. `supabase/schema.sql`
2. `supabase/schema_v2_scale.sql`

The second migration enables RLS on service-owned tables. The server uses the service-role key and browser clients must not receive that key.

## Media moderation worker

Build and deploy `services/media-moderation-worker/Dockerfile` as a private HTTPS service. Set its `/moderate` endpoint as `MEDIA_MODERATION_WEBHOOK_URL` in SomLuul. The worker uses Supabase service credentials and Gemini, samples video frames with FFmpeg, and fails closed on provider errors.

## Payments / wallet

Stripe webhook credits are idempotent. The normalized wallet uses PostgreSQL row locking and an RPC transaction so balance/coin changes cannot race each other.

Withdrawals are also created by a PostgreSQL transaction before dispatching to the external payout provider. Every payout request carries a stable `idempotencyKey` equal to the withdrawal ID.

## Live video

Production live uses LiveKit, not browser-to-browser P2P fan-out. The server creates a LiveKit room and issues short-lived participant tokens. The frontend uses `livekit-client` with adaptive streaming/dynacast.

## Verification

Run on a machine with registry access:

```bash
npm install
npm run verify
```

Then perform the external smoke tests listed in `docs/GO_LIVE_CHECKLIST.md`.

## Important boundary

This release is not a claim that SomLuul has the same global capacity, recommendation models, moderation workforce, legal coverage, or traffic footprint as Meta/TikTok/Telegram. It is a real production architecture and implementation with explicit external service contracts, fail-closed configuration, normalized transactional storage, SFU live media, distributed abuse controls, and deployment gates.
