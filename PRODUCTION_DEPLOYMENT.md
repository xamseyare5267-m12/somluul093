# SomLuul – Production Deployment Checklist

## Required Vercel environment variables

Set these in **Vercel → Project → Settings → Environment Variables** for Production (and Preview if you test there):

```text
JWT_SECRET=<long-random-secret-at-least-32-characters>
OWNER_USERNAME=MXDdeeq207
OWNER_PASSWORD=<strong-owner-password>
```

If persistent cloud backup is enabled, also set:

```text
SUPABASE_URL=https://<project>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<server-only-service-role-key>
```

Optional storage/mail variables are documented in `.env.example`.

## Important

- Never put `JWT_SECRET`, `OWNER_PASSWORD`, or `SUPABASE_SERVICE_ROLE_KEY` in frontend code.
- Do not use `Bearer <user-id>`. Protected API calls use a signed JWT only.
- The Service Worker deliberately bypasses `/api/*` so it cannot cache/replay authenticated requests.
- API responses are marked `no-store`.
- The Vercel API adapter waits for server initialization and the remote DB restore before serving requests.
- `data/db.json` is only a local/serverless snapshot. For real multi-instance production persistence, use the configured Supabase backup/database layer; do not treat the Vercel filesystem as durable storage.

## After deployment

1. Open `/api/health` and confirm `{ "status": "ok" }`.
2. Log in once.
3. Refresh the browser.
4. Open Feed, Profile, Messenger, Notifications and Owner/Admin pages as appropriate.
5. In DevTools → Network, verify protected requests contain:
   `Authorization: Bearer <JWT>`.
6. Confirm `/api/chat/messages`, `/api/notifications`, and `/api/profiles` do not alternate between 200 and 401 for the same valid session.
7. If a previous Service Worker is installed, hard refresh once after deployment so the new `somluul-static-v3` worker activates.

## Vercel 500 / black page fix (Aug 2026)

If you previously saw:
- Black page
- Console: Failed to load resource 500 on `/api/remote-config`, `/api/landing-settings`
- Logs: `ERR_MODULE_NOT_FOUND: Cannot find module '/var/task/server'`

This was caused by the serverless function not finding `server.ts`.

**Fixed in this version**:
- `api/index.ts` now loads the pre-built `dist/server.cjs` (created by `npm run build`) via `createRequire`, with fallback.
- `vercel.json` includes `functions.includeFiles` for the bundle + source + data.

After pulling this version, just redeploy. No other changes needed beyond the required environment variables.
