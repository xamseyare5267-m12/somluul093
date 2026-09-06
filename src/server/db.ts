import fs from 'fs';
import { randomUUID } from 'crypto';
import path from 'path';
import bcrypt from 'bcryptjs';
import axios from 'axios';
import { Storage } from '@google-cloud/storage';
import { Profile, FileMetadata, UserRole, UserStats, AdminStats, Post, ActivityLog, Story, AppNotification, ChatRoom, ChatMessage } from '../types';
import { scheduleDualWrite } from './scale/dualWrite.js';

let gcsStorageForDb: any = null;
let gcsBucketForDb: any = null;
const gcsBucketName = process.env.GCS_BUCKET_NAME;
if (gcsBucketName) {
  try {
    gcsStorageForDb = new Storage({
      projectId: process.env.GCP_PROJECT_ID || undefined,
    });
    gcsBucketForDb = gcsStorageForDb.bucket(gcsBucketName);
  } catch (err) {
    console.error('[FileHub DB GCS] Failed to initialize GCS client inside db.ts:', err);
  }
}

// Define the DB structure
interface DBCredential {
  userId: string;
  passwordHash: string; // bcrypt password hash
}

interface DBStructure {
  profiles: Profile[];
  files: FileMetadata[];
  credentials: DBCredential[];
  posts?: Post[];
  stories?: Story[];
  system_notice?: string;
  activity_logs?: ActivityLog[];
  remote_config?: {
    secretClickTarget: number;
    dotClickTarget: number;
    editClickTarget: number;
    invisibleAreaLocation: string;
    dotLocation: string;
    appName: string;
    appLogo: string;
  };
  feature_flags?: {
    enableAiModeration: boolean;
    enableSpamDetection: boolean;
    enableAbuseDetection: boolean;
    enableVideoCalls: boolean;
    enablePaidSubscriptions: boolean;
  };
  notifications?: AppNotification[];
  chatRooms?: ChatRoom[];
  chatMessages?: ChatMessage[];
  reports?: {
    id: string;
    reporterId: string;
    targetType: 'user' | 'post' | 'comment' | 'message' | 'listing' | 'story';
    targetId: string;
    reason: string;
    details?: string;
    status: 'open' | 'reviewed' | 'resolved' | 'dismissed';
    created_at: string;
  }[];
  blockedPairs?: { blockerId: string; blockedId: string; created_at: string }[];
  pages?: any[];
  [key: string]: any;
}

// Prefer DATA_DIR env (Railway/Render volume at /data) so posts & messages survive restarts.
let DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.join(process.cwd(), 'data');
try {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  const testFile = path.join(DATA_DIR, '.write-test');
  fs.writeFileSync(testFile, 'test');
  fs.unlinkSync(testFile);
  console.log('[FileHub DB] Using data directory:', DATA_DIR);
} catch (err) {
  console.warn('[FileHub DB] Preferred data directory not writable. Falling back to /tmp/data');
  DATA_DIR = path.join('/tmp', 'data');
  try { fs.mkdirSync(DATA_DIR, { recursive: true }); } catch (_) {}
}
const DB_FILE = path.join(DATA_DIR, 'db.json');

/** In-process cache — critical on Vercel so rapid requests share the same state within a warm instance */
let memoryDbCache: DBStructure | null = null;

// Supabase Postgres is the authoritative production database. The legacy JSON shape is
// retained only as an in-process compatibility model while routes are incrementally
// migrated; it is no longer backed by a shared db.json object. Optimistic versioning plus
// a three-way merge prevents concurrent instances from overwriting each other.
let remoteStateVersion = 0;
let lastRemoteSnapshot: DBStructure | null = null;
let remoteWriteQueue: Promise<void> = Promise.resolve();

function supabaseConfig() {
  const url = getCleanSupabaseBaseUrl(process.env.SUPABASE_URL);
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  return url && key ? { url, key } : null;
}

function supabaseHeaders(key: string) {
  return { Authorization: `Bearer ${key}`, apikey: key, 'Content-Type': 'application/json' };
}

function sameValue(a: any, b: any) { return JSON.stringify(a) === JSON.stringify(b); }

