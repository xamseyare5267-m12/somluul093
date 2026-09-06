# Phase 9 — Multi-region & Ops

## Endpoints
| Route | Purpose |
|-------|---------|
| `GET /api/health` | Lightweight readiness + counts |
| `GET /api/ops/health` | Deep health (DB, scale, redis, turn, CDN, metrics) |
| `GET /api/ops/ready` | 200/503 for load balancers |
| `GET /api/ops/metrics` | Latency p50/p95/p99, counters (optional `OPS_METRICS_TOKEN`) |

## Middleware
- Security headers (HSTS in production, nosniff, frame options)
- Cache-Control for static assets (immutable)
- Per-request latency sampling

## CDN checklist
1. Put Cloudflare / CloudFront / Fastly in front of the web origin
2. Set `CDN_BASE_URL` to the media domain in front of the storage bucket
3. Cache `/assets/*` aggressively; never cache authenticated `/api/*` by default
4. Enable WAF rate limits at the edge (auth paths especially)

## Multi-region (practical path)
1. **Primary region**: API + Postgres (Supabase) + Redis
2. **Edge**: CDN for static + media
3. **Read replicas** (Supabase Pro / Postgres): point reporting read paths later
4. **SSE/realtime**: sticky sessions or Redis bus (Phase 7) across API replicas
5. **Health**: load balancer probes `/api/ops/ready`

## Monitoring
- Uptime robot / Better Stack → `/api/ops/ready`
- Log drain from Railway/Render/Vercel
- Optional: set `OPS_METRICS_TOKEN` and scrape `/api/ops/metrics`

## Edge rate limits
In-app limits remain; for global protection use Cloudflare Rules:
- `/api/auth/*` stricter
- `/api/*` standard
