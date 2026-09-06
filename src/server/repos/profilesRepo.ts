/**
 * Profiles + social graph repository.
 */
import { restGet, restPost, restPatch, restDelete, isScaleMode, supabaseConfig } from '../scale/supabaseRest.js';

export function canUseProfilesRepo(): boolean {
  return isScaleMode() && !!supabaseConfig();
}

export async function upsertProfile(profile: Record<string, unknown>): Promise<any> {
  const data = await restPost('profiles', profile, {
    prefer: 'resolution=merge-duplicates,return=representation',
  });
  return Array.isArray(data) ? data[0] : data;
}

export async function getProfileById(id: string): Promise<any | null> {
  const data = await restGet<any[]>(`profiles?id=eq.${encodeURIComponent(id)}&limit=1`);
  return Array.isArray(data) && data[0] ? data[0] : null;
}

export async function getProfileByEmail(email: string): Promise<any | null> {
  const data = await restGet<any[]>(`profiles?email=eq.${encodeURIComponent(email)}&limit=1`);
  return Array.isArray(data) && data[0] ? data[0] : null;
}

export async function getProfileByUsername(username: string): Promise<any | null> {
  const data = await restGet<any[]>(`profiles?username=eq.${encodeURIComponent(username)}&limit=1`);
  return Array.isArray(data) && data[0] ? data[0] : null;
}

export async function searchProfiles(q: string, limit = 20): Promise<any[]> {
  const term = q.replace(/%/g, '').slice(0, 64);
  if (!term) return [];
  // PostgREST or filter — simple ilike on username/first/last
  const data = await restGet<any[]>(
    `profiles?or=(username.ilike.*${encodeURIComponent(term)}*,first_name.ilike.*${encodeURIComponent(term)}*,last_name.ilike.*${encodeURIComponent(term)}*)&limit=${limit}`
  );
  return Array.isArray(data) ? data : [];
}

export async function follow(followerId: string, followingId: string): Promise<void> {
  if (followerId === followingId) return;
  await restPost(
    'follows',
    { follower_id: followerId, following_id: followingId, created_at: new Date().toISOString() },
    { prefer: 'resolution=ignore-duplicates,return=minimal' }
  );
}

export async function unfollow(followerId: string, followingId: string): Promise<void> {
  await restDelete(
    `follows?follower_id=eq.${encodeURIComponent(followerId)}&following_id=eq.${encodeURIComponent(followingId)}`
  );
}

export async function listFollowers(userId: string, limit = 50): Promise<string[]> {
  const data = await restGet<any[]>(
    `follows?following_id=eq.${encodeURIComponent(userId)}&select=follower_id&limit=${limit}`
  );
  return Array.isArray(data) ? data.map((r) => r.follower_id) : [];
}

export async function listFollowing(userId: string, limit = 50): Promise<string[]> {
  const data = await restGet<any[]>(
    `follows?follower_id=eq.${encodeURIComponent(userId)}&select=following_id&limit=${limit}`
  );
  return Array.isArray(data) ? data.map((r) => r.following_id) : [];
}

export async function blockUser(blockerId: string, blockedId: string): Promise<void> {
  await restPost(
    'blocks',
    { blocker_id: blockerId, blocked_id: blockedId, created_at: new Date().toISOString() },
    { prefer: 'resolution=ignore-duplicates,return=minimal' }
  );
  await unfollow(blockerId, blockedId);
  await unfollow(blockedId, blockerId);
}

export async function unblockUser(blockerId: string, blockedId: string): Promise<void> {
  await restDelete(
    `blocks?blocker_id=eq.${encodeURIComponent(blockerId)}&blocked_id=eq.${encodeURIComponent(blockedId)}`
  );
}

export async function isBlocked(a: string, b: string): Promise<boolean> {
  const data = await restGet<any[]>(
    `blocks?or=(and(blocker_id.eq.${encodeURIComponent(a)},blocked_id.eq.${encodeURIComponent(b)}),and(blocker_id.eq.${encodeURIComponent(b)},blocked_id.eq.${encodeURIComponent(a)}))&limit=1`
  );
  return Array.isArray(data) && data.length > 0;
}

export async function setOnline(userId: string, online: boolean): Promise<void> {
  await restPatch(`profiles?id=eq.${encodeURIComponent(userId)}`, {
    is_online: online,
    last_seen_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
}

export async function saveCredential(userId: string, passwordHash: string): Promise<void> {
  await restPost(
    'credentials',
    { user_id: userId, password_hash: passwordHash, updated_at: new Date().toISOString() },
    { prefer: 'resolution=merge-duplicates,return=minimal' }
  );
}

export async function getCredential(userId: string): Promise<string | null> {
  const data = await restGet<any[]>(`credentials?user_id=eq.${encodeURIComponent(userId)}&limit=1`);
  return Array.isArray(data) && data[0] ? data[0].password_hash : null;
}