function mergeConcurrent(base: any, local: any, remote: any): any {
  if (sameValue(local, base)) return structuredClone(remote);
  if (sameValue(remote, base)) return structuredClone(local);
  if (Array.isArray(base) && Array.isArray(local) && Array.isArray(remote)) {
    const idBased = [...base, ...local, ...remote].every(v => v && typeof v === 'object' && typeof v.id === 'string');
    if (!idBased) return structuredClone(local);
    const bm = new Map(base.map(v => [v.id, v]));
    const lm = new Map(local.map(v => [v.id, v]));
    const rm = new Map(remote.map(v => [v.id, v]));
    const ids = new Set([...bm.keys(), ...lm.keys(), ...rm.keys()]);
    const out: any[] = [];
    for (const id of ids) {
      const b = bm.get(id), l = lm.get(id), r = rm.get(id);
      if (!l && b) { if (sameValue(r, b)) continue; out.push(r); continue; }
      if (!r && b) { if (sameValue(l, b)) continue; out.push(l); continue; }
      if (!b) { out.push(l ?? r); continue; }
      out.push(mergeConcurrent(b, l, r));
    }
    return out;
  }
  if (base && local && remote && typeof base === 'object' && typeof local === 'object' && typeof remote === 'object') {
    const out: any = { ...remote };
    const keys = new Set([...Object.keys(base), ...Object.keys(local), ...Object.keys(remote)]);
    for (const k of keys) out[k] = mergeConcurrent(base[k], local[k], remote[k]);
    return out;
  }
  return structuredClone(local);
}

async function readRemoteState(): Promise<{ version: number; state: DBStructure } | null> {
  const cfg = supabaseConfig();
  if (!cfg) return null;
  const url = `${cfg.url}/rest/v1/app_state?id=eq.1&select=version,state`;
  const response = await axios.get(url, { headers: supabaseHeaders(cfg.key), timeout: 10000 });
  const row = Array.isArray(response.data) ? response.data[0] : response.data;
  return row ? { version: Number(row.version || 1), state: row.state as DBStructure } : null;
}

async function persistRemoteState(localState: DBStructure, baseState: DBStructure): Promise<void> {
  const cfg = supabaseConfig();
  if (!cfg) return;
  for (let attempt = 0; attempt < 8; attempt++) {
    const current = await readRemoteState();
    if (!current) {
      try {
        await axios.post(`${cfg.url}/rest/v1/app_state`, { id: 1, version: 1, state: localState }, { headers: { ...supabaseHeaders(cfg.key), Prefer: 'return=minimal' }, timeout: 10000 });
        remoteStateVersion = 1; lastRemoteSnapshot = structuredClone(localState);
        return;
      } catch (_) { continue; }
    }
    const merged = mergeConcurrent(baseState, localState, current.state);
    const nextVersion = current.version + 1;
    const response = await axios.patch(`${cfg.url}/rest/v1/app_state?id=eq.1&version=eq.${current.version}`,
      { version: nextVersion, state: merged, updated_at: new Date().toISOString() },
      { headers: { ...supabaseHeaders(cfg.key), Prefer: 'return=representation' }, timeout: 10000 });
    if (Array.isArray(response.data) && response.data.length) {
      remoteStateVersion = nextVersion;
      lastRemoteSnapshot = structuredClone(merged);
      return;
    }
    await new Promise(r => setTimeout(r, 30 * (attempt + 1)));
  }
  throw new Error('Concurrent Supabase write could not be committed after retries.');
}


/**
 * Tracks in-flight cloud writes (Supabase/GCS) started by `writeDB()`.
 *
 * Why this exists: on Vercel, `writeDB()` used to fire-and-forget the cloud
 * backup (`void pushDbToCloud(data)`), then the Express route handler would
 * immediately send the HTTP response. Vercel is allowed to freeze/kill the
 * serverless function as soon as the response is sent — it does not know an
 * "unawaited" background promise exists. That silently dropped the write to
 * Supabase, so the user's action (register, post, message, follow, ...)
 * looked successful in that single request, but never actually persisted.
 * On the next request (a new/cold instance) the data was simply gone.
 *
 * The fix: every pending cloud-write promise is registered here, and the
 * Vercel entrypoint (`api/index.ts`) awaits `flushPendingWrites()` after the
 * HTTP response has been sent but before the function is allowed to return,
 * guaranteeing the write actually reaches Supabase before the instance can
 * be frozen.
 */
const pendingCloudWrites = new Set<Promise<any>>();

function trackPendingWrite(p: Promise<any>): Promise<any> {
  pendingCloudWrites.add(p);
  const cleanup = () => pendingCloudWrites.delete(p);
  p.then(cleanup, cleanup);
  return p;
}

/** Await every in-flight cloud write. Call this before a serverless function is allowed to exit. */
export async function flushPendingWrites(): Promise<void> {
  if (pendingCloudWrites.size === 0) return;
  await Promise.allSettled(Array.from(pendingCloudWrites));
}


