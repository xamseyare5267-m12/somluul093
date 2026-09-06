/**
 * Chat messages repository — WhatsApp/Telegram style room + message tables.
 */
import { randomUUID } from 'crypto';
import { restGet, restPost, restPatch, isScaleMode, supabaseConfig } from '../scale/supabaseRest.js';

export function canUseMessagesRepo(): boolean {
  return isScaleMode() && !!supabaseConfig();
}

export async function ensureDmRoom(userA: string, userB: string): Promise<string> {
  // Deterministic DM room id so both sides share one room
  const [a, b] = userA < userB ? [userA, userB] : [userB, userA];
  const roomId = `dm_${a}_${b}`;
  try {
    const existing = await restGet<any[]>(`chat_rooms?id=eq.${encodeURIComponent(roomId)}&limit=1`);
    if (Array.isArray(existing) && existing[0]) return roomId;
  } catch {
    /* create below */
  }
  await restPost(
    'chat_rooms',
    {
      id: roomId,
      kind: 'dm',
      name: null,
      created_by: userA,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    { prefer: 'resolution=ignore-duplicates,return=minimal' }
  );
  for (const uid of [a, b]) {
    await restPost(
      'chat_members',
      { room_id: roomId, user_id: uid, role: 'member', joined_at: new Date().toISOString() },
      { prefer: 'resolution=ignore-duplicates,return=minimal' }
    );
  }
  return roomId;
}

export async function createGroupRoom(input: {
  name: string;
  createdBy: string;
  memberIds: string[];
}): Promise<string> {
  const roomId = randomUUID();
  await restPost('chat_rooms', {
    id: roomId,
    kind: 'group',
    name: input.name,
    created_by: input.createdBy,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
  const members = Array.from(new Set([input.createdBy, ...input.memberIds]));
  for (const uid of members) {
    await restPost(
      'chat_members',
      {
        room_id: roomId,
        user_id: uid,
        role: uid === input.createdBy ? 'owner' : 'member',
        joined_at: new Date().toISOString(),
      },
      { prefer: 'resolution=ignore-duplicates,return=minimal' }
    );
  }
  return roomId;
}

export async function insertMessage(input: {
  roomId: string;
  senderId: string;
  body?: string;
  mediaUrl?: string;
  mediaType?: string;
  replyToId?: string;
  metadata?: Record<string, unknown>;
}): Promise<any> {
  const row = {
    id: randomUUID(),
    room_id: input.roomId,
    sender_id: input.senderId,
    body: input.body || '',
    media_url: input.mediaUrl || null,
    media_type: input.mediaType || null,
    reply_to_id: input.replyToId || null,
    metadata: input.metadata || {},
    created_at: new Date().toISOString(),
  };
  const data = await restPost('chat_messages', row);
  // Touch room preview
  await restPatch(`chat_rooms?id=eq.${encodeURIComponent(input.roomId)}`, {
    last_message_at: row.created_at,
    last_message_preview: (input.body || input.mediaType || '').slice(0, 120),
    updated_at: row.created_at,
  });
  return Array.isArray(data) ? data[0] : data;
}

export async function listMessages(roomId: string, opts?: { limit?: number; before?: string }): Promise<any[]> {
  const limit = Math.min(opts?.limit || 50, 200);
  let q = `chat_messages?room_id=eq.${encodeURIComponent(roomId)}&deleted_at=is.null&order=created_at.desc&limit=${limit}`;
  if (opts?.before) q += `&created_at=lt.${encodeURIComponent(opts.before)}`;
  const data = await restGet<any[]>(q);
  const rows = Array.isArray(data) ? data : [];
  return rows.reverse();
}

export async function listRoomsForUser(userId: string): Promise<any[]> {
  const memberships = await restGet<any[]>(
    `chat_members?user_id=eq.${encodeURIComponent(userId)}&select=room_id,last_read_at,muted,role`
  );
  if (!Array.isArray(memberships) || !memberships.length) return [];
  const ids = memberships.map((m) => m.room_id);
  const inList = ids.map((id) => `"${id}"`).join(',');
  const rooms = await restGet<any[]>(`chat_rooms?id=in.(${inList})&order=last_message_at.desc.nullslast`);
  return Array.isArray(rooms) ? rooms : [];
}

export async function markRead(roomId: string, userId: string): Promise<void> {
  await restPatch(
    `chat_members?room_id=eq.${encodeURIComponent(roomId)}&user_id=eq.${encodeURIComponent(userId)}`,
    { last_read_at: new Date().toISOString() }
  );
}

export async function softDeleteMessage(messageId: string, senderId: string): Promise<boolean> {
  const data = await restPatch<any[]>(
    `chat_messages?id=eq.${encodeURIComponent(messageId)}&sender_id=eq.${encodeURIComponent(senderId)}`,
    { deleted_at: new Date().toISOString() }
  );
  return Array.isArray(data) && data.length > 0;
}
