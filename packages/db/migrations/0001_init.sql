-- =============================================================================
-- RotPitch — initial schema
-- Tables: users, videos, credit_transactions, subscriptions
-- RLS is enabled on every user-scoped table; clients (anon key) can read only
-- their own rows. All privileged writes go through apps/api (service role),
-- which bypasses RLS.
-- =============================================================================

-- ---- Enums ------------------------------------------------------------------
create type public.plan as enum ('free', 'basic', 'popular', 'pro');
create type public.video_status as enum ('pending', 'processing', 'done', 'failed');
create type public.video_format as enum ('vertical', 'horizontal');
create type public.credit_tx_type as enum ('signup', 'purchase', 'use', 'refund');
create type public.payment_gateway as enum ('dodo');
create type public.subscription_status as enum ('active', 'cancelled', 'past_due');

-- ---- users ------------------------------------------------------------------
-- id mirrors auth.users.id (Supabase auth UID).
create table public.users (
  id                  uuid primary key references auth.users (id) on delete cascade,
  email               text not null unique,
  plan                public.plan not null default 'free',
  credits_balance     integer not null default 0 check (credits_balance >= 0),
  credits_expires_at  timestamptz,            -- null for free tier (never expires)
  billing_cycle_start timestamptz,            -- null for free tier
  dodo_customer_id    text,                   -- Dodo Payments customer id (cus_…), set on first checkout
  created_at          timestamptz not null default now()
);

-- ---- videos -----------------------------------------------------------------
create table public.videos (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.users (id) on delete cascade,
  status           public.video_status not null default 'pending',
  input_url        text not null,
  output_url       text,                      -- null until status = done
  background_style text not null,
  format           public.video_format not null,
  has_captions     boolean not null default false,
  has_voiceover    boolean not null default false,
  has_watermark    boolean not null default false,
  batch_id         uuid,                      -- groups an Auto Generate batch
  created_at       timestamptz not null default now()
);

create index videos_user_id_created_at_idx on public.videos (user_id, created_at desc);
create index videos_status_idx on public.videos (status);
create index videos_batch_id_idx on public.videos (batch_id) where batch_id is not null;

-- ---- credit_transactions ----------------------------------------------------
-- Append-only ledger; every credit mutation writes exactly one row.
create table public.credit_transactions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.users (id) on delete cascade,
  amount     integer not null,               -- + add / - deduct
  type       public.credit_tx_type not null,
  video_id   uuid references public.videos (id) on delete set null,
  payment_id text,                            -- dodo payment id
  created_at timestamptz not null default now()
);

create index credit_tx_user_id_created_at_idx
  on public.credit_transactions (user_id, created_at desc);

-- ---- subscriptions ----------------------------------------------------------
create table public.subscriptions (
  id                      uuid primary key default gen_random_uuid(),
  user_id                 uuid not null references public.users (id) on delete cascade,
  plan                    public.plan not null check (plan <> 'free'),
  payment_gateway         public.payment_gateway not null,
  gateway_subscription_id text not null,
  status                  public.subscription_status not null default 'active',
  current_period_start    timestamptz not null,
  current_period_end      timestamptz not null,
  created_at              timestamptz not null default now(),
  unique (payment_gateway, gateway_subscription_id)
);

create index subscriptions_user_id_idx on public.subscriptions (user_id);

-- =============================================================================
-- Row Level Security
-- =============================================================================
alter table public.users enable row level security;
alter table public.videos enable row level security;
alter table public.credit_transactions enable row level security;
alter table public.subscriptions enable row level security;

-- users: read & update own row only. (Inserts happen via the signup trigger,
-- which runs as definer; the service role bypasses RLS for admin writes.)
create policy "users_select_own"
  on public.users for select
  using (auth.uid() = id);

create policy "users_update_own"
  on public.users for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- videos: clients can read their own rows. All writes go through the API
-- (service role) so credit/gating logic is enforced server-side.
create policy "videos_select_own"
  on public.videos for select
  using (auth.uid() = user_id);

-- credit_transactions: read-only to the owner; writes are service-role only.
create policy "credit_tx_select_own"
  on public.credit_transactions for select
  using (auth.uid() = user_id);

-- subscriptions: read-only to the owner; writes are service-role only.
create policy "subscriptions_select_own"
  on public.subscriptions for select
  using (auth.uid() = user_id);
