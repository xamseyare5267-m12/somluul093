# SomLuul — Production Hardening Release

This release is intended to reduce deployment/runtime surprises and remove known fabricated defaults. It does **not** promise zero incidents; production systems require monitoring and provider configuration.

## What changed

- Fixed the malformed `.env.example` entry where `TWILIO_FROM_NUMBER` was merged with `CORS_ORIGINS`.
- Removed fabricated printer IP defaults (`192.168.1.100`). Printer configuration now starts unconfigured.
- Removed fabricated wallet starter coins. New wallets start at zero; coins must come from a real purchase/earning flow.
- Upload filtering now rejects unsupported extensions instead of accepting everything.
- Removed SVG/archive formats from the generic upload allowlist to reduce XSS/archive abuse risk.
- Reduced JSON/urlencoded request-body limits from 100 MB to 2 MB.
- Added request IDs (`X-Request-Id`) for production troubleshooting.
- Added lightweight per-instance API/auth rate limiting. Use an edge/distributed limiter for large multi-instance deployments.
- Added a final Express error boundary that returns safe errors and a request ID instead of stack traces.
- Added `/api/health` Supabase connectivity verification and a `ready` signal that reflects the actual database check.
- Added `npm run preflight` and `npm run verify`.
- Added GitHub Actions verification for install, preflight, TypeScript checking and production build.
- Added `supabase/schema.sql` checks for core production tables.

## Deployment contract

Production requires at minimum:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `JWT_SECRET` (32+ random characters)
- `CORS_ORIGINS`
- owner credentials if owner administration is enabled

Run the Supabase schema before the first production deployment. Never put the service-role key in browser code.

## Important architecture note

The current compatibility API still uses a single `app_state` JSONB record as its application-state adapter. The normalized tables in `supabase/schema.sql` are present for the production data model, but all routes have **not** yet been cut over to row-level transactional tables. A future migration should move high-write domains (posts, comments, follows, chat messages, notifications, wallets/payments) to those normalized tables and use database transactions/constraints directly.

## Verification

Use:

```bash
npm install
npm run preflight
npm run lint
npm run build
npm start
```

Then verify:

```text
GET /api/health
```

A production-ready response must report `ready: true` and `supabaseHealth.ok: true`.

## What cannot be guaranteed from a ZIP alone

- Supabase credentials and schema cannot be validated without access to the actual project.
- Stripe/Twilio/OAuth credentials cannot be validated without their real accounts.
- Vercel's exact deployment environment cannot be reproduced locally.
- Large media uploads should use direct object-storage uploads rather than routing very large bodies through a serverless API.
