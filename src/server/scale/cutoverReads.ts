/**
 * Phase 6 — Cutover reads.
 * When SCALE_MODE=1, prefer normalized tables; fall back to in-memory blob.
 */
import { isScaleMode, supabaseConfig, restGet } from './supabaseRest.js';
import * as postsRepo from '../repos/postsRepo.js';
import * as messagesRepo from '../repos/messagesRepo.js';
import * as profilesRepo from '../repos/profilesRepo.js';
import { rankedFeed } from './ranking.js';

export function cutoverEnabled(): boolean {
  return isScaleMode() && !!supabaseConfig();
}

function mapPost(row: any, authorProfile?: any): any {
  const author = authorProfile
    ? {
        id: authorProfile.id,
        first_name: authorProfile.first_name,
        last_name: authorProfile.last_name,
        username: authorProfile.username,
        avatar: authorProfile.avatar,
        name: `${authorProfile.first_name || ''} ${authorProfile.last_name || ''}`.trim(),
        handle: authorProfile.username,
      }
    : {
        id: row.author_id,
        name: '',
        handle: '',
        avatar: null,
      };
  return {
    id: row.id,
    authorId: row.author_id,
    author,
    content: row.content || '',
    text: row.content || '',
    mediaType: row.media_type || 'text',
    media_type: row.media_type || 'text',
    mediaUrl: row.media_url || null,
    media_url: row.media_url || null,
    mediaList: row.media_list || [],
    media_list: row.media_list || [],
    shares: row.shares || 0,
    isPinned: !!row.is_pinned,
    is_pinned: !!row.is_pinned,
    isSponsored: !!row.is_sponsored,
    visibility: row.visibility || 'public',
    created_at: row.created_at,
    createdAt: row.created_at,
    reactions: {},
    comments: [],
  };
}

export async function cutoverListPosts(opts: {
  limit?: number;
  page?: number;
  authorId?: string;
}): Promise<{ posts: any[]; hasMore: boolean } | null> {
  if (!cutoverEnabled()) return null;
  try {
    const limit = Math.min(opts.limit || 30, 100);
    const page = opts.page || 1;
    // Scale listFeed is cursor-based; for page>1 we still return first page from tables
    // and rely on client eventually using /api/scale/feed. Good enough for cutover.
    let rows: any[];
    if (!opts.authorId && opts.page === 1) {
      try {
        rows = await rankedFeed({ authorId: opts.authorId, limit: limit + 1 });
      } catch {
        rows = await postsRepo.listFeed({ limit: limit + 1, authorId: opts.authorId });
      }
    } else {
      rows = await postsRepo.listFeed({ limit: limit + 1, authorId: opts.authorId });
    }
    const slice = rows.slice(0, limit);
    const authorIds = Array.from(new Set(slice.map((r) => r.author_id).filter(Boolean)));
    const authors = new Map<string, any>();
    for (const id of authorIds) {
      try {
        const p = await profilesRepo.getProfileById(id);
        if (p) authors.set(id, p);
      } catch {
        /* ignore */
      }
    }
    const posts = slice.map((r) => mapPost(r, authors.get(r.author_id)));
    return { posts, hasMore: rows.length > limit || page === 1 && rows.length >= limit };
  } catch (err: any) {
    console.warn('[Cutover] listPosts failed, using blob:', err?.message || err);
    return null;
  }
}

export async function cutoverListRooms(userId: string): Promise<any[] | null> {
  if (!cutoverEnabled()) return null;
  try {
    const rooms = await messagesRepo.listRoomsForUser(userId);
    return rooms.map((r) => ({
      id: r.id,
      name: r.name || 'Chat',
      avatar: r.avatar || null,
      isGroup: r.kind === 'group',
      kind: r.kind,
      lastMessage: r.last_message_preview || '',
      lastMessageTime: r.last_message_at || r.updated_at || '',
      members: [], // filled optionally below
      unreadCount: 0,
    }));
  } catch (err: any) {
    console.warn('[Cutover] listRooms failed:', err?.message || err);
    return null;
  }
}

export async function cutoverListMessages(userId: string): Promise<any[] | null> {
  if (!cutoverEnabled()) return null;
  try {
    // Rooms the user belongs to
    const memberships = await restGet<any[]>(
      `chat_members?user_id=eq.${encodeURIComponent(userId)}&select=room_id`
    );
    if (!Array.isArray(memberships) || !memberships.length) return [];
    const roomIds = memberships.map((m) => m.room_id);
    // Fetch recent messages across rooms (cap)
    const inList = roomIds
      .slice(0, 50)
      .map((id) => `"${id}"`)
      .join(',');
    const rows = await restGet<any[]>(
      `chat_messages?room_id=in.(${inList})&deleted_at=is.null&order=created_at.desc&limit=500`
    );
    const list = Array.isArray(rows) ? rows : [];
    return list
      .map((m) => ({
        id: m.id,
        roomId: m.room_id,
        senderId: m.sender_id,
        userId: m.sender_id,
        text: m.body || '',
        body: m.body || '',
        content: m.body || '',
        mediaUrl: m.media_url || null,
        mediaType: m.media_type || null,
        created_at: m.created_at,
        createdAt: m.created_at,
        timestamp: m.created_at,
      }))
      .reverse();
  } catch (err: any) {
    console.warn('[Cutover] listMessages failed:', err?.message || err);
    return null;
  }
}

export async function cutoverGetProfile(id: string): Promise<any | null> {
  if (!cutoverEnabled()) return null;
  try {
    return await profilesRepo.getProfileById(id);
  } catch {
    return null;
  }
}

export async function cutoverEnrichPostComments(postId: string): Promise<any[]> {
  if (!cutoverEnabled()) return [];
  try {
    return await postsRepo.listComments(postId);
  } catch {
    return [];
  }
}
