# Phase 5 — Realtime Gateway

## Server
- `src/server/scale/realtimeHub.ts` — SSE clients, presence, broadcast
- `GET /api/scale/realtime?token=JWT` — SSE stream
  - events: `connected`, `new_message`, `typing`, `presence`, `call_ring`
  - heartbeat ping every 20s
- Scale message send → `emitNewMessage(room members)`
- WebRTC offer → `emitCallRing`
- Presence POST → `touchPresence`

## Client
- `src/lib/realtimeClient.ts` — connect, exponential backoff reconnect, presence heartbeat
- MessengerSection uses `connectRealtime` / `disconnectRealtime`

## Limits (honest)
- In-process only: multiple serverless instances do not share SSE clients yet
- Prefer Railway/Render single long-lived Node for best realtime
- Phase 7: Redis pub/sub for multi-instance fan-out

## Test
1. Two browsers, same deployment
2. Login different users
3. Send message → peer sees without refresh
4. Start call → callee gets `call_ring` event (check console / custom event)
