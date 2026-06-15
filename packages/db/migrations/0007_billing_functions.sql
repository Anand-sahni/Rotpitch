-- =============================================================================
-- RotPitch — Dodo Payments billing (Phase 7), credit/plan mutation functions
--
-- Like deduct_credits/refund_credit (0003), these are race-safe SECURITY DEFINER
-- functions: they row-lock the user and write the users update + the
-- credit_transactions ledger row(s) in one transaction. The API calls them with
-- the service role from billingService; the browser never touches them.
--
-- Ledger integrity: the credit_transactions amounts always sum to the current
-- balance, so a grant that wipes leftover credits first records BOTH the wipe
-- (a `reset` row for the removed leftover) and the grant (a `purchase` row for
-- the fresh credits). No rollover — renewals/upgrades replace the balance.
-- =============================================================================

-- Apply a paid-plan grant (new subscription / renewal / plan change). Sets the
-- plan + a fresh credit balance + the billing window, writing the wipe and the
-- purchase as separate ledger rows so the ledger still sums to the balance.
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
  v_old int;
begin
  select credits_balance into v_old
  from public.users
  where id = p_user_id
  for update;

  if v_old is null then
    raise exception 'user not found';
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

-- Drop a user back to the Free tier (subscription cancelled/expired or grace
-- elapsed). Free = 1 credit that never expires; the net change is recorded as a
-- `reset` row so the ledger stays consistent.
create or replace function public.reset_to_free(
  p_user_id uuid
) returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old int;
begin
  select credits_balance into v_old
  from public.users
  where id = p_user_id
  for update;

  if v_old is null then
    raise exception 'user not found';
  end if;

  update public.users
  set plan                = 'free',
      credits_balance     = 1,
      credits_expires_at  = null,
      billing_cycle_start = null
  where id = p_user_id;

  if v_old <> 1 then
    insert into public.credit_transactions (user_id, amount, type)
    values (p_user_id, 1 - v_old, 'reset');
  end if;

  return 1;
end;
$$;
