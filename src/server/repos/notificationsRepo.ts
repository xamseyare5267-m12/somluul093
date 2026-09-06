/**
 * Notifications repository — per-user inbox table.
 */
import { randomUUID } from 'crypto';
import { restGet, restPost, restPatch, isScaleMode, supabaseConfig } from '../scale/supabaseRest.js';

export function canUseNotificationsRepo(): boolean {
  return isScaleMode() && !!supabaseConfig();
}

export async function pushNotification(input: {
  userId: string;
  type: string;
  title: string;
  body?: string;
  data?: Record<string, unknown>;
}): Promise<any> {
  const row = {
    id: randomUUID(),
    user_id: input.userId,
    type: input.type,
    title: input.title,
    body: input.body || null,
    data: input.data || {},
    created_at: new Date().toISOString(),
  };
  const data = await restPost('notifications', row);
  return Array.isArray(data) ? data[0] : data;
}

export async function listNotifications(userId: string, limit = 40): Promise<any[]> {
  const q = `notifications?user_id=eq.${encodeURIComponent(userId)}&order=created_at.desc&limit=${Math.min(limit, 100)}`;
  const data = await restGet<any[]>(q);
  return Array.isArray(data) ? data : [];
}

export async function markNotificationRead(id: string, userId: string): Promise<void> {
  await restPatch(
    `notifications?id=eq.${encodeURIComponent(id)}&user_id=eq.${encodeURIComponent(userId)}`,
    { read_at: new Date().toISOString() }
  );
}

export async function markAllRead(userId: string): Promise<void> {
  await restPatch(`notifications?user_id=eq.${encodeURIComponent(userId)}&read_at=is.null`, {
    read_at: new Date().toISOString(),
  });
}
