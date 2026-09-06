# SomLuul — Real Infrastructure Pack

This folder is **executable infrastructure guidance**.  
Grok/AI cannot log into your Cloudflare, Supabase, or AWS account.  
**You** run these files with your own keys.

## Target architecture

```
                    ┌─────────────────┐
   Users ──────────►│ Cloudflare CDN  │  (TLS, WAF, cache /assets + media)
                    │ + DNS + WAF     │
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              ▼              ▼              ▼
        Web (static)    API fleet      Media origin
        Pages/Vercel    (N replicas)   R2 / Supabase Storage
              │              │
              │         Redis (Upstash)
              │         Pub/sub + jobs
              │              │
              └──────► Postgres shards
                       (Supabase projects 0..N-1)
```

## Order of operations (do in sequence)

| Step | What | Folder / file |
|------|------|----------------|
| 1 | Supabase primary + schema | `scripts/01-supabase-primary.sh` |
| 2 | Optional shard projects | `scripts/02-supabase-shards.sh` |
| 3 | Redis | Upstash dashboard or `docker/docker-compose.yml` |
| 4 | TURN (calls) | `docker/coturn` or Metered/Twilio |
| 5 | API deploy (fleet) | `render/` or Railway |
| 6 | CDN + DNS + WAF | `cloudflare/` |
| 7 | Media bucket public + CDN | scripts + Cloudflare |
| 8 | Verify | `scripts/99-verify.sh` |

## Minimum viable production (1 region)

1. One Supabase project  
2. One API service (Render/Railway)  
3. Cloudflare in front of domain  
4. TURN (Metered free tier OK to start)  
5. Optional Upstash Redis  

## Hyperscale path

1. `SHARD_COUNT=4` + 4 Supabase projects  
2. API replicas ≥ 2 + Redis bus  
3. Separate worker service for jobs  
4. R2/S3 media + custom domain CDN  
5. Multi-region only after single-region is stable  

See `RUNBOOK_SO.md` (Somali) and `RUNBOOK_EN.md`.