// Build a safe first-run database. This is also used when a deployed filesystem
// contains an empty/corrupt db.json instead of silently returning an unusable DB.
function createInitialData(): DBStructure {
  const now = new Date().toISOString();
  return {
    // Do not ship a known default admin password in production.
    // The owner account is provisioned through OWNER_PASSWORD or restored from
    // the persistent production backup.
    profiles: [],
    files: [],
    credentials: [],
    posts: [],
    stories: [],
    activity_logs: [
      {
        id: 'log_init',
        user_id: 'system',
        user_email: 'system@somluul.local',
        action: 'upload',
        details: 'System database initialized successfully.',
        created_at: now,
      },
    ],
    remote_config: {
      secretClickTarget: 7,
      dotClickTarget: 30,
      editClickTarget: 5,
      invisibleAreaLocation: 'left-of-logo',
      dotLocation: 'top-right',
      appName: 'SomLuul',
      appLogo: '/somluul_logo.png',
    },
    feature_flags: {
      enableAiModeration: true,
      enableSpamDetection: true,
      enableAbuseDetection: true,
      enableVideoCalls: true,
      enablePaidSubscriptions: true,
    },
    notifications: [],
    chatRooms: [],
    chatMessages: [],
    reports: [],
    blockedPairs: [],
  };
}

// Ensure database directory and file exist
function initializeDB(): DBStructure {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  const persistInitial = (): DBStructure => {
    const initialData = createInitialData();
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2), 'utf-8');
    } catch (err) {
      console.error('[FileHub DB] Could not persist initial database:', err);
    }
    memoryDbCache = initialData;
    return initialData;
  };

  if (!fs.existsSync(DB_FILE)) {
    return persistInitial();
  }

  try {
    const rawData = fs.readFileSync(DB_FILE, 'utf-8').trim();
    // An empty file is not a valid database. The old implementation returned
    // an empty in-memory DB here, which made all authenticated requests fail.
    if (!rawData) return persistInitial();

    const parsed = JSON.parse(rawData) as DBStructure;
    let needWrite = false;
    if (!Array.isArray(parsed.profiles)) { parsed.profiles = []; needWrite = true; }
    if (!Array.isArray(parsed.files)) { parsed.files = []; needWrite = true; }
    if (!Array.isArray(parsed.credentials)) { parsed.credentials = []; needWrite = true; }
    if (!parsed.posts) { parsed.posts = []; needWrite = true; }
    if (!parsed.stories) { parsed.stories = []; needWrite = true; }
    if (!parsed.activity_logs) { parsed.activity_logs = []; needWrite = true; }
    if (!parsed.remote_config) {
      parsed.remote_config = {
        secretClickTarget: 7,
        dotClickTarget: 30,
        editClickTarget: 5,
        invisibleAreaLocation: 'left-of-logo',
        dotLocation: 'top-right',
        appName: 'SomLuul',
        appLogo: '/somluul_logo.png'
      };
      needWrite = true;
    }
    if (!parsed.feature_flags) {
      parsed.feature_flags = {
        enableAiModeration: true,
        enableSpamDetection: true,
        enableAbuseDetection: true,
        enableVideoCalls: true,
        enablePaidSubscriptions: true
      };
      needWrite = true;
    }
    if (!parsed.notifications) { parsed.notifications = []; needWrite = true; }
    if (!parsed.chatRooms) { parsed.chatRooms = []; needWrite = true; }
    if (!parsed.chatMessages) { parsed.chatMessages = []; needWrite = true; }

    if (needWrite) {
      fs.writeFileSync(DB_FILE, JSON.stringify(parsed, null, 2), 'utf-8');
    }
    return parsed;
  } catch (error) {
    console.error('[FileHub DB] Invalid database file. Reinitializing safely:', error);
    return persistInitial();
  }
}

// Read database
export function readDB(): DBStructure {
  if (memoryDbCache) {
    return memoryDbCache;
  }
  const db = initializeDB();
  memoryDbCache = db;
  return db;
}

/**
 * On Vercel cold start, /tmp is empty. Call this before serving feed/profile
 * so we pull the latest cloud snapshot when local looks empty.
 */
export async function ensureDbHydrated(): Promise<DBStructure> {
  const current = readDB();
  const hasCloud = !!(process.env.SUPABASE_URL || process.env.GCS_BUCKET_NAME);
  if (!hasCloud) return current;

  const looksEmpty =
    (current.posts?.length || 0) === 0 &&
    (current.profiles?.length || 0) <= 1 &&
    (current.chatMessages?.length || 0) === 0;

  if (!looksEmpty) return current;

  try {
    await Promise.allSettled([syncDbFromSupabase(), (async () => {
      // GCS restore is in server.ts — optional light path via env file already handled at boot
    })()]);
    memoryDbCache = null;
    return readDB();
  } catch (_) {
    return current;
  }
}

