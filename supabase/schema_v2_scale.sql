-- =============================================================================
-- SomLuul Scale Schema v2
-- Normalized, indexed, RLS-ready tables for production at serious concurrency.
-- Run AFTER schema.sql (or as a full replacement in a fresh project).
--
-- Design goals (Facebook / WhatsApp / TikTok style patterns):
-- 1. Row-level tables for high-write domains (not one JSONB blob)
-- 2. Indexes for feed, chat, presence, search
-- 3. Soft-delete + tombstones where needed
-- 4. Idempotency keys for safe retries
-- 5. Wallet ledger append-only
-- 6. WebRTC signals with TTL
-- 7. Partition-ready timestamps
-- =============================================================================

-- Enable useful extensions
create extension if not exists "pgcrypto";
create extension if not exists "pg_trgm";

-- ---------------------------------------------------------------------------
-- Profiles (canonical user row)
-- ---------------------------------------------------------------------------
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
  role text not null default 'normal',
  blocked boolean not null default false,
  email_verified boolean not null default false,
  phone_verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_seen_at timestamptz,
  is_online boolean not null default false
);

create index if not exists idx_profiles_username_trgm on profiles using gin (username gin_trgm_ops);
create index if not exists idx_profiles_email_lower on profiles (lower(email));
create index if not exists idx_profiles_last_seen on profiles (last_seen_at desc nulls last);

-- Auth credentials (never expose to browser)
create table if not exists credentials (
  user_id text primary key references profiles(id) on delete cascade,
  password_hash text not null,
  updated_at timestamptz not null default now()
);

-- Social graph edges (follows / friends / blocks) — WhatsApp/FB style adjacency
create table if not exists follows (
  follower_id text not null references profiles(id) on delete cascade,
  following_id text not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);
create index if not exists idx_follows_following on follows (following_id, created_at desc);

create table if not exists friendships (
  user_a text not null references profiles(id) on delete cascade,
  user_b text not null references profiles(id) on delete cascade,
  status text not null default 'pending', -- pending | accepted | declined
  requested_by text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_a, user_b),
  check (user_a < user_b)
);
create index if not exists idx_friendships_status on friendships (status, updated_at desc);

create table if not exists blocks (
  blocker_id text not null references profiles(id) on delete cascade,
  blocked_id text not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);
create index if not exists idx_blocks_blocked on blocks (blocked_id);

