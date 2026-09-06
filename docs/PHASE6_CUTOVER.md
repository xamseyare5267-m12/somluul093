# Phase 6 — Cutover

## Goal
Primary **reads** for feed, chat rooms, messages, and profiles come from **normalized Postgres tables** when `SCALE_MODE=1`.

`app_state` JSONB remains for:
- dual-write compatibility
- features not yet migrated (groups, live, marketplace details, etc.)
- fallback if table reads fail

## Behavior

| Endpoint | SCALE_MODE=1 | Fallback |
|----------|--------------|----------|
| `GET /api/posts` | `posts` table | `readDB().posts` |
| `GET /api/chat/rooms` | `chat_rooms` + members | blob rooms |
| `GET /api/chat/messages` | `chat_messages` (membership filtered) | blob messages |
| `GET /api/profiles/:id` | `profiles` table | blob profile |
| `GET /api/scale/*` | tables only | 503 if off |

Writes: still dual-write (blob + tables) via Phase 3 `scheduleDualWrite`.

## Enable
```bash
SCALE_MODE=1
# schema_v2_scale.sql applied
npm run migrate:app-state-to-tables   # once
```

Response marker: `GET /api/posts` may include `"source":"tables"`.

## After cutover is stable
1. Stop relying on blob for feed/chat
2. Phase 7: Redis pub/sub + job workers
3. Eventually freeze app_state to settings-only