function getCleanSupabaseBaseUrl(url: string | undefined): string {
  if (!url) return '';
  // Defensive: env vars pasted into Vercel's dashboard or a .env file often end up
  // wrapped in quotes ("https://xxx.supabase.co") or with trailing whitespace/newlines.
  // `new URL()` on that raw string either throws or silently produces the wrong host,
  // which surfaces later as a confusing `getaddrinfo ENOTFOUND` — SUPABASE_URL looking
  // "set" while every request to it still fails DNS resolution.
  let raw = url.trim();
  if ((raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'"))) {
    raw = raw.slice(1, -1).trim();
  }
  try {
    if (raw.includes('://')) {
      const parsed = new URL(raw);
      return `${parsed.protocol}//${parsed.host}`;
    }
  } catch (e) {
    console.error('[Supabase Config] SUPABASE_URL could not be parsed as a URL:', JSON.stringify(url));
  }
  let cleaned = raw.replace(/\/rest\/v1\/?$/, '');
  if (cleaned.endsWith('/')) {
    cleaned = cleaned.slice(0, -1);
  }
  return cleaned;
}

// Sync database to Supabase Storage
export async function syncDbToSupabase(): Promise<void> {
  const cfg = supabaseConfig();
  if (!cfg) return;
  const state = memoryDbCache || initializeDB();
  const base = lastRemoteSnapshot || state;
  remoteWriteQueue = remoteWriteQueue.then(() => persistRemoteState(state, base));
  await remoteWriteQueue;
}

export async function checkSupabaseHealth(): Promise<{ ok: boolean; latencyMs?: number; version?: number; error?: string }> {
  const cfg = supabaseConfig();
  if (!cfg) return { ok: false, error: 'Supabase environment is not configured.' };
  const started = Date.now();
  try {
    const remote = await readRemoteState();
    return { ok: true, latencyMs: Date.now() - started, version: remote?.version };
  } catch (error: any) {
    return { ok: false, latencyMs: Date.now() - started, error: String(error?.message || error) };
  }
}

export async function syncDbFromSupabase(): Promise<void> {
  const remote = await readRemoteState();
  if (!remote) return;
  memoryDbCache = remote.state;
  remoteStateVersion = remote.version;
  lastRemoteSnapshot = structuredClone(remote.state);
  console.log(`[Supabase DB] Loaded authoritative app_state version ${remote.version}.`);
}

/** Call after any external restore (GCS/Supabase) so warm instances pick up new file */
export function invalidateDbCache(): void {
  memoryDbCache = null;
}

function countRecords(db: DBStructure): number {
  return (db.posts?.length || 0)
    + (db.profiles?.length || 0)
    + (db.chatMessages?.length || 0)
    + (db.chatRooms?.length || 0)
    + (db.stories?.length || 0);
}

/**
 * Write database to disk + cloud.
 * On Vercel serverless, local /tmp dies between instances — cloud backup is the real store.
 * Never overwrite a richer remote DB with an empty/smaller local snapshot.
 */
export function writeDB(data: DBStructure): void {
  const base = lastRemoteSnapshot ? structuredClone(lastRemoteSnapshot) : structuredClone(memoryDbCache || data);
  memoryDbCache = data;
  const job = remoteWriteQueue.then(() => persistRemoteState(data, base));
  remoteWriteQueue = job.catch(err => {
    console.error('[Supabase DB] Authoritative write failed:', err?.message || err);
    throw err;
  });
  trackPendingWrite(remoteWriteQueue);
  // Phase 3: project high-value entities into normalized tables (SCALE_MODE=1)
  try { scheduleDualWrite(data); } catch (_) { /* never block writes */ }
}

export async function writeDBAsync(data: DBStructure): Promise<void> {
  writeDB(data);
  await flushPendingWrites();
}

// Generate unique ID helper
export function generateId(): string {
  return randomUUID();
}

// Hash password helper using bcryptjs
export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, 10);
}

// Verify password helper with backward compatibility for legacy base64 hashes
export function verifyPassword(password: string, hash: string): boolean {
  if (hash.startsWith('$2a$') || hash.startsWith('$2b$') || hash.startsWith('$2y$')) {
    try {
      return bcrypt.compareSync(password, hash);
    } catch (e) {
      return false;
    }
  }
  // Fallback to legacy base64 hash
  return Buffer.from(password).toString('base64') === hash;
}

