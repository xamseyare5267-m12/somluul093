/**
 * Phase 3: Dual-write projector.
 * When SCALE_MODE=1, project high-value entities from the in-memory DB blob
 * into normalized Postgres tables (best-effort, non-blocking).
 *
 * This keeps legacy routes working while scale tables fill up for /api/scale/*.
 */
import { isScaleMode, supabaseConfig, restPost, restPatch } from './supabaseRest.js';

let projecting = false;
let pending: any = null;
let lastProjectAt = 0;

function enabled(): boolean {
  return isScaleMode() && !!supabaseConfig();
}

async function upsertProfileRow(p: any): Promise<void> {
  if (!p?.id) return;
  const row = {
    id: String(p.id),
    email: p.email || null,
    username: p.username || null,
    first_name: p.first_name || p.firstName || null,
    last_name: p.last_name || p.lastName || null,
    avatar: p.avatar || null,
    cover_photo: p.cover_photo || p.coverPhoto || null,
    bio: p.bio || null,
    phone: p.phone || null,
    country: p.country || null,
    city: p.city || null,
    website: p.website || null,
    gender: p.gender || null,
    dob: p.dob || null,
    work: p.work || null,
    role: p.role || 'normal',
    blocked: !!p.blocked,
    email_verified: !!(p.email_verified || p.emailVerified),
    phone_verified: !!(p.phone_verified || p.phoneVerified),
    updated_at: new Date().toISOString(),
    created_at: p.created_at || p.createdAt || new Date().toISOString(),
  };
  await restPost('profiles', row, { prefer: 'resolution=merge-duplicates,return=minimal' });
}

async function upsertPostRow(post: any): Promise<void> {
  if (!post?.id) return;
  const authorId = post.authorId || post.author_id || post.author?.id;
  if (!authorId) return;
  const row = {
    id: String(post.id),
    author_id: String(authorId),
    content: post.content || post.text || '',
    media_type: post.mediaType || post.media_type || (post.media_url || post.mediaUrl ? 'image' : 'text'),
    media_url: post.mediaUrl || post.media_url || null,
    media_list: post.mediaList || post.media_list || post.media || [],
    shares: Number(post.shares || 0),
    is_pinned: !!(post.isPinned || post.is_pinned),
    is_sponsored: !!(post.isSponsored || post.is_sponsored),
    visibility: post.visibility || 'public',
    created_at: post.created_at || post.createdAt || new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: post.deleted_at || null,
  };
  await restPost('posts', row, { prefer: 'resolution=merge-duplicates,return=minimal' });
}

