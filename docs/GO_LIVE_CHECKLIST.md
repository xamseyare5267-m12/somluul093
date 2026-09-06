# SomLuul — Go-Live Checklist (pre-deploy)

## Honest comparison

| | SomLuul (this package) | Facebook / TikTok / WA / Telegram |
|--|------------------------|----------------------------------|
| Feature surface (posts, chat, calls, groups, reels…) | Yes | Yes + much more |
| Production hardening (JWT, fail-closed, health) | Yes | Yes |
| Normalized DB + dual-write + ranking | Yes | Yes (far more advanced) |
| Realtime SSE + optional Redis | Yes | Dedicated fleets |
| Global CDN / multi-DC / ML ranking | **You must wire infra** | Built-in at scale |
| Billions of users | **No** | Yes |

**Verdict:** Ready to **launch as a real social web app** after Supabase + env + host.  
**Not** a byte-for-byte clone of FB/WA/TG/TikTok scale.

## Code readiness (automated)

- [x] Preflight script passes
- [x] Scale routes, cutover, ranking, jobs, ops, realtime, client scale path
- [x] Root `Dockerfile` for Railway/Render
- [x] `vercel.json` + `api/index.ts`
- [x] No production fake starter data in app code

## You must complete before public users

- [ ] Supabase schemas applied
- [ ] `files-bucket` public
- [ ] Env secrets set (`JWT_SECRET`, Supabase, CORS, owner)
- [ ] `SCALE_MODE=1`
- [ ] Deploy Railway **or** Render **or** Vercel(+API host)
- [ ] `GET /api/ops/ready` → 200
- [ ] `npm run migrate:app-state-to-tables` (if legacy data)
- [ ] Two-user smoke test: signup, post+media, message, call
- [ ] TURN for mobile calls
- [ ] Cloudflare DNS/SSL (recommended)
- [ ] Redis if replicas > 1

## Smoke test script

```bash
export API_BASE=https://your-api
bash infra/scripts/99-verify.sh
```

## Blockers that are NOT code bugs

Missing cloud accounts, domain, TURN provider, CDN — cannot be shipped inside a ZIP.