// AUTHENTICATION UTILITIES
export function registerUser(
  email: string,
  password: string,
  firstName: string,
  lastName: string,
  role: UserRole = 'normal',
  additionalFields?: Partial<Profile>
): { success: boolean; message: string; user?: Profile } {
  const db = readDB();
  const normalizedEmail = email.toLowerCase().trim();

  // Check if user exists. Every email — including the developer's own — is
  // subject to the same uniqueness rule. Real admin access is granted only
  // through the dedicated /api/owner/auth/validate flow (OWNER_USERNAME /
  // OWNER_PASSWORD env vars), never by registering through the public
  // sign-up form with a specific hardcoded address.
  if (db.profiles.some(p => p.email === normalizedEmail)) {
    return { success: false, message: 'Email already registered.' };
  }

  const userId = generateId();

  const newUser: Profile = {
    id: userId,
    email: normalizedEmail,
    first_name: firstName,
    last_name: lastName,
    avatar: null,
    role,
    blocked: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    login_method: 'email',
    devices: [],
    ...additionalFields
  };

  db.profiles.push(newUser);
  db.credentials.push({
    userId,
    passwordHash: hashPassword(password),
  });

  writeDB(db);
  return { success: true, message: 'Registration successful!', user: newUser };
}

export function authenticateUser(email: string, password: string): { success: boolean; message: string; user?: Profile } {
  const db = readDB();
  const normalizedEmail = email.toLowerCase().trim();

  const user = db.profiles.find(p => p.email === normalizedEmail);
  if (!user) {
    return { success: false, message: 'Invalid email or password.' };
  }

  if (user.blocked) {
    return { success: false, message: 'Your account has been blocked by an administrator.' };
  }

  const credential = db.credentials.find(c => c.userId === user.id);
  if (!credential || !verifyPassword(password, credential.passwordHash)) {
    return { success: false, message: 'Invalid email or password.' };
  }

  // Transparently upgrade legacy base64 password records to bcrypt after a successful login.
  if (!credential.passwordHash.startsWith('$2')) {
    credential.passwordHash = hashPassword(password);
  }

  // Update last login
  user.last_login = new Date().toISOString();
  writeDB(db);

  return { success: true, message: 'Login successful!', user };
}

export function resetUserPassword(email: string, newPassword: string): { success: boolean; message: string } {
  const db = readDB();
  const normalizedEmail = email.toLowerCase().trim();

  const user = db.profiles.find(p => p.email === normalizedEmail);
  if (!user) {
    return { success: false, message: 'User not found.' };
  }

  const credential = db.credentials.find(c => c.userId === user.id);
  if (credential) {
    credential.passwordHash = hashPassword(newPassword);
    user.updated_at = new Date().toISOString();
    writeDB(db);
    return { success: true, message: 'Password reset successful!' };
  }

  return { success: false, message: 'Could not reset password.' };
}

// Find or Create user for Social logins (Google, Facebook, Apple)
export function findOrCreateSocialUser(
  method: 'google' | 'facebook' | 'apple',
  email: string,
  firstName: string,
  lastName: string,
  avatar: string | null
): Profile {
  const db = readDB();
  const normalizedEmail = email.toLowerCase().trim();

  let user = db.profiles.find(p => p.email === normalizedEmail);
  
  if (user) {
    // Update existing user's last login and login method if not set
    user.last_login = new Date().toISOString();
    if (!user.login_method) user.login_method = method;
    if (avatar && !user.avatar) user.avatar = avatar;
    writeDB(db);
    return user;
  }

  // Create new social user
  const userId = generateId();

  const newUser: Profile = {
    id: userId,
    email: normalizedEmail,
    first_name: firstName,
    last_name: lastName,
    avatar: avatar || null,
    role: 'normal',
    blocked: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    login_method: method,
    email_verified: true, // Social logins are pre-verified
    last_login: new Date().toISOString(),
    devices: [],
    username: normalizedEmail.split('@')[0] + randomUUID().replace(/-/g, '').slice(0, 3),
    is_username_custom: false
  };

  db.profiles.push(newUser);
  // Add an empty or random credential hash just to satisfy constraint
  db.credentials.push({
    userId,
    passwordHash: hashPassword(randomUUID()),
  });

  writeDB(db);
  return newUser;
}

// Track logged-in devices
export function trackUserDevice(
  userId: string,
  device: { id: string; name: string; ip: string; last_active: string; location: string }
): void {
  const db = readDB();
  const user = db.profiles.find(p => p.id === userId);
  if (user) {
    if (!user.devices) user.devices = [];
    
    // Remove if there's an existing session for this same device ID
    user.devices = user.devices.filter(d => d.id !== device.id);
    
    // Add new device session
    user.devices.push(device);
    writeDB(db);
  }
}

