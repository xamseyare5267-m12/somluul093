# SomLuul Global Production Architecture

This package is a hardened production release candidate. It removes unsafe defaults and adds a normalized PostgreSQL schema for high-volume domains, but the existing compatibility API still has legacy routes that read/write the `app_state` adapter. Those routes must not be described as row-level transactional just because the normalized tables exist.

## Required production services
- Vercel (or another multi-instance Node runtime)
- Supabase Postgres + Storage
- Redis-compatible distributed rate limiter at the edge/API layer
- SMTP and/or SMS provider for verification
- TURN service for reliable WebRTC calls
- Monitoring/error tracking
- DNS/TLS/CDN

## Release gate
A deployment is allowed only after:
1. database migrations complete successfully;
2. `npm run preflight` passes;
3. TypeScript check passes;
4. production build passes;
5. `/api/health` reports `ready: true`;
6. authentication, uploads, posts, comments, follows, messaging and notifications are smoke-tested;
7. load/concurrency tests pass for the expected launch traffic;
8. backups and restore are verified.

A ZIP cannot validate provider credentials or global network behavior. Therefore no honest software release can promise zero errors in every country. This package is designed to fail closed rather than silently use fake/local production state.
