/**
 * Posts repository — row-level Postgres (scale path).
 * Feed queries use indexes; reactions/comments are separate tables.
 */
import { randomUUID } from 'crypto';
import { restGet, restPost, restPatch, isScaleMode, supabaseConfig } from '../scale/supabaseRest.js';

export interface PostRow {
  id: string;
  author_id: string;
  content: string;
  media_type: string;
  media_url?: string | null;
  media_list?: any[];
  shares: number;
  is_pinned: boolean;
  is_sponsored: boolean;
  visibility: string;
  deleted_at?: string | null;
  created_at: string;
  updated_at?: string;
}

export function canUsePostsRepo(): boolean {
  return isScaleMode() && !!supabaseConfig();
}

export async function insertPost(input: {
  authorId: string;
  content?: string;
  mediaType?: string;
  mediaUrl?: string | null;
  mediaList?: any[];
  visibility?: string;
}): Promise<PostRow> {
  const row = {
    id: randomUUID(),
    author_id: input.authorId,
    content: input.content || '',
    media_type: input.mediaType || 'text',
    media_url: input.mediaUrl || null,
    media_list: input.mediaList || [],
    shares: 0,
    is_pinned: false,
    is_sponsored: false,
    visibility: input.visibility || 'public',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  const data = await restPost<PostRow[]>('posts', row);
  return Array.isArray(data) ? data[0] : (data as any);
}

export async function listFeed(opts: {
  limit?: number;
  before?: string;
  authorId?: string;
}): Promise<PostRow[]> {
  const limit = Math.min(opts.limit || 30, 100);
  let q = `posts?deleted_at=is.null&order=created_at.desc&limit=${limit}`;
  if (opts.authorId) q += `&author_id=eq.${encodeURIComponent(opts.authorId)}`;
  if (opts.before) q += `&created_at=lt.${encodeURIComponent(opts.before)}`;
  const data = await restGet<PostRow[]>(q);
  return Array.isArray(data) ? data : [];
}

export async function listReels(limit = 40): Promise<PostRow[]> {
  const q = `posts?deleted_at=is.null&media_type=in.(video,mixed)&order=created_at.desc&limit=${Math.min(limit, 100)}`;
  const data = await restGet<PostRow[]>(q);
  return Array.isArray(data) ? data : [];
}

export async function getPost(id: string): Promise<PostRow | null> {
  const data = await restGet<PostRow[]>(`posts?id=eq.${encodeURIComponent(id)}&limit=1`);
  return Array.isArray(data) && data[0] ? data[0] : null;
}

export async function softDeletePost(id: string, authorId: string): Promise<boolean> {
  const data = await restPatch<PostRow[]>(
    `posts?id=eq.${encodeURIComponent(id)}&author_id=eq.${encodeURIComponent(authorId)}`,
    { deleted_at: new Date().toISOString() }
  );
  return Array.isArray(data) && data.length > 0;
}

export async function upsertReaction(postId: string, userId: string, reaction: string): Promise<void> {
  await restPost(
    'post_reactions',
    { post_id: postId, user_id: userId, reaction, created_at: new Date().toISOString() },
    { prefer: 'resolution=merge-duplicates,return=minimal' }
  );
}

export async function removeReaction(postId: string, userId: string): Promise<void> {
  const { restDelete } = await import('../scale/supabaseRest.js');
  await restDelete(
    `post_reactions?post_id=eq.${encodeURIComponent(postId)}&user_id=eq.${encodeURIComponent(userId)}`
  );
}

export async function addComment(input: {
  postId: string;
  authorId: string;
  content: string;
  parentId?: string;
}): Promise<any> {
  const row = {
    id: randomUUID(),
    post_id: input.postId,
    author_id: input.authorId,
    parent_id: input.parentId || null,
    content: input.content,
    created_at: new Date().toISOString(),
  };
  const data = await restPost('post_comments', row);
  return Array.isArray(data) ? data[0] : data;
}

export async function listComments(postId: string, limit = 50): Promise<any[]> {
  const q = `post_comments?post_id=eq.${encodeURIComponent(postId)}&deleted_at=is.null&order=created_at.asc&limit=${limit}`;
  const data = await restGet<any[]>(q);
  return Array.isArray(data) ? data : [];
}