// Remove specific device session
export function removeUserDevice(userId: string, deviceId: string): void {
  const db = readDB();
  const user = db.profiles.find(p => p.id === userId);
  if (user && user.devices) {
    user.devices = user.devices.filter(d => d.id !== deviceId);
    writeDB(db);
  }
}

// Logout from all devices
export function removeAllUserDevices(userId: string): void {
  const db = readDB();
  const user = db.profiles.find(p => p.id === userId);
  if (user) {
    user.devices = [];
    writeDB(db);
  }
}

// PROFILE UTILITIES
export function updateProfile(
  userId: string,
  updates: Partial<Profile>
): { success: boolean; user?: Profile } {
  const db = readDB();
  const userIndex = db.profiles.findIndex(p => p.id === userId);

  if (userIndex === -1) {
    return { success: false };
  }

  db.profiles[userIndex] = {
    ...db.profiles[userIndex],
    ...updates,
    updated_at: new Date().toISOString(),
  };

  const updatedUser = db.profiles[userIndex];

  // Synchronize post author avatar and name across all user posts
  if (updates.avatar || updates.first_name || updates.last_name) {
    const handlePrefix = (updatedUser.email || '').split('@')[0].toLowerCase();
    const customHandle = (updatedUser.username || '').toLowerCase();

    if (db.posts) {
      db.posts.forEach(post => {
        const postHandle = (post.author?.handle || '').toLowerCase();
        if (
          postHandle === handlePrefix ||
          (customHandle && postHandle === customHandle) ||
          post.author?.name === `${updatedUser.first_name} ${updatedUser.last_name}`
        ) {
          if (updates.avatar) post.author.avatar = updates.avatar;
          if (updates.first_name || updates.last_name) {
            post.author.name = `${updatedUser.first_name} ${updatedUser.last_name}`;
          }
        }
      });
    }
  }

  writeDB(db);
  return { success: true, user: db.profiles[userIndex] };
}

export function toggleFollowUser(
  followerId: string,
  targetId: string
): { success: boolean; isFollowing: boolean; follower?: Profile; target?: Profile } {
  const db = readDB();
  const followerIndex = db.profiles.findIndex(p => p.id === followerId);
  const targetIndex = db.profiles.findIndex(p => p.id === targetId);

  if (followerIndex === -1 || targetIndex === -1) {
    return { success: false, isFollowing: false };
  }

  const follower = db.profiles[followerIndex];
  const target = db.profiles[targetIndex];

  if (!follower.following) follower.following = [];
  if (!target.followers) target.followers = [];

  const followingIndex = follower.following.indexOf(targetId);
  let isFollowing = false;

  if (followingIndex > -1) {
    // Unfollow
    follower.following.splice(followingIndex, 1);
    const followerIdxInTarget = target.followers.indexOf(followerId);
    if (followerIdxInTarget > -1) {
      target.followers.splice(followerIdxInTarget, 1);
    }
    isFollowing = false;
  } else {
    // Follow
    follower.following.push(targetId);
    target.followers.push(followerId);
    isFollowing = true;
  }

  // Update counts
  follower.followersCount = follower.followers ? follower.followers.length : 0;
  follower.followingCount = follower.following ? follower.following.length : 0;
  target.followersCount = target.followers ? target.followers.length : 0;
  target.followingCount = target.following ? target.following.length : 0;

  follower.updated_at = new Date().toISOString();
  target.updated_at = new Date().toISOString();

  writeDB(db);
  return { success: true, isFollowing, follower, target };
}

export function toggleBlockUser(userId: string): { success: boolean; blocked: boolean } {
  const db = readDB();
  const user = db.profiles.find(p => p.id === userId);

  if (!user) {
    return { success: false, blocked: false };
  }

  user.blocked = !user.blocked;
  user.updated_at = new Date().toISOString();
  writeDB(db);
  return { success: true, blocked: user.blocked };
}

export function deleteUserAccount(userId: string): boolean {
  const db = readDB();
  const initialCount = db.profiles.length;

  db.profiles = db.profiles.filter(p => p.id !== userId);
  db.credentials = db.credentials.filter(c => c.userId !== userId);

  // Also delete their files
  const userFiles = db.files.filter(f => f.user_id === userId);
  userFiles.forEach(f => {
    try {
      const fullPath = path.join(process.cwd(), f.storage_path);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
    } catch (e) {
      console.error('Error deleting physical file', e);
    }
  });

  db.files = db.files.filter(f => f.user_id !== userId);
  writeDB(db);

  return db.profiles.length < initialCount;
}