-- ---------------------------------------------------------------------------
-- Posts / Feed (TikTok + Facebook style)
-- ---------------------------------------------------------------------------
create table if not exists posts (
  id text primary key,
  author_id text not null references profiles(id) on delete cascade,
  content text not null default '',
  media_type text not null default 'text', -- text | image | video | mixed
  media_url text,
  media_list jsonb not null default '[]'::jsonb,
  shares int not null default 0,
  is_pinned boolean not null default false,
  is_sponsored boolean not null default false,
  visibility text not null default 'public', -- public | friends | private
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_posts_feed on posts (created_at desc) where deleted_at is null;
create index if not exists idx_posts_author_feed on posts (author_id, created_at desc) where deleted_at is null;
create index if not exists idx_posts_video_reels on posts (created_at desc) where media_type in ('video','mixed') and deleted_at is null;

create table if not exists post_reactions (
  post_id text not null references posts(id) on delete cascade,
  user_id text not null references profiles(id) on delete cascade,
  reaction text not null default 'like',
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);
create index if not exists idx_post_reactions_user on post_reactions (user_id, created_at desc);

create table if not exists post_comments (
  id text primary key,
  post_id text not null references posts(id) on delete cascade,
  author_id text not null references profiles(id) on delete cascade,
  parent_id text references post_comments(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists idx_comments_post on post_comments (post_id, created_at) where deleted_at is null;

-- Stories (24h ephemeral)
create table if not exists stories (
  id text primary key,
  author_id text not null references profiles(id) on delete cascade,
  media_url text not null,
  media_type text not null default 'image',
  caption text,
  viewers jsonb not null default '[]'::jsonb,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
-- PostgreSQL does not allow now() in an index predicate (it is not immutable).
-- Index expires_at directly; queries should filter expires_at > now() at runtime.
create index if not exists idx_stories_expires_at on stories (expires_at);
create index if not exists idx_stories_author on stories (author_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Messenger (WhatsApp / Telegram style)
-- ---------------------------------------------------------------------------
create table if not exists chat_rooms (
  id text primary key,
  kind text not null default 'dm', -- dm | group
  name text,
  avatar text,
  created_by text references profiles(id),
  last_message_at timestamptz,
  last_message_preview text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_chat_rooms_last on chat_rooms (last_message_at desc nulls last);

create table if not exists chat_members (
  room_id text not null references chat_rooms(id) on delete cascade,
  user_id text not null references profiles(id) on delete cascade,
  role text not null default 'member', -- member | admin | owner
  joined_at timestamptz not null default now(),
  muted boolean not null default false,
  last_read_at timestamptz,
  primary key (room_id, user_id)
);
create index if not exists idx_chat_members_user on chat_members (user_id, joined_at desc);

create table if not exists chat_messages (
  id text primary key,
  room_id text not null references chat_rooms(id) on delete cascade,
  sender_id text not null references profiles(id) on delete cascade,
  body text not null default '',
  media_url text,
  media_type text, -- image | video | audio | file | voice_note
  reply_to_id text references chat_messages(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  edited_at timestamptz,
  deleted_at timestamptz
);
create index if not exists idx_chat_messages_room on chat_messages (room_id, created_at desc) where deleted_at is null;
create index if not exists idx_chat_messages_sender on chat_messages (sender_id, created_at desc);

create table if not exists message_receipts (
  message_id text not null references chat_messages(id) on delete cascade,
  user_id text not null references profiles(id) on delete cascade,
  status text not null default 'delivered', -- delivered | read
  at timestamptz not null default now(),
  primary key (message_id, user_id)
);

-- ---------------------------------------------------------------------------
-- Notifications
-- ---------------------------------------------------------------------------
create table if not exists notifications (
  id text primary key,
  user_id text not null references profiles(id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  data jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_notifications_user on notifications (user_id, created_at desc);
create index if not exists idx_notifications_unread on notifications (user_id, created_at desc) where read_at is null;

-- ---------------------------------------------------------------------------
-- WebRTC signaling (dedicated call infrastructure table + TTL cleanup)
-- ---------------------------------------------------------------------------
create table if not exists webrtc_signals (
  id text primary key,
  room_id text not null,
  from_user_id text not null references profiles(id) on delete cascade,
  target_user_id text references profiles(id) on delete cascade,
  type text not null, -- offer | answer | ice | hangup | ring
  call_type text, -- voice | video
  sdp text,
  candidate jsonb,
  from_name text,
  consumed_by text[] not null default '{}',
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '2 minutes')
);
create index if not exists idx_webrtc_target on webrtc_signals (target_user_id, created_at desc);
create index if not exists idx_webrtc_room on webrtc_signals (room_id, created_at);
create index if not exists idx_webrtc_expires on webrtc_signals (expires_at);

-- ---------------------------------------------------------------------------
-- Live / Reels support tables
-- ---------------------------------------------------------------------------
create table if not exists live_streams (
  id text primary key,
  host_id text not null references profiles(id) on delete cascade,
  title text,
  status text not null default 'live', -- live | ended
  viewer_count int not null default 0,
  started_at timestamptz not null default now(),
  ended_at timestamptz
);
create index if not exists idx_live_active on live_streams (started_at desc) where status = 'live';

-- ---------------------------------------------------------------------------
-- Marketplace
-- ---------------------------------------------------------------------------
create table if not exists marketplace_listings (
  id text primary key,
  seller_id text not null references profiles(id) on delete cascade,
  title text not null,
  description text,
  price numeric(12,2) not null default 0,
  currency text not null default 'USD',
  media_list jsonb not null default '[]'::jsonb,
  status text not null default 'active', -- active | sold | removed
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_marketplace_active on marketplace_listings (created_at desc) where status = 'active';

-- ---------------------------------------------------------------------------
-- Wallet / payments (append-only ledger)
-- ---------------------------------------------------------------------------
create table if not exists wallet_ledger (
  id text primary key,
  user_id text not null references profiles(id) on delete cascade,
  kind text not null, -- credit | debit | hold | release
  amount numeric(14,4) not null,
  currency text not null default 'USD',
  reason text,
  ref_type text,
  ref_id text,
  created_at timestamptz not null default now()
);
create index if not exists idx_wallet_user on wallet_ledger (user_id, created_at desc);

create table if not exists payment_events (
  id text primary key,
  provider text not null, -- stripe | manual
  external_id text,
  user_id text references profiles(id),
  amount numeric(14,4),
  currency text,
  status text not null,
  raw jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create unique index if not exists idx_payment_external on payment_events (provider, external_id) where external_id is not null;

-- ---------------------------------------------------------------------------
-- Reports / moderation
-- ---------------------------------------------------------------------------
create table if not exists reports_normalized (
  id text primary key,
  reporter_id text not null references profiles(id) on delete cascade,
  target_type text not null,
  target_id text not null,
  reason text not null,
  details text,
  status text not null default 'open',
  created_at timestamptz not null default now()
);
create index if not exists idx_reports_status on reports_normalized (status, created_at desc);

-- ---------------------------------------------------------------------------
-- Sessions / devices / idempotency
-- ---------------------------------------------------------------------------
create table if not exists user_sessions (
  id text primary key,
  user_id text not null references profiles(id) on delete cascade,
  device_label text,
  user_agent text,
  ip_hash text,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  revoked_at timestamptz
);
create index if not exists idx_sessions_user on user_sessions (user_id, last_seen_at desc);

create table if not exists idempotency_keys (
  key text primary key,
  user_id text,
  response jsonb,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '24 hours')
);
create index if not exists idx_idempotency_expires on idempotency_keys (expires_at);

-- ---------------------------------------------------------------------------
-- Compatibility blob (temporary — dual-write period only)
-- ---------------------------------------------------------------------------
create table if not exists app_state (
  id integer primary key check (id = 1),
  version bigint not null default 1,
  state jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Media objects registry (CDN / object storage keys)
-- ---------------------------------------------------------------------------
create table if not exists media_objects (
  id text primary key,
  owner_id text not null references profiles(id) on delete cascade,
  bucket text not null,
  object_key text not null,
  content_type text,
  size_bytes bigint,
  public_url text,
  created_at timestamptz not null default now(),
  unique (bucket, object_key)
);
create index if not exists idx_media_owner on media_objects (owner_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Helper: cleanup expired signals (call from cron or edge function)
-- ---------------------------------------------------------------------------
-- delete from webrtc_signals where expires_at < now();
-- delete from stories where expires_at < now();
-- delete from idempotency_keys where expires_at < now();

create table if not exists wallet_accounts (
  user_id text primary key references profiles(id) on delete cascade,
  balance numeric(20,4) not null default 0,
  coins bigint not null default 0,
  updated_at timestamptz not null default now(),
  check(balance>=0), check(coins>=0)
);
create or replace function wallet_apply_entry(p_user_id text,p_balance_delta numeric,p_coins_delta bigint,p_kind text,p_currency text default 'USD',p_reason text default null,p_ref_type text default null,p_ref_id text default null,p_ledger_id text default null)
returns table(user_id text,balance numeric,coins bigint) language plpgsql security definer set search_path=public as $$
declare v_id text:=coalesce(p_ledger_id,gen_random_uuid()::text); v_balance numeric; v_coins bigint;
begin
 if exists(select 1 from wallet_ledger where id=v_id) then select wa.balance,wa.coins into v_balance,v_coins from wallet_accounts wa where wa.user_id=p_user_id; return query select p_user_id,coalesce(v_balance,0),coalesce(v_coins,0); return; end if;
 insert into wallet_accounts(user_id) values(p_user_id) on conflict(user_id) do nothing;
 select wa.balance,wa.coins into v_balance,v_coins from wallet_accounts wa where wa.user_id=p_user_id for update;
 if v_balance+coalesce(p_balance_delta,0)<0 then raise exception 'INSUFFICIENT_BALANCE'; end if;
 if v_coins+coalesce(p_coins_delta,0)<0 then raise exception 'INSUFFICIENT_COINS'; end if;
 update wallet_accounts set balance=balance+coalesce(p_balance_delta,0),coins=coins+coalesce(p_coins_delta,0),updated_at=now() where wallet_accounts.user_id=p_user_id returning wallet_accounts.balance,wallet_accounts.coins into v_balance,v_coins;
 insert into wallet_ledger(id,user_id,kind,amount,currency,reason,ref_type,ref_id) values(v_id,p_user_id,p_kind,coalesce(p_balance_delta,0),coalesce(p_currency,'USD'),p_reason,p_ref_type,p_ref_id);
 return query select p_user_id,v_balance,v_coins;
end; $$;
revoke all on function wallet_apply_entry(text,numeric,bigint,text,text,text,text,text,text) from public;
create table if not exists live_comments(id text primary key,live_id text not null references live_streams(id) on delete cascade,author_id text not null references profiles(id) on delete cascade,content text not null,created_at timestamptz not null default now());
create index if not exists idx_live_comments on live_comments(live_id,created_at desc);
create table if not exists live_reactions(live_id text not null references live_streams(id) on delete cascade,user_id text not null references profiles(id) on delete cascade,reaction text not null,created_at timestamptz not null default now(),primary key(live_id,user_id));
create or replace function live_change_viewer(p_live_id text,p_delta int) returns int language plpgsql security definer set search_path=public as $$declare v int;begin update live_streams set viewer_count=greatest(0,viewer_count+p_delta) where id=p_live_id and status='live' returning viewer_count into v;if v is null then raise exception 'LIVE_NOT_FOUND';end if;return v;end;$$;
revoke all on function live_change_viewer(text,int) from public;
alter table media_objects add column if not exists moderation_status text not null default 'approved';
alter table media_objects add column if not exists moderated_at timestamptz;
alter table media_objects add column if not exists moderation_reason text;
create index if not exists idx_media_moderation on media_objects(moderation_status,created_at desc);
create unique index if not exists idx_profiles_email_ci on profiles((lower(email))) where email is not null;
create unique index if not exists idx_profiles_username_ci on profiles((lower(username))) where username is not null;
alter table credentials enable row level security;
alter table wallet_accounts enable row level security;
alter table wallet_ledger enable row level security;
alter table payment_events enable row level security;
alter table user_sessions enable row level security;
alter table idempotency_keys enable row level security;
alter table media_objects enable row level security;

-- ---------------------------------------------------------------------------
-- Production security hardening
-- The application uses the server-only SERVICE_ROLE key. Browser clients must
-- never receive direct table access. RLS therefore denies anon/authenticated
-- access by default while keeping SERVICE_ROLE administrative access intact.
-- ---------------------------------------------------------------------------
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'profiles','credentials','follows','friendships','blocks','posts','post_reactions',
    'post_comments','stories','chat_rooms','chat_members','chat_messages','message_receipts',
    'notifications','webrtc_signals','live_streams','marketplace_listings','wallet_ledger',
    'payment_events','reports_normalized','user_sessions','idempotency_keys','app_state','media_objects'
  ] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
  END LOOP;
END $$;

-- Never expose credentials or service-owned tables through the public API.
-- No permissive policies are created intentionally; SERVICE_ROLE bypasses RLS.

-- Useful uniqueness for payment idempotency when providers retry webhooks.
CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_events_provider_event
  ON payment_events (provider, external_id)
  WHERE external_id IS NOT NULL;

-- Prevent duplicate media registry records even during retries.
CREATE UNIQUE INDEX IF NOT EXISTS idx_media_owner_object_key
  ON media_objects (owner_id, object_key);

-- LiveKit metadata required for multi-instance live routing.
ALTER TABLE live_streams ADD COLUMN IF NOT EXISTS room_name text;
ALTER TABLE live_streams ADD COLUMN IF NOT EXISTS provider text NOT NULL DEFAULT 'livekit';
CREATE INDEX IF NOT EXISTS idx_live_provider_room ON live_streams(provider, room_name);
ALTER TABLE live_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_streams ADD COLUMN IF NOT EXISTS room_name text;
ALTER TABLE live_streams ADD COLUMN IF NOT EXISTS provider text NOT NULL DEFAULT 'livekit';

CREATE TABLE IF NOT EXISTS wallet_withdrawals (
  id text primary key, user_id text not null references profiles(id) on delete cascade,
  amount numeric(20,4) not null check (amount > 0), currency text not null default 'USD',
  bank_name text not null, account_name text, account_number text not null, country text,
  status text not null default 'pending', provider text, provider_ref text, failure_reason text,
  created_at timestamptz not null default now(), processed_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_wallet_withdrawals_user ON wallet_withdrawals(user_id,created_at desc);
CREATE INDEX IF NOT EXISTS idx_wallet_withdrawals_status ON wallet_withdrawals(status,created_at);
ALTER TABLE wallet_withdrawals ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION wallet_create_withdrawal(
  p_id text,p_user_id text,p_amount numeric,p_bank_name text,p_account_name text,p_account_number text,p_country text,p_provider text default null
) RETURNS TABLE(id text,user_id text,amount numeric,status text,balance numeric,coins bigint)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_balance numeric; v_coins bigint;
BEGIN
  IF p_amount <= 0 THEN RAISE EXCEPTION 'INVALID_AMOUNT'; END IF;
  INSERT INTO wallet_accounts(user_id) VALUES(p_user_id) ON CONFLICT(user_id) DO NOTHING;
  SELECT wa.balance,wa.coins INTO v_balance,v_coins FROM wallet_accounts wa WHERE wa.user_id=p_user_id FOR UPDATE;
  IF v_balance < p_amount THEN RAISE EXCEPTION 'INSUFFICIENT_BALANCE'; END IF;
  UPDATE wallet_accounts SET balance=balance-p_amount,updated_at=now() WHERE user_id=p_user_id RETURNING balance,coins INTO v_balance,v_coins;
  INSERT INTO wallet_ledger(id,user_id,kind,amount,currency,reason,ref_type,ref_id) VALUES(p_id,p_user_id,'withdrawal',-p_amount,'USD','Creator withdrawal','withdrawal',p_id);
  INSERT INTO wallet_withdrawals(id,user_id,amount,bank_name,account_name,account_number,country,status,provider) VALUES(p_id,p_user_id,p_amount,p_bank_name,p_account_name,p_account_number,p_country,'pending',p_provider);
  RETURN QUERY SELECT p_id,p_user_id,p_amount,'pending',v_balance,v_coins;
END; $$;
REVOKE ALL ON FUNCTION wallet_create_withdrawal(text,text,numeric,text,text,text,text,text) FROM public;
