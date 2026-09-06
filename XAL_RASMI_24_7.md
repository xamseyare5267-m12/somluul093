# SomLuul — Xal Rasmi ah 24/7 (WhatsApp-level)

## Maxay Vercel u fashilmay?

| Shuruud | Vercel Hobby (serverless) | Always-on (Railway / Render / VPS) |
|---------|---------------------------|-------------------------------------|
| Cold start | Haa (ilbiriqsiyo) | Maya — process-ku wuu ordaa |
| Posts 24/7 | JSON file wuu lumin karaa instances dhexdooda | Volume + 1 process = joogto |
| Chat degdeg ah | SSE/WebSocket ma taageerto si fiican | SSE shaqaynaysa |
| Voice/Video call signaling | Instances kala duwan ma is-dhexgalaan | 1 server = signaling sax ah |
| Files / media | Waa suurtagal (Supabase Storage) | Isla + disk volume |

**Xaqiiqo:** App social + chat + WebRTC **ma noqon karto** WhatsApp-kalinka haddii backend-ku yahay serverless oo JSON file ku kaydsan.

---

## Xalka rasmi ah (2 qaybood)

### A) BACKEND always-on (waa qasab)
Deploy Express server-ka **Railway** ama **Render** (Docker).

- 1 replica kaliya (signaling + SSE)
- Disk volume `/data` (posts & messages ma dhumin)
- Supabase Storage media (sawir, video, voice, docs)

### B) FRONTEND (ikhtiyaar)
- **Fudud:** Isla Railway — frontend + API meel keliya (ugu fiican bilowga)
- **ama** Vercel static + `VITE_API_URL=https://YOUR-railway-url`

---

## Tallaabooyinka deploy (Railway) — ugu degdeg iyo ugu sugnaan

### 1. Supabase (hadda hore u leedahay)
1. Dashboard → Storage → bucket **`files-bucket`** (private)
2. (Ikhtiyaar mustaqbalka) SQL Editor → orod `supabase/schema.sql`
3. Key-yada: `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`

### 2. GitHub
1. Push dhammaan code-ka (hotfix + Dockerfile + railway.toml)
2. Repo private ama public

### 3. Railway.app
1. https://railway.app → New Project → Deploy from GitHub
2. Door repo-ga SomLuul
3. Settings → **Generate Domain** (tusaale: `somluul-production.up.railway.app`)
4. Variables (Environment):

```
NODE_ENV=production
PORT=3000
DATA_DIR=/data
JWT_SECRET=<openssl rand -hex 32>
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
OWNER_USERNAME=...
OWNER_PASSWORD=...
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=...
SMTP_PASS=...
MAIL_FROM="SomLuul" <your@gmail.com>
ALLOW_DEV_OTP=0
```

5. **Volume:** Add Volume → mount path `/data` (ugu yaraan 1 GB)
6. Deploy → sug build-ka dhammaado
7. Fur: `https://YOUR.up.railway.app/api/health`  
   Waa inuu yimaado: `"status":"ok","persistence":true`

### 4. Domain / Link share
- Custom domain: Railway → Settings → Domains → ku dar `app.somluul.com`
- Link kasta (`https://app.somluul.com/?tab=feed`) wuxuu furmaa taleefan kasta iyo browser kasta **1 ilbiriqsi** gudahood (CDN SSL automatic)

### 5. (Ikhtiyaar) Frontend Vercel uun
Haddii aad rabto Vercel frontend:
1. Vercel project → Environment Variable:
   `VITE_API_URL=https://YOUR.up.railway.app`
2. Redeploy frontend
3. API oo dhan waxay u jeedaan Railway (ma jiro cold start)

---

## Wixii shaqaynaya marka always-on la isticmaalo

| Feature | Natiijo |
|---------|---------|
| Posts qoraal/sawir/video | 24/7, hard refresh ka dib weli joogaan |
| Feed degdeg | < 1–2s (ma jiro cold start) |
| Fariimo text/image/voice/file | SSE + poll; ma luminayaan (volume) |
| Voice call | WebRTC + TURN; is-maqal |
| Video call | Camera + mic; is-arag + is-maqal |
| Profile magac/sawir | Null-safe; magac sax |
| Share link | Deep-link `?tab=profile&user=ID` |
| Notifications | 15s poll (network ma buuxdo) |

---

## Voice / Video — si WhatsApp-u u shaqeeyo

Code-ka WebRTC waa jira (STUN Google + TURN openrelay.metered.ca).

Si loo xoojiyo quality:
1. Always-on backend (signaling ma lumin)
2. HTTPS domain (browser-ku wuxuu u baahan yahay secure context getUserMedia)
3. (Ikhtiyaar paid) TURN gaar ah: Metered.ca / Twilio → env:

```
WEBRTC_TURN_URL=turn:your.turn.server:443
WEBRTC_TURN_USER=...
WEBRTC_TURN_PASS=...
```

---

## Maxaa laga fogaanayaa

1. ❌ Backend Vercel Hobby serverless — dib u soo noqon doona timeouts
2. ❌ Replicas > 1 Railway-ka bilowga — signaling wuu kala jaan-qaadi
3. ❌ Volume la’aan — restart ka dib data /tmp way lumin kartaa
4. ❌ JWT_SECRET daciif ah

---

## Checklist ka dib go-live

- [ ] `/api/health` → status ok, persistence true, posts > 0 ka dib markaad post gasho
- [ ] Post sawir → refresh → weli jira
- [ ] 2 taleefan: fariin → waa soo dhacdaa < 3s
- [ ] Voice call: labada dhinac way maqlaan
- [ ] Video call: labada dhinac way arkaan + maqlaan
- [ ] Link `https://YOUR-domain/?tab=feed` phone + desktop
- [ ] Profile user kale: magac sax, sawir, ma jiro console `split` error

---

## Qiimaha qiyaasta

| Platform | Qiimo bilow | Ugu fiican |
|----------|-------------|------------|
| Railway Hobby | ~$5/mo + usage | Always-on fudud |
| Render Starter | ~$7/mo | Docker + disk |
| VPS (Hetzner) | ~€4/mo | Control buuxa |
| Vercel | Free frontend kaliya | Static + CDN |

**Talo:** Bilow **Railway all-in-one** (frontend+API). Marka traffic kordho, kala saar frontend Vercel + API Railway.

---

## Faylasha cusub ee package-kan

- `Dockerfile` — container production
- `railway.toml` — Railway config
- `render.yaml` — Render alternative
- `supabase/schema.sql` — Postgres mustaqbalka
- Hotfixes: posts timeout, profile split, notifications 15s, DATA_DIR volume
- `src/lib/apiClient.ts` — `VITE_API_URL` support
- `MessengerSection` — EventSource uses API base

---

Haddii aad raacdo tallaabooyinkan, web app-ku wuxuu noqonayaa **24/7**, posts ma dhuminayaan, fariimaha iyo calls-ku way is-heli karaan si casri ah. Vercel serverless keliya ma aha xal dhab ah shaqadan.
