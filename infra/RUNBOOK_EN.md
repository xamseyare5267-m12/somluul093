# SomLuul — Real Infrastructure Runbook

AI cannot create your cloud accounts. Run these steps with your credentials.

## Minimum production
1. **Supabase** — apply `schema.sql` + `schema_v2_scale.sql`; public bucket `files-bucket`
2. **API** — Render/Railway, `SCALE_MODE=1`, secrets from `.env.example`
3. **Web** — Vercel/Pages; `VITE_API_URL` if split
4. **Cloudflare** — DNS, Full strict SSL, cache `/assets`, bypass `/api`, WAF on `/api/auth`
5. **TURN** — Metered/Twilio or `docker compose --profile turn`
6. **Redis** — Upstash when `numInstances > 1`
7. **Migrate** — `npm run migrate:app-state-to-tables`
8. **Verify** — `API_BASE=https://api... bash infra/scripts/99-verify.sh`

## Fleet
Use `infra/render/render.yaml` (2 web instances + worker). Requires `REDIS_URL`.

## Shards
`bash infra/scripts/02-supabase-shards.sh` then create N projects and set `SHARD_N_*`.

## CDN media
Cloudflare R2 custom domain → `CDN_BASE_URL`.

## Files
| Path | Purpose |
|------|---------|
| `docker/docker-compose.yml` | Redis, coturn, optional API |
| `render/render.yaml` | Managed fleet |
| `cloudflare/` | CDN/WAF notes + Terraform |
| `scripts/01-*.sh` | Supabase primary |
| `scripts/02-*.sh` | Shard env skeleton |
| `scripts/99-verify.sh` | Post-deploy checks |
