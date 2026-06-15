-- =============================================================================
-- RotPitch — Dodo Payments billing (Phase 7), schema changes
--
-- The payments gateway is now a single Merchant of Record (Dodo Payments),
-- replacing the original Stripe + Razorpay dual-gateway plan. This migration:
--   1. Collapses the `payment_gateway` enum from ('razorpay','stripe') to
--      ('dodo'). The `subscriptions` table is empty (billing never launched), so
--      we swap the type via a rename + retype that touches no rows and preserves
--      the column's unique constraint.
--   2. Adds `users.dodo_customer_id` — the Dodo customer id (cus_…), stored on
--      first checkout so renewals / portal links reuse the same customer.
--   3. Adds a `reset` credit-transaction type for plan downgrade/expiry resets.
--   4. Adds `dodo_webhook_events` — an idempotency ledger so a redelivered
--      webhook (same `webhook-id`) is never processed twice.
--
-- Billing credit/plan mutation FUNCTIONS live in 0007 (kept separate so the
-- `reset` enum value below is committed before any function references it).
--
-- Idempotent: safe to re-run.
-- =============================================================================

-- 1. Recreate payment_gateway as ('dodo') -------------------------------------
do $$
begin
  -- Only swap if the old values are still present (skip on a fresh DB where 0001
  -- already created it as ('dodo'), and on re-runs).
  if exists (
    select 1 from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    where t.typname = 'payment_gateway' and e.enumlabel in ('razorpay', 'stripe')
  ) then
    alter type public.payment_gateway rename to payment_gateway_old;
    create type public.payment_gateway as enum ('dodo');
    -- subscriptions is empty pre-launch, so this cast touches no rows; retyping
    -- the column (not dropping it) keeps its unique(payment_gateway, …) index.
    alter table public.subscriptions
      alter column payment_gateway type public.payment_gateway
      using payment_gateway::text::public.payment_gateway;
    drop type public.payment_gateway_old;
  end if;
end $$;

-- 2. users.dodo_customer_id ---------------------------------------------------
alter table public.users
  add column if not exists dodo_customer_id text;

-- 3. credit_tx_type: add 'reset' (plan downgrade / expiry credit resets) -------
-- Used in 0007's reset_to_free(); must be committed before that runs.
alter type public.credit_tx_type add value if not exists 'reset';

-- 4. Webhook idempotency ledger ----------------------------------------------
-- Dedupe by the Standard-Webhooks `webhook-id`. The handler claims an id here as
-- `processing` before working, then flips it to `done` on success — so a crash
-- mid-handle leaves a stale `processing` row a later redelivery can reclaim
-- (the event is never silently lost), while a `done` row is a permanent dedupe.
create table if not exists public.dodo_webhook_events (
  id          text primary key,            -- the `webhook-id` header value
  type        text not null,               -- e.g. 'subscription.active'
  status      text not null default 'processing', -- 'processing' | 'done'
  received_at timestamptz not null default now()
);

-- Backfill the column on re-runs against a DB created before `status` existed.
alter table public.dodo_webhook_events
  add column if not exists status text not null default 'processing';

-- Service-role-only: enable RLS with no policies so anon/auth clients get nothing
-- (the API writes/reads this table with the service role, which bypasses RLS).
alter table public.dodo_webhook_events enable row level security;
