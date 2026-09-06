/**
 * Phase 5 — Realtime hub (SSE).
 * In-process fan-out for chat messages, typing, presence, and call rings.
 *
 * Note: On multi-instance serverless, pair with Redis pub/sub later (Phase 7).
 * Single long-lived Node (Railway/Render) works well with this hub as-is.
 */
import type { Response } from 'express';
import { busPublish, busSubscribe, initRedisBus } from './redisBus.js';

let busUnsub: (() => void) | null = null;
let busOriginSkip = false; // prevent echo loops when applying local publish

/** Call once at server boot. */
export async function startRealtimeBus(): Promise<void> {
  await initRedisBus();
  if (busUnsub) return;
  busUnsub = busSubscribe((msg) => {
    // Remote (or local) envelope → deliver to SSE clients on this instance
    try {
      const { event, payload, targetUserIds } = msg;
      if (!event) return;
      if (targetUserIds && targetUserIds.length) {
        deliverLocal(targetUserIds, event, payload);
      } else {
        deliverLocalAll(event, payload);
      }
    } catch (_) {}
  });
}

function deliverLocal(userIds: string[], event: string, payload: unknown): number {
  let sent = 0;
  const unique = Array.from(new Set(userIds.filter(Boolean)));
  for (const uid of unique) {
    const set = clients.get(uid);
    if (!set) continue;
    for (const c of Array.from(set)) {
      if (writeEvent(c.res, event, payload)) {
        sent += 1;
        c.lastSeen = Date.now();
      } else {
        set.delete(c);
      }
    }
  }
  return sent;
}

function deliverLocalAll(event: string, payload: unknown): number {
  let sent = 0;
  for (const set of clients.values()) {
    for (const c of Array.from(set)) {
      if (writeEvent(c.res, event, payload)) sent += 1;
      else set.delete(c);
    }
  }
  return sent;
}


type Client = {
  res: Response;
  userId: string;
  connectedAt: number;
  lastSeen: number;
};

const clients = new Map<string, Set<Client>>();
const presence = new Map<string, { online: boolean; lastSeen: number; device?: string }>();

function writeEvent(res: Response, event: string, payload: unknown): boolean {
  try {
    res.write(`event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`);
    return true;
  } catch {
    return false;
  }
}

export function realtimeAttach(userId: string, res: Response): () => void {
  const client: Client = {
    res,
    userId,
    connectedAt: Date.now(),
    lastSeen: Date.now(),
  };
  if (!clients.has(userId)) clients.set(userId, new Set());
  clients.get(userId)!.add(client);

  presence.set(userId, { online: true, lastSeen: Date.now() });
  // Notify others that this user is online (best-effort)
  broadcastAll('presence', { userId, online: true, at: new Date().toISOString() }, userId);

  const heartbeat = setInterval(() => {
    client.lastSeen = Date.now();
    try {
      res.write(`: ping\n\n`);
    } catch {
      cleanup();
    }
  }, 20000);

  const cleanup = () => {
    clearInterval(heartbeat);
    clients.get(userId)?.delete(client);
    if (clients.get(userId)?.size === 0) {
      clients.delete(userId);
      presence.set(userId, { online: false, lastSeen: Date.now() });
      broadcastAll('presence', { userId, online: false, at: new Date().toISOString() }, userId);
    }
  };

  return cleanup;
}

export function broadcastToUsers(userIds: string[], event: string, payload: unknown): number {
  const unique = Array.from(new Set(userIds.filter(Boolean)));
  const sent = deliverLocal(unique, event, payload);
  // Cross-instance fan-out (Phase 7)
  void busPublish(event, payload, unique);
  return sent;
}

export function broadcastAll(event: string, payload: unknown, exceptUserId?: string): number {
  let sent = 0;
  const targets: string[] = [];
  for (const [uid, set] of clients) {
    if (exceptUserId && uid === exceptUserId) continue;
    targets.push(uid);
    for (const c of Array.from(set)) {
      if (writeEvent(c.res, event, payload)) sent += 1;
      else set.delete(c);
    }
  }
  void busPublish(event, payload, exceptUserId ? undefined : targets);
  return sent;
}

export function touchPresence(userId: string, online = true): void {
  presence.set(userId, { online, lastSeen: Date.now() });
  broadcastAll('presence', { userId, online, at: new Date().toISOString() }, userId);
}

export function getPresence(userId: string): { online: boolean; lastSeen: number } | null {
  return presence.get(userId) || null;
}

export function listOnlineUserIds(): string[] {
  const out: string[] = [];
  for (const [uid, info] of presence) {
    if (info.online) out.push(uid);
  }
  return out;
}

export function realtimeStats(): { connections: number; users: number } {
  let connections = 0;
  for (const set of clients.values()) connections += set.size;
  return { connections, users: clients.size };
}

/** Emit call ring to a specific callee (and optional room members). */
export function emitCallRing(input: {
  targetUserId: string;
  fromUserId: string;
  fromName?: string;
  roomId: string;
  callType?: string;
}): void {
  broadcastToUsers([input.targetUserId], 'call_ring', {
    ...input,
    at: new Date().toISOString(),
  });
}

export function emitNewMessage(memberIds: string[], message: unknown): void {
  broadcastToUsers(memberIds, 'new_message', message);
}

export function emitTyping(memberIds: string[], payload: unknown): void {
  broadcastToUsers(memberIds, 'typing', payload);
}
