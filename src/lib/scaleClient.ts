/**
 * Phase 4 — Client Scale Path
 * Prefer /api/scale/* when the server reports scaleMode + repos enabled.
 * Falls back to legacy routes automatically.
 */
import axios from './apiClient';

export type ScaleStatus = {
  scaleMode: boolean;
  supabaseConfigured: boolean;
  postsRepo: boolean;
  messagesRepo: boolean;
  profilesRepo: boolean;
  webrtcRepo: boolean;
  notificationsRepo: boolean;
  redisConfigured: boolean;
  turnConfigured: boolean;
  cdnBase: string | null;
};

let cachedStatus: ScaleStatus | null = null;
let statusFetchedAt = 0;
let statusPromise: Promise<ScaleStatus | null> | null = null;

const STATUS_TTL_MS = 60_000;

export async function getScaleStatus(force = false): Promise<ScaleStatus | null> {
  const now = Date.now();
  if (!force && cachedStatus && now - statusFetchedAt < STATUS_TTL_MS) {
    return cachedStatus;
  }
  if (!force && statusPromise) return statusPromise;

  statusPromise = (async () => {
    try {
      const res = await axios.get('/api/scale/status', { timeout: 8000 });
      cachedStatus = res.data as ScaleStatus;
      statusFetchedAt = Date.now();
      return cachedStatus;
    } catch {
      cachedStatus = null;
      statusFetchedAt = Date.now();
      return null;
    } finally {
      statusPromise = null;
    }
  })();

  return statusPromise;
}

export function isPostsScale(s: ScaleStatus | null): boolean {
  return !!(s?.scaleMode && s.postsRepo);
}
export function isMessagesScale(s: ScaleStatus | null): boolean {
  return !!(s?.scaleMode && s.messagesRepo);
}
export function isWebrtcScale(s: ScaleStatus | null): boolean {
  return !!(s?.scaleMode && s.webrtcRepo);
}

/** Map scale post row → UI Post-ish shape */
export function mapScalePost(row: any): any {
  if (!row) return row;
  return {
    ...row,
    id: row.id,
    authorId: row.author_id || row.authorId,
    author: row.author || {
      id: row.author_id,
      first_name: row.author_first_name || '',
      last_name: row.author_last_name || '',
      username: row.author_username || '',
      avatar: row.author_avatar || null,
    },
    content: row.content || '',
    mediaType: row.media_type || row.mediaType || 'text',
    media_type: row.media_type || row.mediaType || 'text',
    mediaUrl: row.media_url || row.mediaUrl || null,
    media_url: row.media_url || row.mediaUrl || null,
    mediaList: row.media_list || row.mediaList || [],
    media_list: row.media_list || row.mediaList || [],
    shares: row.shares || 0,
    isPinned: row.is_pinned || row.isPinned || false,
    is_pinned: row.is_pinned || row.isPinned || false,
    created_at: row.created_at || row.createdAt,
    createdAt: row.created_at || row.createdAt,
    reactions: row.reactions || {},
    comments: row.comments || [],
  };
}

export async function fetchFeedPosts(params?: {
  page?: number;
  limit?: number;
  before?: string;
  authorId?: string;
}): Promise<{ list: any[]; hasMore: boolean; usedScale: boolean }> {
  const status = await getScaleStatus();
  if (isPostsScale(status)) {
    try {
      const res = await axios.get('/api/scale/feed', {
        params: {
          before: params?.before,
          authorId: params?.authorId,
          limit: params?.limit || 30,
          ranked: params?.before ? 0 : 1,
        },
        timeout: 45000,
      });
      const posts = Array.isArray(res.data?.posts) ? res.data.posts.map(mapScalePost) : [];
      return { list: posts, hasMore: posts.length >= (params?.limit || 30), usedScale: true };
    } catch {
      /* fall through to legacy */
    }
  }
  const res = await axios.get('/api/posts', {
    params: { page: params?.page || 1, limit: params?.limit || 30 },
    timeout: 45000,
  });
  const data = res.data;
  if (Array.isArray(data)) return { list: data, hasMore: false, usedScale: false };
  if (data?.posts) return { list: data.posts, hasMore: !!data.hasMore, usedScale: false };
  if (data?.data) return { list: data.data, hasMore: !!data.hasMore, usedScale: false };
  return { list: [], hasMore: false, usedScale: false };
}

export async function createFeedPost(
  payload: Record<string, unknown>,
  authToken?: string,
): Promise<{ post: any; usedScale: boolean }> {
  const authHeaders = authToken ? { Authorization: `Bearer ${authToken}` } : undefined;
  const status = await getScaleStatus();
  if (isPostsScale(status)) {
    try {
      const body = {
        content: payload.content || payload.text || '',
        mediaType: payload.mediaType || payload.media_type || 'text',
        mediaUrl: payload.mediaUrl || payload.media_url || null,
        mediaList: payload.mediaList || payload.media_list || [],
        visibility: payload.visibility || 'public',
      };
      const res = await axios.post('/api/scale/posts', body, { timeout: 45000, headers: authHeaders });
      return { post: mapScalePost(res.data?.post || res.data), usedScale: true };
    } catch {
      /* fall through */
    }
  }
  const res = await axios.post('/api/posts', payload, { timeout: 45000, headers: authHeaders });
  return { post: res.data, usedScale: false };
}

export async function reactToPost(postId: string, reaction = 'like'): Promise<void> {
  const status = await getScaleStatus();
  if (isPostsScale(status)) {
    try {
      await axios.post(`/api/scale/posts/${postId}/react`, { reaction });
      return;
    } catch {
      /* fall through */
    }
  }
  await axios.post(`/api/posts/${postId}/like`);
}

