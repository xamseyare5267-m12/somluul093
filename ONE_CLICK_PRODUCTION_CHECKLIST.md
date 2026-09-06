# SomLuul — One-Deployment Production Checklist

This repository is the application release. External production infrastructure must already exist; credentials are never embedded in the ZIP.

## Required Vercel environment variables
- SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY (server only)
- SUPABASE_ANON_KEY (only if the browser integration requires it)
- SUPABASE_BUCKET
- JWT_SECRET (32+ random characters)
- CORS_ORIGINS (HTTPS origins only)
- SMTP_* or a real email provider
- TWILIO_* (if phone OTP is enabled)
- STRIPE_* (if payments are enabled)
- TURN/STUN configuration for calls, if used by the client

## Database
Run `supabase/schema.sql` once in the target Supabase project before the first production request.

## Build
Use the committed Bun lockfile in CI/deployment:

```bash
bun install --frozen-lockfile
bun run preflight
bun run lint
bun run build
```

The package intentionally contains no production `.env` and no real provider credentials.

## Release verification
After deployment, verify `/api/health` reports `ready: true`. Then test signup/login, profile, feed, post creation, upload, comments/reactions, follows, chat, notifications and logout from two separate browsers/devices.

## Important
A ZIP cannot create or validate third-party accounts, DNS, TLS, SMS/email deliverability, payment accounts, TURN servers, CDN behavior, or global network paths. The application therefore fails closed when required production configuration is missing instead of silently falling back to fake/local services.