async function upsertMessageRow(msg: any): Promise<void> {
  if (!msg?.id) return;
  const roomId = msg.roomId || msg.room_id;
  const senderId = msg.senderId || msg.sender_id || msg.fromUserId || msg.userId;
  if (!roomId || !senderId) return;

  // Ensure room exists (minimal)
  await restPost(
    'chat_rooms',
    {
      id: String(roomId),
      kind: msg.kind || 'dm',
      name: msg.roomName || null,
      created_by: String(senderId),
      last_message_at: msg.created_at || msg.createdAt || new Date().toISOString(),
      last_message_preview: String(msg.body || msg.text || msg.content || '').slice(0, 120),
      created_at: msg.created_at || msg.createdAt || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    { prefer: 'resolution=merge-duplicates,return=minimal' }
  );

  await restPost(
    'chat_messages',
    {
      id: String(msg.id),
      room_id: String(roomId),
      sender_id: String(senderId),
      body: msg.body || msg.text || msg.content || '',
      media_url: msg.mediaUrl || msg.media_url || null,
      media_type: msg.mediaType || msg.media_type || null,
      reply_to_id: msg.replyToId || msg.reply_to_id || null,
      metadata: msg.metadata || {},
      created_at: msg.created_at || msg.createdAt || new Date().toISOString(),
      deleted_at: msg.deleted_at || null,
    },
    { prefer: 'resolution=merge-duplicates,return=minimal' }
  );
}

async function upsertNotificationRow(n: any): Promise<void> {
  if (!n?.id) return;
  const userId = n.userId || n.user_id;
  if (!userId) return;
  await restPost(
    'notifications',
    {
      id: String(n.id),
      user_id: String(userId),
      type: n.type || 'generic',
      title: n.title || 'Notification',
      body: n.body || n.message || null,
      data: n.data || {},
      read_at: n.read_at || n.readAt || null,
      created_at: n.created_at || n.createdAt || new Date().toISOString(),
    },
    { prefer: 'resolution=merge-duplicates,return=minimal' }
  );
}

/**
 * Project a full DB snapshot into normalized tables.
 * Limits batch size to avoid timeouts on large datasets.
 */
export async function projectDbToTables(db: any, opts?: { maxPosts?: number; maxMessages?: number }): Promise<{
  profiles: number;
  posts: number;
  messages: number;
  notifications: number;
  errors: string[];
}> {
  const result = { profiles: 0, posts: 0, messages: 0, notifications: 0, errors: [] as string[] };
  if (!enabled() || !db) return result;

  const maxPosts = opts?.maxPosts ?? 200;
  const maxMessages = opts?.maxMessages ?? 400;

  const profiles = Array.isArray(db.profiles) ? db.profiles : [];
  for (const p of profiles.slice(0, 500)) {
    try {
      await upsertProfileRow(p);
      result.profiles += 1;
    } catch (e: any) {
      result.errors.push(`profile ${p?.id}: ${e?.message || e}`);
    }
  }

  const posts = Array.isArray(db.posts) ? db.posts : [];
  // Newest first
  const sortedPosts = [...posts].sort((a, b) =>
    String(b.created_at || b.createdAt || '').localeCompare(String(a.created_at || a.createdAt || ''))
  );
  for (const post of sortedPosts.slice(0, maxPosts)) {
    try {
      await upsertPostRow(post);
      result.posts += 1;
    } catch (e: any) {
      result.errors.push(`post ${post?.id}: ${e?.message || e}`);
    }
  }

  const messages = Array.isArray(db.chatMessages) ? db.chatMessages : [];
  const sortedMsg = [...messages].sort((a, b) =>
    String(b.created_at || b.createdAt || '').localeCompare(String(a.created_at || a.createdAt || ''))
  );
  for (const msg of sortedMsg.slice(0, maxMessages)) {
    try {
      await upsertMessageRow(msg);
      result.messages += 1;
    } catch (e: any) {
      result.errors.push(`message ${msg?.id}: ${e?.message || e}`);
    }
  }

  const notifications = Array.isArray(db.notifications) ? db.notifications : [];
  for (const n of notifications.slice(0, 200)) {
    try {
      await upsertNotificationRow(n);
      result.notifications += 1;
    } catch (e: any) {
      result.errors.push(`notification ${n?.id}: ${e?.message || e}`);
    }
  }

  return result;
}

/**
 * Schedule a debounced dual-write after legacy writeDB().
 * Never blocks the request path for more than scheduling.
 */
export function scheduleDualWrite(db: any): void {
  if (!enabled()) return;
  pending = db;
  const now = Date.now();
  // Debounce: at most one project every 2s
  if (projecting || now - lastProjectAt < 2000) return;

  projecting = true;
  lastProjectAt = now;
  const snapshot = pending;
  pending = null;

  setImmediate(() => {
    projectDbToTables(snapshot, { maxPosts: 50, maxMessages: 80 })
      .then((r) => {
        if (r.errors.length) {
          console.warn('[DualWrite] partial errors:', r.errors.slice(0, 3));
        } else {
          console.log(
            `[DualWrite] projected profiles=${r.profiles} posts=${r.posts} messages=${r.messages} notifications=${r.notifications}`
          );
        }
      })
      .catch((err) => console.error('[DualWrite] failed:', err?.message || err))
      .finally(() => {
        projecting = false;
        if (pending) scheduleDualWrite(pending);
      });
  });
}

/** Project a single post immediately (call from create-post handlers if desired). */
export async function dualWritePost(post: any): Promise<void> {
  if (!enabled()) return;
  try {
    await upsertPostRow(post);
  } catch (e: any) {
    console.warn('[DualWrite] post:', e?.message || e);
  }
}

export async function dualWriteMessage(msg: any): Promise<void> {
  if (!enabled()) return;
  try {
    await upsertMessageRow(msg);
  } catch (e: any) {
    console.warn('[DualWrite] message:', e?.message || e);
  }
}

export async function dualWriteProfile(profile: any): Promise<void> {
  if (!enabled()) return;
  try {
    await upsertProfileRow(profile);
  } catch (e: any) {
    console.warn('[DualWrite] profile:', e?.message || e);
  }
}
