/**
 * Dedicated WebRTC signaling store (call infrastructure).
 * Signals expire quickly; pair with TURN servers for real-world NAT traversal.
 */
import { randomUUID } from 'crypto';
import { restGet, restPost, restPatch, isScaleMode, supabaseConfig } from '../scale/supabaseRest.js';

export function canUseWebrtcRepo(): boolean {
  return isScaleMode() && !!supabaseConfig();
}

export async function pushSignal(input: {
  roomId: string;
  fromUserId: string;
  targetUserId?: string | null;
  type: string;
  callType?: string | null;
  sdp?: string | null;
  candidate?: any;
  fromName?: string;
}): Promise<any> {
  const row = {
    id: randomUUID(),
    room_id: input.roomId,
    from_user_id: input.fromUserId,
    target_user_id: input.targetUserId || null,
    type: input.type,
    call_type: input.callType || null,
    sdp: input.sdp || null,
    candidate: input.candidate || null,
    from_name: input.fromName || null,
    consumed_by: [],
    created_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 2 * 60 * 1000).toISOString(),
  };
  const data = await restPost('webrtc_signals', row);
  return Array.isArray(data) ? data[0] : data;
}

export async function pollSignals(userId: string, afterIso?: string): Promise<any[]> {
  let q = `webrtc_signals?or=(target_user_id.eq.${encodeURIComponent(userId)},target_user_id.is.null)&expires_at=gt.${encodeURIComponent(new Date().toISOString())}&order=created_at.asc&limit=50`;
  if (afterIso) q += `&created_at=gt.${encodeURIComponent(afterIso)}`;
  const data = await restGet<any[]>(q);
  const rows = Array.isArray(data) ? data : [];
  // Filter out already consumed by this user
  return rows.filter((r) => !(Array.isArray(r.consumed_by) && r.consumed_by.includes(userId)));
}

export async function markConsumed(signalId: string, userId: string): Promise<void> {
  try {
    const existing = await restGet<any[]>(`webrtc_signals?id=eq.${encodeURIComponent(signalId)}&limit=1`);
    if (!Array.isArray(existing) || !existing[0]) return;
    const consumed = Array.isArray(existing[0].consumed_by) ? existing[0].consumed_by : [];
    if (consumed.includes(userId)) return;
    await restPatch(`webrtc_signals?id=eq.${encodeURIComponent(signalId)}`, {
      consumed_by: [...consumed, userId],
    });
  } catch (err: any) {
    console.error('[WebRTC] markConsumed failed:', err?.message || err);
  }
}

export async function cleanupExpiredSignals(): Promise<void> {
  try {
    const { restDelete } = await import('../scale/supabaseRest.js');
    await restDelete(`webrtc_signals?expires_at=lt.${encodeURIComponent(new Date().toISOString())}`);
  } catch {
    /* best-effort */
  }
}

/**
 * ICE server configuration for clients.
 * Set TURN_* env vars for production NAT traversal (required for many mobile networks).
 */
export function getIceServers(): Array<{ urls: string | string[]; username?: string; credential?: string }> {
  const servers: Array<{ urls: string | string[]; username?: string; credential?: string }> = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ];

  const turnUrl = process.env.TURN_URL?.trim();
  const turnUser = process.env.TURN_USERNAME?.trim();
  const turnPass = process.env.TURN_CREDENTIAL?.trim();
  if (turnUrl && turnUser && turnPass) {
    servers.push({
      urls: turnUrl.split(',').map((u) => u.trim()).filter(Boolean),
      username: turnUser,
      credential: turnPass,
    });
  }

  // Optional secondary TURN
  const turnUrl2 = process.env.TURN_URL_2?.trim();
  if (turnUrl2 && turnUser && turnPass) {
    servers.push({
      urls: turnUrl2.split(',').map((u) => u.trim()).filter(Boolean),
      username: turnUser,
      credential: turnPass,
    });
  }

  return servers;
}
