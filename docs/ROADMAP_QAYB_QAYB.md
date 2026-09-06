# SomLuul — Nidaam Qayb-Qayb (Roadmap to Platform Scale)

**Ujeeddo:** In app-ku si nidaamsan ugu koro aasaaska Facebook / TikTok / WhatsApp / Telegram — **qayb qayb**, ma aha hal maalin.

**Xaqiiqo:** Ma jiro AI ama ZIP ah oo hal maalin ka dhigaya platform buuxa oo la mid ah kuwaas. Waxaan leenahay **nidaam tallaabooyin ah** oo mid kasta dhammaystiran yahay ka hor inta aanu kan xiga bilaabin.

---

## Heerarka (Phases)

| Phase | Magac | Ujeeddo | Xaalad |
|-------|--------|---------|--------|
| **0** | MVP Feature Surface | Auth, feed, chat, groups, reels, admin | ✅ Done (zip asalka) |
| **1** | Production Hardening | Fail-closed, JWT, health, preflight | ✅ Done |
| **2** | Scale Foundation | Normalized tables, media sign, TURN, cache, `/api/scale/*` | ✅ Done |
| **3** | Dual-Write + Migration | Legacy routes → tables; import xogta hore | ✅ Done |
| **4** | Client Scale Path | UI uses `/api/scale/*` + direct upload + ICE | ✅ Done |
| **5** | Realtime Gateway | WebSocket/SSE solid for chat + presence + calls | ✅ Done |
| **6** | Cutover | Akhris oo dhan tables; `app_state` secondary only | ✅ Done |
| **7** | Fan-out & Jobs | Queue notifications, story TTL, cleanup workers | ✅ Done |
| **8** | Ranking & Growth | Reels ranking, feed ranking, basic recommendations | ✅ Done |
| **9** | Multi-region & Ops | CDN global, replicas, monitoring, rate limits edge | ✅ Done |
| **10** | Hyperscale | Sharding, dedicated services, multi-DC | Long-term |

---

## Phase 3 (hadda) — Dual-Write + Migration

**Maxaa la sameynayaa:**
1. Marka `SCALE_MODE=1`, qorista posts / messages / profiles waxay **sidoo kale** geliyaan tables-ka.
2. Script migration: `app_state` JSON → tables (hal mar).
3. Hubin: xogta jirta ma lumin, tables-ku way buuxaan.

**Done marka:**
- [ ] `SCALE_MODE=1` + schema v2
- [ ] Post cusub → row `posts`
- [ ] Message cusub → row `chat_messages`
- [ ] `npm run migrate:app-state-to-tables` ku guulaysto
- [ ] `/api/scale/feed` muujiyo posts dhab ah

---

## Phase 4 — Client Scale Path

**Maxaa la sameynayaa:**
1. `apiClient` hubiyaa `/api/scale/status`.
2. Haddii scale ON: feed/chat/calls isticmaalaan `/api/scale/*`.
3. Upload: `POST /api/media/sign` → PUT direct → URL post.
4. Calls: `GET /api/webrtc/ice-servers` (TURN).

**Done marka:**
- [ ] Labo browser: post + video + message + call shaqeeyaan scale path
- [ ] Media > few MB ma dhaafo serverless body

---

## Phase 5 — Realtime Gateway

**Maxaa la sameynayaa:**
1. SSE ama WebSocket mid adag (chat messages, typing, presence).
2. Call ring events push (ma aha poll keliya).
3. Reconnect + backoff.

**Done marka:**
- [ ] Message wuxuu u muuqdaa peer < 1s
- [ ] Presence online/offline sax

---

## Phase 6 — Cutover

**Maxaa la sameynayaa:**
1. Akhriska feed/chat/profile **kaliya** tables.
2. `app_state` wuxuu noqdaa backup / settings keliya.
3. Tests concurrency (labo instance Vercel).

**Done marka:**
- [ ] Ma jiro data loss concurrent writes
- [ ] `/api/health` + load test basico OK

---

## Phase 7–10 (kooban)

| Phase | Qaybaha ugu muhiimsan |
|-------|----------------------|
| 7 | Redis queue / cron: notifications fan-out, story expiry, webrtc cleanup |
| 8 | Score reels (views, watch time), feed ranking (friends first + recency) |
| 9 | Cloudflare CDN global, Postgres read replica, Sentry, uptime |
| 10 | Shard by user/room id, separate chat service, multi-region active |

---

## Xeerarka nidaamka (ha jabin)

1. **Hal phase dhammaystiran** ka hor xiga — ha isku darin 5 phase.
2. **Fail closed** — ma jiro fake production data.
3. **Dual-write** ka hor cutover — ha lumin xog.
4. **Health checks** ka dib deploy kasta.
5. **Qor docs** phase kasta marka la dhammeeyo.

---

## Metrics “la tartami karaa” (realist)

| Metric | MVP | Phase 6 | Phase 9 |
|--------|-----|---------|---------|
| Concurrent users | 10s–100s | 1k–10k | 50k+ (with infra) |
| Message latency | poll seconds | <1s realtime | <300ms regional |
| Media | through API | direct + CDN | global CDN |
| Calls | P2P fragile | TURN reliable | TURN + monitoring |
| Data model | JSON blob | normalized | normalized + replicas |

**Facebook-level (malaayiin concurrent)** weli waa Phase 10 + team + budget — ma aha coding session keliya.

---

## Tallaabada xiga adiga

1. Deploy Phase 2+3 zip
2. `SCALE_MODE=1` + schema v2
3. Orod migration
4. Test `/api/scale/feed`
5. Marka OK → bilow Phase 4 (client)

Faahfaahin farsamo: `docs/SCALE_ARCHITECTURE.md`  
Somali activate: `docs/SCALE_ACTIVATE_SO.md`


## Cycle complete (Phases 0–10 foundations)

Application code now has a **full ladder** from MVP → production hardening → normalized data → client scale path → realtime → cutover → jobs → ranking → ops → hyperscale *routing*.

**Remaining work is mostly infrastructure & product iteration**, not missing UI feature surface:
- Wire real CDN, TURN, Redis, shard DBs
- Extract services when load requires it
- Grow ranking signals (watch time, etc.)
- App store / mobile shells as needed

Re-run from Phase 3–4 on each new environment: schema v2 → SCALE_MODE=1 → migrate → verify `/api/ops/ready`.