// FILE UTILITIES
export function saveFileRecord(file: Omit<FileMetadata, 'id' | 'created_at'>): FileMetadata {
  const db = readDB();
  const newFile: FileMetadata = {
    ...file,
    id: generateId(),
    created_at: new Date().toISOString(),
  };

  db.files.push(newFile);
  writeDB(db);
  return newFile;
}

export function deleteFileRecord(fileId: string): { success: boolean; file?: FileMetadata } {
  const db = readDB();
  const fileIndex = db.files.findIndex(f => f.id === fileId);

  if (fileIndex === -1) {
    return { success: false };
  }

  const file = db.files[fileIndex];

  // Delete physical file
  try {
    const fullPath = path.join(process.cwd(), file.storage_path);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
  } catch (error) {
    console.error('Physical file deletion error', error);
  }

  db.files.splice(fileIndex, 1);
  writeDB(db);
  return { success: true, file };
}

export function deleteUserFiles(userId: string): number {
  const db = readDB();
  const filesToDelete = db.files.filter(f => f.user_id === userId);

  filesToDelete.forEach(file => {
    try {
      const fullPath = path.join(process.cwd(), file.storage_path);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
    } catch (e) {
      console.error('Error deleting physical file', e);
    }
  });

  const initialCount = db.files.length;
  db.files = db.files.filter(f => f.user_id !== userId);
  writeDB(db);

  return initialCount - db.files.length;
}

// STATS UTILITIES
export function getUserStats(userId: string): UserStats {
  const db = readDB();
  const userFiles = db.files.filter(f => f.user_id === userId);

  const totalFiles = userFiles.length;
  const totalSize = userFiles.reduce((acc, f) => acc + f.file_size, 0);

  const imagesCount = userFiles.filter(f => f.mime_type.startsWith('image/')).length;
  const videosCount = userFiles.filter(f => f.mime_type.startsWith('video/')).length;
  const documentsCount = totalFiles - imagesCount - videosCount;

  // Staggered recent uploads (last 5)
  const recentUploads = [...userFiles]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  return {
    totalFiles,
    totalSize,
    imagesCount,
    documentsCount,
    videosCount,
    recentUploads,
  };
}

export function getAdminStats(): AdminStats {
  const db = readDB();
  const totalUsers = db.profiles.filter(p => p.role !== 'admin').length;
  const blockedUsers = db.profiles.filter(p => p.blocked && p.role !== 'admin').length;
  const totalFiles = db.files.length;
  const totalSize = db.files.reduce((acc, f) => acc + f.file_size, 0);

  const recentUsers = [...db.profiles]
    .filter(p => p.role !== 'admin')
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  const recentUploads = [...db.files]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  return {
    totalUsers,
    blockedUsers,
    totalFiles,
    totalSize,
    recentUsers,
    recentUploads,
  };
}

// ACTIVITY LOGGING UTILITIES
export function logActivity(
  userId: string,
  userEmail: string,
  action: 'upload' | 'download' | 'preview' | 'delete' | 'profile_update' | 'follow' | 'block' | 'unblock',
  details: string
): ActivityLog {
  const db = readDB();
  if (!db.activity_logs) {
    db.activity_logs = [];
  }

  const newLog: ActivityLog = {
    id: generateId(),
    user_id: userId,
    user_email: userEmail,
    action,
    details,
    created_at: new Date().toISOString(),
  };

  db.activity_logs.push(newLog);
  writeDB(db);
  return newLog;
}

export function getActivityLogs(userId?: string): ActivityLog[] {
  const db = readDB();
  const logs = db.activity_logs || [];
  
  if (userId) {
    return logs.filter(log => log.user_id === userId);
  }
  return logs;
}


