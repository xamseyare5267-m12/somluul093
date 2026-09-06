# SomLuul — Production Database Setup

SomLuul's production API now treats **Supabase Postgres as the authoritative database**. The old `db.json`/GCS snapshot is not a production source of truth.

## 1. Create the database

1. Create a Supabase project.
2. Open **SQL Editor**.
3. Run `supabase/schema.sql` in full.
4. Confirm the `app_state` table exists.

## 2. Configure the server

Set these server-only environment variables:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `JWT_SECRET` (32+ random characters)
- `CORS_ORIGINS` (your real web origins)

Never expose `SUPABASE_SERVICE_ROLE_KEY` to the browser or commit it to Git.

## 3. Import an existing JSON database (optional)

If you already have a legacy `data/db.json` containing real production data:

```bash
npm run migrate:json-to-supabase
```

The migration refuses to overwrite an existing `app_state` row.

## 4. Multi-instance behavior

Each API request hydrates the authoritative state from Postgres. Writes use optimistic version checks and a three-way merge with retries. This prevents the classic serverless failure where instance A and instance B each write a different stale `db.json` snapshot and one silently destroys the other's changes.

## 5. Important limitation

The current API keeps a compatibility state object because the existing server has many routes. The next architectural phase should normalize high-volume tables (posts, comments, reactions, follows, messages, notifications) into their dedicated Postgres tables and move those endpoints to row-level transactions. That is the correct long-term scaling design; the compatibility layer is intentionally not described as a replacement for those normalized tables.
