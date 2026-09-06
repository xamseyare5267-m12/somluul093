# SomLuul — Full-Scale Platform Progress

## Phase status

| Phase | Status | Notes |
|-------|--------|-------|
| 1 Audit | Done | Express+Vite hybrid, JSON DB + optional Supabase/GCS |
| 2 Architecture | In progress | Preserved modules; added social APIs |
| 3 Auth & sessions | Improved | Signup open, session restore, tab persistence |
| 4 DB & storage | Improved | reports, blockedPairs, friends helpers |
| 5 Feed / Profile / Graph | Improved | Follow, friend requests, reactions base, deep links |
| 6 Messenger / Realtime | Existing | WebSocket paths present; needs hardening |
| 7 Stories / Reels / Video | Partial | Stories + FB media limits + safety |
| 8 Groups / Pages / Live | Partial | Live section + platform center exist |
| 9 Marketplace / Monetization | Partial | Listings + wallet architecture |
| 10 Notifications / Search | Improved | Global `/api/search`, report API |
| 11 Security | Improved | Content safety, auth middleware, owner isolation |
| 12 Performance | Pending | Pagination/virtualization next |
| 13 Mobile / PWA / Desktop | Improved | Mobile bottom nav, PWA assets, Electron |
| 14 Testing | Pending | |
| 15 Production build | Supported | vercel.json + esbuild server bundle |

## New / upgraded in this build

- Friend request API (`POST /api/profiles/:id/friend`)
- User block/unblock pairs
- Content reports (`POST /api/reports`)
- Global search (`GET /api/search`)
- SPA deep links (`?tab=&user=`)
- Mobile bottom navigation
- Content safety (nude/sex block)
- Facebook-style media limits
- Web Owner design controls
- Tab persistence (sessionStorage)

## Still required for Facebook-class scale

- PostgreSQL migration (schema draft in `supabase_schema.sql` — expand)
- Redis / real WebSocket cluster for messaging at scale
- Object storage required in production (GCS/Supabase configured via env)
- WebRTC TURN for production calls
- AI vision moderation for explicit media without keyword filenames
- Full reaction UI (haha/wow/sad/angry) wired end-to-end
- Infinite scroll + virtualized lists
- Comprehensive automated tests

## Run

```bash
npm install
npm run dev
npm run build
```

## v11 additions
- Post menu: Report post/user, Hide, Delete, Share
- Report modal wired to POST /api/reports
- ReelsSection: vertical short-video player from real video posts
- ActiveTab `reels` in nav
- Expanded PostgreSQL schema (posts, comments, follows, friendships, stories, messages, reports, blocks, live, marketplace)

## v12
- Stories: 24h expiry + auto-cleanup on GET; expires_at on create
- Feed: paginated API (?page&limit), infinite scroll + Load more
- Messenger: SSE /api/chat/stream + EventSource client (poll backup)
- Groups API: list/create/join/leave

## v13
- Nested comment replies (parentId) + Reply UI
- Story viewers API + auto-record on view
- GroupsSection UI (create / join / leave) + sidebar tab

## v14 (safe fixes — no feature deletion)
- Fixed Messenger SSE setMessages (Record by roomId) — was broken
- Typing indicators via SSE + POST /api/chat/typing
- Story viewers list UI for owner (👁 count + panel)

## v15
- Group posts: list / create / like APIs
- Groups UI: open group → feed + composer (join required)
- Previous features preserved

## v16
- Group posts: image/video attach via /api/files/upload + content safety
- Group post delete (author/admin)
- Media preview in group feed

## v17
- Group post → notify other members (max 50)
- Group join → notify owner
- Group post like → notify author
- Notification click routes to Groups / Messenger by type

## v18
- Group invite by @username (owner/admin)
- Accept invite API + UI
- Hidden groups joinable only with invite
- group_invite notification routes to Groups tab

## v19 (step-by-step cleanup)
- GroupChatCreator: removed Unsplash stock images → gradient color presets
- LandingPage: replaced fake creator faces/stats with real feature highlights
- UserProfileSidebar: removed fake default phone number
- Member list uses letter avatar when no photo

## v20 (3 consecutive steps)
1. AppDownloads: removed random fake speed → elapsed progress estimate
2. Production build: run `npm install && npm run build` on your machine (sandbox npm hung)
3. Group moderators: promote/demote API + Members panel UI; notify on promote

## v21
- Group moderators can delete any group post (API + UI)
- README feature list updated (Groups, Reels, safety, SSE)

## v22
- Pin/unpin own posts (API + menu + 📌 badge); pinned sorted first
- Group edit: name, description, rules (owner/mod) via PATCH
- Rules banner shown in group detail