/** Send / cancel / accept / decline friend request */
export function manageFriendRequest(
  fromId: string,
  toId: string,
  action: 'send' | 'cancel' | 'accept' | 'decline' | 'unfriend'
): { success: boolean; message: string; state?: string } {
  const db = readDB();
  const from = db.profiles.find(p => p.id === fromId);
  const to = db.profiles.find(p => p.id === toId);
  if (!from || !to) return { success: false, message: 'User not found' };
  if (fromId === toId) return { success: false, message: 'Invalid target' };

  from.friends = from.friends || [];
  from.friendRequests = from.friendRequests || [];
  to.friends = to.friends || [];
  to.friendRequests = to.friendRequests || [];

  if (action === 'send') {
    if (from.friends.includes(toId) || to.friends.includes(fromId)) {
      return { success: false, message: 'Already friends', state: 'friends' };
    }
    if (to.friendRequests.includes(fromId)) {
      return { success: false, message: 'Request already sent', state: 'sent' };
    }
    // If they already sent us a request, auto-accept
    if (from.friendRequests.includes(toId)) {
      from.friendRequests = from.friendRequests.filter(id => id !== toId);
      to.friendRequests = to.friendRequests.filter(id => id !== fromId);
      if (!from.friends.includes(toId)) from.friends.push(toId);
      if (!to.friends.includes(fromId)) to.friends.push(fromId);
      writeDB(db);
      return { success: true, message: 'Friend request accepted', state: 'friends' };
    }
    to.friendRequests.push(fromId);
    writeDB(db);
    return { success: true, message: 'Friend request sent', state: 'sent' };
  }

  if (action === 'cancel') {
    to.friendRequests = to.friendRequests.filter(id => id !== fromId);
    writeDB(db);
    return { success: true, message: 'Request cancelled', state: 'none' };
  }

  if (action === 'accept') {
    if (!from.friendRequests.includes(toId)) {
      return { success: false, message: 'No pending request', state: 'none' };
    }
    from.friendRequests = from.friendRequests.filter(id => id !== toId);
    to.friendRequests = to.friendRequests.filter(id => id !== fromId);
    if (!from.friends.includes(toId)) from.friends.push(toId);
    if (!to.friends.includes(fromId)) to.friends.push(fromId);
    writeDB(db);
    return { success: true, message: 'You are now friends', state: 'friends' };
  }

  if (action === 'decline') {
    from.friendRequests = from.friendRequests.filter(id => id !== toId);
    writeDB(db);
    return { success: true, message: 'Request declined', state: 'none' };
  }

  if (action === 'unfriend') {
    from.friends = from.friends.filter(id => id !== toId);
    to.friends = to.friends.filter(id => id !== fromId);
    from.friendRequests = from.friendRequests.filter(id => id !== toId);
    to.friendRequests = to.friendRequests.filter(id => id !== fromId);
    writeDB(db);
    return { success: true, message: 'Unfriended', state: 'none' };
  }

  return { success: false, message: 'Unknown action' };
}

export function createReport(input: {
  reporterId: string;
  targetType: 'user' | 'post' | 'comment' | 'message' | 'listing' | 'story';
  targetId: string;
  reason: string;
  details?: string;
}): { success: boolean; report?: any } {
  const db = readDB();
  if (!db.reports) db.reports = [];
  const report = {
    id: randomUUID(),
    reporterId: input.reporterId,
    targetType: input.targetType,
    targetId: input.targetId,
    reason: input.reason || 'other',
    details: input.details || '',
    status: 'open' as const,
    created_at: new Date().toISOString(),
  };
  db.reports.unshift(report);
  writeDB(db);
  return { success: true, report };
}

export function blockUserPair(blockerId: string, blockedId: string): { success: boolean } {
  if (blockerId === blockedId) return { success: false };
  const db = readDB();
  if (!db.blockedPairs) db.blockedPairs = [];
  const exists = db.blockedPairs.some(p => p.blockerId === blockerId && p.blockedId === blockedId);
  if (!exists) {
    db.blockedPairs.push({ blockerId, blockedId, created_at: new Date().toISOString() });
  }
  // Also unfollow both ways
  const blocker = db.profiles.find(p => p.id === blockerId);
  const blocked = db.profiles.find(p => p.id === blockedId);
  if (blocker?.following) blocker.following = blocker.following.filter(id => id !== blockedId);
  if (blocked?.followers) blocked.followers = blocked.followers.filter(id => id !== blockerId);
  if (blocker?.friends) blocker.friends = blocker.friends.filter(id => id !== blockedId);
  if (blocked?.friends) blocked.friends = blocked.friends.filter(id => id !== blockerId);
  writeDB(db);
  return { success: true };
}

export function unblockUserPair(blockerId: string, blockedId: string): { success: boolean } {
  const db = readDB();
  if (!db.blockedPairs) db.blockedPairs = [];
  db.blockedPairs = db.blockedPairs.filter(p => !(p.blockerId === blockerId && p.blockedId === blockedId));
  writeDB(db);
  return { success: true };
}

export function isBlockedEitherWay(a: string, b: string): boolean {
  const db = readDB();
  if (!db.blockedPairs) return false;
  return db.blockedPairs.some(
    p => (p.blockerId === a && p.blockedId === b) || (p.blockerId === b && p.blockedId === a)
  );
}
