/**
 * Phase 3 migration: project Supabase app_state JSON into normalized tables.
 *
 * Usage:
 *   SCALE_MODE=1 SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/migrate-app-state-to-tables.mjs
 *
 * Safe to re-run (upsert / merge-duplicates). Does not delete existing rows.
 */
import 'dotenv/config';
import axios from 'axios';

function cleanUrl(url) {
  if (!url) return '';
  let raw = String(url).trim();
  if ((raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'"))) {
    raw = raw.slice(1, -1).trim();
  }
  try {
    if (raw.includes('://')) {
      const u = new URL(raw);
      return `${u.protocol}//${u.host}`;
    }
  } catch {
    /* ignore */
  }
  return raw.replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');
}

const base = cleanUrl(process.env.SUPABASE_URL);
const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

if (!base || !key) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const headers = {
  Authorization: `Bearer ${key}`,
  apikey: key,
  'Content-Type': 'application/json',
  Prefer: 'resolution=merge-duplicates,return=minimal',
};

async function restPost(table, row) {
  await axios.post(`${base}/rest/v1/${table}`, row, { headers, timeout: 20000 });
}

async function main() {
  console.log('[Migrate] Reading app_state…');
  const res = await axios.get(`${base}/rest/v1/app_state?id=eq.1&select=version,state`, {
    headers: { Authorization: `Bearer ${key}`, apikey: key },
    timeout: 20000,
  });
  const row = Array.isArray(res.data) ? res.data[0] : res.data;
  if (!row?.state) {
    console.error('[Migrate] No app_state row found. Is schema applied and has the app written data?');
    process.exit(1);
  }

  const db = row.state;
  const stats = { profiles: 0, posts: 0, messages: 0, notifications: 0, errors: 0 };

  console.log('[Migrate] version=', row.version);
  console.log(
    '[Migrate] blob sizes:',
    'profiles', Array.isArray(db.profiles) ? db.profiles.length : 0,
    'posts', Array.isArray(db.posts) ? db.posts.length : 0,
    'chatMessages', Array.isArray(db.chatMessages) ? db.chatMessages.length : 0
  );

  for (const p of db.profiles || []) {
    try {
      await restPost('profiles', {
        id: String(p.id),
        email: p.email || null,
        username: p.username || null,
        first_name: p.first_name || null,
        last_name: p.last_name || null,
        avatar: p.avatar || null,
        cover_photo: p.cover_photo || null,
        bio: p.bio || null,
        phone: p.phone || null,
        role: p.role || 'normal',
        blocked: !!p.blocked,
        email_verified: !!p.email_verified,
        phone_verified: !!p.phone_verified,
        created_at: p.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      stats.profiles++;
    } catch (e) {
      stats.errors++;
      console.warn('profile', p?.id, e?.response?.data || e.message);
    }
  }

  for (const post of db.posts || []) {
    try {
      const authorId = post.authorId || post.author_id || post.author?.id;
      if (!authorId) continue;
      await restPost('posts', {
        id: String(post.id),
        author_id: String(authorId),
        content: post.content || '',
        media_type: post.mediaType || post.media_type || 'text',
        media_url: post.mediaUrl || post.media_url || null,
        media_list: post.mediaList || post.media_list || [],
        shares: Number(post.shares || 0),
        is_pinned: !!(post.isPinned || post.is_pinned),
        is_sponsored: !!(post.isSponsored || post.is_sponsored),
        visibility: post.visibility || 'public',
        created_at: post.created_at || post.createdAt || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      stats.posts++;
    } catch (e) {
      stats.errors++;
      console.warn('post', post?.id, e?.response?.data || e.message);
    }
  }

  for (const msg of db.chatMessages || []) {
    try {
      const roomId = msg.roomId || msg.room_id;
      const senderId = msg.senderId || msg.sender_id || msg.fromUserId || msg.userId;
      if (!roomId || !senderId) continue;
      await restPost('chat_rooms', {
        id: String(roomId),
        kind: 'dm',
        created_by: String(senderId),
        last_message_at: msg.created_at || new Date().toISOString(),
        created_at: msg.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      await restPost('chat_messages', {
        id: String(msg.id),
        room_id: String(roomId),
        sender_id: String(senderId),
        body: msg.body || msg.text || msg.content || '',
        media_url: msg.mediaUrl || msg.media_url || null,
        media_type: msg.mediaType || msg.media_type || null,
        created_at: msg.created_at || msg.createdAt || new Date().toISOString(),
      });
      stats.messages++;
    } catch (e) {
      stats.errors++;
      console.warn('message', msg?.id, e?.response?.data || e.message);
    }
  }

  for (const n of db.notifications || []) {
    try {
      const userId = n.userId || n.user_id;
      if (!userId) continue;
      await restPost('notifications', {
        id: String(n.id),
        user_id: String(userId),
        type: n.type || 'generic',
        title: n.title || 'Notification',
        body: n.body || null,
        data: n.data || {},
        created_at: n.created_at || new Date().toISOString(),
      });
      stats.notifications++;
    } catch (e) {
      stats.errors++;
    }
  }

  console.log('[Migrate] DONE', stats);
  if (stats.errors) process.exit(2);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
