# Phase 10 — Hyperscale Foundations

## What this phase is (honest)

This is **architecture + routing primitives**, not a running multi-datacenter Facebook clone.

You get:
- Deterministic **shard keys** for users and chat rooms
- **Service registry** for gradual extraction (chat/realtime/media/…)
- Ops visibility via `/api/scale/sharding` and `/api/scale/services`

You still need cloud engineering to:
- Provision N Postgres/Supabase projects
- Run separate realtime/chat fleets
- Global anycast CDN + multi-region failover

## Shard model

| Entity | Partition key | Helper |
|--------|---------------|--------|
| Profile, follows, notifications, wallet | `userId` | `userShard` / `routeForUser` |
| Chat room + messages | `roomId` (DM id sorted) | `roomShard` / `routeForRoom` |
| Posts (write) | `authorId` | `authorShard` |

```bash
SHARD_COUNT=4
SHARD_0_SUPABASE_URL=...
SHARD_1_SUPABASE_URL=...
# ...
```

Until those envs exist, `mode: logical_only` — one database, routing math ready.

## Service split order (recommended)

1. **Media** — already direct-to-object-storage (Phase 2)
2. **Realtime gateway** — sticky SSE/WebSocket + Redis bus (Phase 5–7)
3. **Chat service** — room-sharded writes
4. **Feed + ranking** — read models / caches
5. **Auth** — session service
6. **Jobs** — workers on their own pool

Set when extracted:
```
SERVICE_CHAT_URL=https://chat.internal
SERVICE_REALTIME_URL=https://rt.internal
SERVICE_MEDIA_URL=https://media.internal
```

## API

| Route | Purpose |
|-------|---------|
| `GET /api/scale/sharding` | Shard count + mode + current user route |
| `GET /api/scale/services` | In-process vs remote services |
| `GET /api/scale/route/user/:id` | Where user data should live |
| `GET /api/scale/route/room/:id` | Where room messages should live |

## Next engineering (beyond this repo)

- [ ] Physical shard DBs + migration tooling per shard
- [ ] Cross-shard fan-out for global search
- [ ] Dedicated WebSocket fleet with Redis adapter
- [ ] Read replicas for feed
- [ ] Multi-region active-passive failover runbooks