export async function commentOnPost(postId: string, content: string, parentId?: string): Promise<any> {
  const status = await getScaleStatus();
  if (isPostsScale(status)) {
    try {
      const res = await axios.post(`/api/scale/posts/${postId}/comments`, { content, parentId });
      return res.data?.comment || res.data;
    } catch {
      /* fall through */
    }
  }
  const res = await axios.post(`/api/posts/${postId}/comment`, { content, parentId });
  return res.data;
}

/** Direct-to-storage upload when scale storage is available; else legacy multipart. */
export async function uploadMediaFile(file: File): Promise<string | null> {
  const status = await getScaleStatus();
  if (status?.scaleMode && status.supabaseConfigured) {
    try {
      const sign = await axios.post('/api/media/sign', {
        filename: file.name,
        contentType: file.type || 'application/octet-stream', sizeBytes:file.size,
      });
      const { uploadUrl, publicUrl } = sign.data || {};
      if (uploadUrl && publicUrl) {
        const put = await fetch(uploadUrl,{method:'PUT',headers:{'Content-Type':file.type||'application/octet-stream'},body:file});
        if (put.ok || put.status===200 || put.status===201) { await axios.post('/api/media/complete',{mediaId:sign.data?.mediaId,objectKey:sign.data?.objectKey,contentType:file.type||'application/octet-stream'}); return publicUrl as string; }
        // Some Supabase signed upload flows need POST with token — try fallback
      }
    } catch (err) {
      console.warn('[scaleClient] direct upload failed, falling back to API upload', err);
    }
  }

  const formData = new FormData();
  formData.append('file', file);
  const res = await axios.post('/api/files/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 120000,
  });
  return (
    res.data?.public_url ||
    res.data?.url ||
    res.data?.file?.public_url ||
    res.data?.file?.url ||
    null
  );
}

export async function fetchChatRooms(): Promise<{ rooms: any[]; usedScale: boolean }> {
  const status = await getScaleStatus();
  if (isMessagesScale(status)) {
    try {
      const res = await axios.get('/api/scale/chat/rooms');
      return { rooms: res.data?.rooms || [], usedScale: true };
    } catch {
      /* fall through */
    }
  }
  const res = await axios.get('/api/chat/rooms');
  const rooms = Array.isArray(res.data) ? res.data : res.data?.rooms || [];
  return { rooms, usedScale: false };
}

export async function fetchChatMessages(
  roomId: string,
  opts?: { before?: string }
): Promise<{ messages: any[]; usedScale: boolean }> {
  const status = await getScaleStatus();
  if (isMessagesScale(status)) {
    try {
      const res = await axios.get(`/api/scale/chat/${encodeURIComponent(roomId)}/messages`, {
        params: { before: opts?.before },
      });
      return { messages: res.data?.messages || [], usedScale: true };
    } catch {
      /* fall through */
    }
  }
  const res = await axios.get('/api/chat/messages', { params: { roomId, before: opts?.before } });
  const messages = Array.isArray(res.data) ? res.data : res.data?.messages || [];
  return { messages, usedScale: false };
}

export async function sendChatMessage(
  roomId: string,
  body: { body?: string; text?: string; content?: string; mediaUrl?: string; mediaType?: string }
): Promise<{ message: any; usedScale: boolean }> {
  const status = await getScaleStatus();
  if (isMessagesScale(status)) {
    try {
      const res = await axios.post(`/api/scale/chat/${encodeURIComponent(roomId)}/messages`, {
        body: body.body || body.text || body.content || '',
        mediaUrl: body.mediaUrl,
        mediaType: body.mediaType,
      });
      return { message: res.data?.message || res.data, usedScale: true };
    } catch {
      /* fall through */
    }
  }
  const res = await axios.post('/api/chat/messages', {
    roomId,
    body: body.body || body.text || body.content || '',
    text: body.body || body.text || body.content || '',
    mediaUrl: body.mediaUrl,
    mediaType: body.mediaType,
  });
  return { message: res.data, usedScale: false };
}

export async function ensureDmRoom(peerId: string): Promise<string | null> {
  const status = await getScaleStatus();
  if (isMessagesScale(status)) {
    try {
      const res = await axios.post('/api/scale/chat/dm', { peerId });
      return res.data?.roomId || null;
    } catch {
      /* fall through */
    }
  }
  return null;
}

export async function fetchIceServers(): Promise<RTCIceServer[]> {
  try {
    const res = await axios.get('/api/webrtc/ice-servers', { timeout: 8000 });
    const list = res.data?.iceServers;
    if (Array.isArray(list) && list.length) return list as RTCIceServer[];
  } catch {
    /* default STUN */
  }
  return [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ];
}

export async function sendWebrtcSignal(payload: Record<string, unknown>): Promise<void> {
  const status = await getScaleStatus();
  if (isWebrtcScale(status)) {
    try {
      await axios.post('/api/scale/webrtc/signal', payload);
      return;
    } catch {
      /* fall through */
    }
  }
  await axios.post('/api/webrtc/signal', payload);
}

export async function pollWebrtcSignals(params?: {
  roomId?: string;
  after?: string;
  since?: number;
}): Promise<any[]> {
  const status = await getScaleStatus();
  if (isWebrtcScale(status)) {
    try {
      const res = await axios.get('/api/scale/webrtc/poll', {
        params: { after: params?.after },
      });
      return res.data?.signals || [];
    } catch {
      /* fall through */
    }
  }
  const res = await axios.get('/api/webrtc/signal', {
    params: { roomId: params?.roomId, since: params?.since },
  });
  return res.data?.signals || [];
}

/** Warm status cache early (call from App mount). */
export function prefetchScaleStatus(): void {
  void getScaleStatus();
}
