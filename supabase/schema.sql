-- SomLuul Production Schema (Supabase Postgres)
-- Run once in Supabase SQL Editor. This is the long-term source of truth
-- instead of a single JSON file (which fails under serverless / multi-instance).


-- Authoritative application state for the compatibility API.
-- This replaces the old shared db.json/GCS snapshot as the production source of truth.
-- version is used for optimistic concurrency so multiple app instances cannot silently
-- overwrite one another.
create table if not exists app_state (
  id integer primary key check (id = 1),
  version bigint not null default 1,
  state jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table app_state enable row level security;

-- Profiles
create table if not exists profiles (
  id text primary key,
  email text unique,
  username text unique,
  first_name text,
  last_name text,
  avatar text,
  cover_photo text,
  bio text,
  phone text,
  country text,
  city text,
  website text,
  gender text,
  dob text,
  work text,
  role text default 'normal',
  blocked boolean default false,
  email_verified boolean default false,
  phone_verified boolean default false,
  followers jsonb default '[]',
  following jsonb default '[]',
  friends jsonb default '[]',
  friend_requests jsonb default '[]',
  devices jsonb default '[]',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_profiles_username on profiles (lower(username));
create index if not exists idx_profiles_email on profiles (lower(email));

-- Auth credentials (password hashes only — never store plain passwords)
create table if not exists credentials (
  user_id text primary key references profiles(id) on delete cascade,
  password_hash text not null
);

-- Posts (feed) — never disappear
create table if not exists posts (
  id text primary key,
  author_id text references profiles(id),
  author jsonb not null,
  content text default '',
  media_type text default 'text',
  media_url text,
  media_list jsonb default '[]',
  reactions jsonb default '{}',
  comments jsonb default '[]',
  shares int default 0,
  is_pinned boolean default false,
  is_sponsored boolean default false,
  created_at timestamptz default now()
);

create index if not exists idx_posts_created on posts (created_at desc);
create index if not exists idx_posts_author on posts (author_id);

-- Chat rooms
create table if not exists chat_rooms (
  id text primary key,
  name text,
  avatar text,
  is_group boolean default false,
  members jsonb default '[]',
  last_message text,
  last_message_time timestamptz,
  created_at timestamptz default now()
);

-- Chat messages — durable
create table if not exists chat_messages (
  id text primary key,
  room_id text not null references chat_rooms(id) on delete cascade,
  sender_id text,
  sender_name text,
  content text,
  type text default 'text',
  media_url text,
  created_at timestamptz default now(),
  meta jsonb default '{}'
);

create index if not exists idx_messages_room_time on chat_messages (room_id, created_at desc);

-- Notifications
create table if not exists notifications (
  id text primary key,
  user_id text not null,
  type text,
  title text,
  body text,
  data jsonb default '{}',
  read boolean default false,
  created_at timestamptz default now()
);

create index if not exists idx_noti_user on notifications (user_id, created_at desc);

-- WebRTC signaling (short-lived; can also use Supabase Realtime channels)
create table if not exists webrtc_signals (
  id text primary key,
  room_id text not null,
  from_user_id text not null,
  target_user_id text,
  type text not null,
  call_type text,
  from_name text,
  sdp jsonb,
  candidate jsonb,
  created_at timestamptz default now()
);

create index if not exists idx_webrtc_room on webrtc_signals (room_id, created_at desc);

-- Auto-clean old signals (keep last 10 minutes)
-- Run via pg_cron or app job:
-- delete from webrtc_signals where created_at < now() - interval '10 minutes';

-- Enable Realtime for instant chat (Supabase Dashboard → Database → Replication)
-- alter publication supabase_realtime add table chat_messages;
-- alter publication supabase_realtime add table webrtc_signals;
-- alter publication supabase_realtime add table notifications;



-- ================================================================
-- Normalized high-volume social graph
-- These tables are the durable row-level source for new production data.
-- They intentionally avoid storing follower/following graphs as JSON arrays.
-- ================================================================
create table if not exists follows (
  follower_id text not null references profiles(id) on delete cascade,
  following_id text not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);
create index if not exists idx_follows_following on follows(following_id, created_at desc);

create table if not exists post_reactions (
  post_id text not null references posts(id) on delete cascade,
  user_id text not null references profiles(id) on delete cascade,
  reaction text not null,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);
create index if not exists idx_post_reactions_user on post_reactions(user_id, created_at desc);

create table if not exists post_comments (
  id text primary key,
  post_id text not null references posts(id) on delete cascade,
  user_id text not null references profiles(id) on delete cascade,
  parent_id text references post_comments(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_comments_post_time on post_comments(post_id, created_at desc);
create index if not exists idx_comments_parent on post_comments(parent_id);

create table if not exists chat_members (
  room_id text not null references chat_rooms(id) on delete cascade,
  user_id text not null references profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  last_read_at timestamptz,
  role text not null default 'member',
  primary key (room_id, user_id)
);
create index if not exists idx_chat_members_user on chat_members(user_id, joined_at desc);

create table if not exists message_receipts (
  message_id text not null references chat_messages(id) on delete cascade,
  user_id text not null references profiles(id) on delete cascade,
  delivered_at timestamptz,
  read_at timestamptz,
  primary key (message_id, user_id)
);

create table if not exists reports_normalized (
  id text primary key,
  reporter_id text not null references profiles(id) on delete cascade,
  target_type text not null check (target_type in ('user','post','comment','message','listing','story')),
  target_id text not null,
  reason text not null,
  details text,
  status text not null default 'open' check (status in ('open','reviewed','resolved','dismissed')),
  created_at timestamptz not null default now()
);
create index if not exists idx_reports_status_time on reports_normalized(status, created_at desc);

create table if not exists user_sessions (
  id text primary key,
  user_id text not null references profiles(id) on delete cascade,
  token_hash text not null unique,
  device_id text,
  user_agent text,
  ip_hash text,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_sessions_user_active on user_sessions(user_id, expires_at desc) where revoked_at is null;

create table if not exists idempotency_keys (
  user_id text not null references profiles(id) on delete cascade,
  key text not null,
  request_hash text not null,
  response_status integer,
  response_body jsonb,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  primary key (user_id, key)
);
create index if not exists idx_idempotency_expiry on idempotency_keys(expires_at);

create table if not exists wallet_ledger (
  id text primary key,
  user_id text not null references profiles(id) on delete cascade,
  amount numeric(20,4) not null,
  currency text not null,
  kind text not null,
  reference_id text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index if not exists idx_wallet_user_time on wallet_ledger(user_id, created_at desc);

create table if not exists payment_events (
  provider text not null,
  event_id text not null,
  event_type text not null,
  payload_hash text not null,
  processed_at timestamptz not null default now(),
  primary key (provider, event_id)
);

-- Storage buckets (create in Dashboard if missing):
-- 1) files-bucket  (private) — media, documents, voice notes
-- 2) avatars       (public)  — profile pictures
