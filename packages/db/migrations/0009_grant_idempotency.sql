-- =============================================================================
-- RotPitch — make apply_plan_grant idempotent per (subscription, billing period)
--
-- Dodo fires BOTH `subscription.active` and `subscription.renewed` for a first
-- purchase, ~76ms apart, each with its own `webhook-id` — so the webhook dedupe
-- table cannot collapse them and the two deliveries are handled CONCURRENTLY.
--
-- The first attempt at this guard lived in application code (billingService
-- read the subscriptions row before granting). That is a time-of-check /
-- time-of-use race and it did not work: both handlers read before either had
-- written, so both granted. Observed in production on 2026-08-30 —
--     -1 reset / +20 purchase   18:44:41
--    -20 reset / +20 purchase   18:44:42
-- for a single $9.99 payment. The BALANCE stayed correct (the grant wipes and
-- refills rather than adding), so this is a ledger-integrity bug: every
-- purchase was double-counted, which would corrupt revenue and credits-granted
-- reporting.
--
-- The fix is to put the check where the serialization already exists: inside
-- this function, under the `FOR UPDATE` lock on the user row. Two concurrent
-- deliveries now queue on the lock and the second one sees the first's work.
-- This mirrors `add_credits` (0008), which was race-safe for exactly this
-- reason.
--
-- What still grants:
--   * renewal      — p_expires_at advances, so the expiry no longer matches
--   * plan change  — p_plan differs
--   * reconcileBilling's lazy-expiry fallback — passes p_payment_id = NULL, and
--     a NULL never matches the payment-id predicate, so the guard is skipped
--     entirely and the refill always happens
-- =============================================================================

create or replace function public.apply_plan_grant(
  p_user_id      uuid,
  p_plan         public.plan,
  p_credits      int,
  p_cycle_start  timestamptz,
  p_expires_at   timestamptz,
  p_payment_id   text
) returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old     int;
  v_plan    public.plan;
  v_expires timestamptz;
begin
  select credits_balance, plan, credits_expires_at
    into v_old, v_plan, v_expires
  from public.users
  where id = p_user_id
  for update;

  if v_old is null then
    raise exception 'user not found';
  end if;

  -- Already applied this exact grant (same payment, same plan, same billing
  -- window)? Then this is a duplicate activation event — no-op. Everything
  -- below runs under the row lock above, so a concurrent delivery blocks here
  -- and then sees the winner's committed state.
  if p_payment_id is not null
     and v_plan = p_plan
     and v_expires is not distinct from p_expires_at
     and exists (
       select 1
       from public.credit_transactions
       where user_id = p_user_id
         and payment_id = p_payment_id
         and type = 'purchase'
     )
  then
    return v_old;
  end if;

  update public.users
  set plan                = p_plan,
      credits_balance     = p_credits,
      credits_expires_at  = p_expires_at,
      billing_cycle_start = p_cycle_start
  where id = p_user_id;

  -- Wipe any leftover balance (no rollover) as its own ledger row.
  if v_old <> 0 then
    insert into public.credit_transactions (user_id, amount, type, payment_id)
    values (p_user_id, -v_old, 'reset', p_payment_id);
  end if;

  -- The fresh plan credits.
  if p_credits <> 0 then
    insert into public.credit_transactions (user_id, amount, type, payment_id)
    values (p_user_id, p_credits, 'purchase', p_payment_id);
  end if;

  return p_credits;
end;
$$;
