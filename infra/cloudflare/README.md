# Cloudflare CDN + DNS + WAF

## 1. DNS
- Add site `yourdomain.com`
- Proxied (orange cloud) records:
  - `@` → your web host (Vercel/Pages IP or CNAME)
  - `api` → API host (Render/Railway CNAME) **proxied** or DNS-only if WebSocket issues
  - `cdn` → R2 custom domain or Supabase storage public host

## 2. SSL
- SSL/TLS mode: **Full (strict)**
- Always Use HTTPS: On

## 3. Caching
- Cache Rules:
  - URI Path starts with `/assets/` → Cache everything, Edge TTL 1 month
  - URI Path starts with `/api/` → Bypass cache
- For media subdomain: Cache everything with respect to origin Cache-Control

## 4. WAF rate limits (suggested)
| Rule | Match | Rate | Action |
|------|-------|------|--------|
| Auth | `http.request.uri.path contains "/api/auth"` | 20 / 1 min / IP | Block 10 min |
| API | `http.request.uri.path starts with "/api/"` | 300 / 1 min / IP | Managed challenge |
| Login abuse | path contains `login` or `otp` | 10 / 1 min | Block |

## 5. Env on API
```
CDN_BASE_URL=https://cdn.yourdomain.com
CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

## 6. R2 media (optional, best CDN)
1. Create R2 bucket `somluul-media`
2. Public access via custom domain `cdn.yourdomain.com`
3. Either migrate uploads to R2 or put Cloudflare in front of Supabase storage URL

## Terraform (optional)
See `terraform/cloudflare.tf` — requires `CLOUDFLARE_API_TOKEN` and zone id.
