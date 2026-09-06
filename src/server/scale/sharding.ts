/**
 * Phase 10 — Hyperscale foundations (partition / shard helpers).
 *
 * These are deterministic routing helpers so the app can grow into
 * multi-shard Postgres / separate chat services without rewriting IDs.
 *
 * Actual multi-DB provisioning is infrastructure (not done inside a ZIP).
 */

import crypto from 'crypto';

/** Stable hash → non-negative int */
export function hashToInt(input: string): number {
  const h = crypto.createHash('sha256').update(String(input)).digest();
  // first 4 bytes as unsigned
  return h.readUInt32BE(0);
}

export function shardCount(): number {
  const n = parseInt(process.env.SHARD_COUNT || '1', 10);
  return Number.isFinite(n) && n >= 1 ? Math.min(n, 1024) : 1;
}

/** User-scoped data (profiles, follows, notifications, wallets) */
export function userShard(userId: string): number {
  return hashToInt(userId) % shardCount();
}

/** Chat room shard — DMs use sorted pair so both users land on same shard */
export function roomShard(roomId: string): number {
  return hashToInt(roomId) % shardCount();
}

/** Deterministic DM room id (matches messagesRepo ensureDmRoom) */
export function dmRoomId(userA: string, userB: string): string {
  const [a, b] = userA < userB ? [userA, userB] : [userB, userA];
  return `dm_${a}_${b}`;
}

export function dmRoomShard(userA: string, userB: string): number {
  return roomShard(dmRoomId(userA, userB));
}

/** Post feed can be sharded by author for write path; read fan-in is separate */
export function authorShard(authorId: string): number {
  return userShard(authorId);
}

export type ShardRoute = {
  shard: number;
  shardCount: number;
  key: string;
  kind: 'user' | 'room' | 'author';
  /** Hint for connection string env name */
  envHint: string;
};

export function routeForUser(userId: string): ShardRoute {
  const shard = userShard(userId);
  return {
    shard,
    shardCount: shardCount(),
    key: userId,
    kind: 'user',
    envHint: `SHARD_${shard}_DATABASE_URL`,
  };
}

export function routeForRoom(roomId: string): ShardRoute {
  const shard = roomShard(roomId);
  return {
    shard,
    shardCount: shardCount(),
    key: roomId,
    kind: 'room',
    envHint: `SHARD_${shard}_DATABASE_URL`,
  };
}

/**
 * Resolve optional per-shard Supabase URL.
 * Falls back to primary SUPABASE_URL when SHARD_COUNT=1 or env missing.
 */
export function shardSupabaseUrl(shard: number): string {
  const specific = process.env[`SHARD_${shard}_SUPABASE_URL`]?.trim();
  if (specific) return specific;
  return process.env.SUPABASE_URL?.trim() || '';
}

export function shardingStatus() {
  const count = shardCount();
  const configured: number[] = [];
  for (let i = 0; i < count; i++) {
    if (process.env[`SHARD_${i}_SUPABASE_URL`] || process.env[`SHARD_${i}_DATABASE_URL`]) {
      configured.push(i);
    }
  }
  return {
    shardCount: count,
    mode: count <= 1 ? 'single' : configured.length ? 'partial_multi' : 'logical_only',
    configuredShards: configured,
    note:
      count <= 1
        ? 'Single logical shard (default). Set SHARD_COUNT and SHARD_N_SUPABASE_URL to split.'
        : 'Logical routing enabled. Wire each SHARD_N_* to a real database for physical split.',
  };
}
