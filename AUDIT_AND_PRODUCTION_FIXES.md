# SomLuul — Production Audit & Fix Record

## Completed in this package

### Persistence / multi-instance
- Supabase Postgres `app_state` is now the authoritative production source of truth.
- The old `db.json`/GCS snapshot is no longer used as the production database.
- Production startup fails closed when Supabase credentials are missing.
- API requests hydrate from the authoritative state before executing business logic.
- Writes use optimistic version checks, retries and a three-way merge so concurrent instances do not silently overwrite each other's state.
- A safe one-time JSON-to-Supabase migration command is included.

### Authentication / security
- Production requires a strong JWT secret.
- Production requires explicit `OWNER_USERNAME`, `OWNER_EMAIL`, and `OWNER_PASSWORD` configuration.
- Removed hard-coded owner email/username from server authorization logic.
- Removed browser-profile account resurrection from `restore-session`; a deleted/missing account can no longer be recreated from a JWT plus client-supplied profile data.
- OTP verification uses expiry and production does not expose development OTP responses.
- Passwords use bcrypt; legacy base64 hashes remain readable only for controlled migration compatibility.

### Frontend trust boundaries
- Admin UI checks server-provided role rather than a hard-coded personal email address.
- Removed hard-coded owner email from the owner-login form placeholder.
- Client-side cached session data is not treated as authoritative identity; `/api/auth/me` remains the source of truth when online.

### Fake / misleading behavior
- Removed fabricated security-dashboard startup entries such as `FIREWALL_OK`.
- Existing diagnostic offline printer simulation is explicitly a test mode and is not used as a normal printer result.
- Existing real API-backed feed/chat/story/file paths remain server-driven.

## Important architecture note

The current server has a large legacy route surface that expects one in-memory object shape. The package therefore uses a durable, versioned Postgres state envelope as a compatibility layer. This solves the correctness problem of ephemeral/serverless storage and concurrent snapshot overwrites.

For very large SomLuul traffic, the next scaling phase should move high-write collections to their already-defined normalized Postgres tables (`profiles`, `posts`, `chat_rooms`, `chat_messages`, `notifications`, etc.) and make those routes perform row-level transactional writes. That is a performance/scaling optimization, not a reason to use `db.json` in production.

## Validation performed

- `package.json` parses successfully.
- Migration script passes Node syntax validation.
- TypeScript was invoked with the available global compiler. The environment did not contain installed npm dependencies, so module/type-resolution errors prevented a full compile. No TypeScript parser/syntax error was reported before those missing-dependency errors.
- `npm install --no-audit --no-fund` could not complete within the inspection environment timeout; therefore a full Vite/esbuild production build could not honestly be claimed as verified here.
