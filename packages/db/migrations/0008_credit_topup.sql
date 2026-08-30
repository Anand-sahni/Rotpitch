-- =============================================================================
-- RotPitch — one-time credit top-ups
--
-- A subscriber who burns a cycle's credits early had no way to buy more: the
-- only paid products were plan subscriptions, so a Pro user (already on the top
-- plan) was blocked until renewal while the UI told them to "top up".
--
-- `add_credits` is the ADDITIVE counterpart to `apply_plan_grant` (0007). The
-- distinction matters: apply_plan_grant REPLACES the balance (renewal = wipe +
-- refill, no rollover), so reusing it for a top-up would destroy the credits the
-- user still had. This one increments and leaves plan/expiry untouched.
--
-- Idempotency: credits are granted from a `payment.succeeded` webhook. The
-- webhook table dedupes a redelivery of the SAME event, but Dodo can emit more
-- than one event for a payment, so the real guard is the payment id — a second
-- call for a payment we already credited is a silent no-op. The check runs
-- inside the same row lock as the update, so concurrent deliveries can't race.
-- =============================================================================

create or replace function public.add_credits(
  p_user_id    uuid,
  p_credits    int,
  p_payment_id text
) returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balance int;
begin
  if p_credits <= 0 then
    raise exception 'add_credits requires a positive amount';
  end if;
  if p_payment_id is null or length(trim(p_payment_id)) = 0 then
    raise exception 'add_credits requires a payment id (idempotency key)';
  end if;

  -- Row-lock the user first: everything below runs under this lock, so a
  -- concurrent delivery of the same payment blocks here and then sees the
  -- ledger row written by the winner.
  select credits_balance into v_balance
  from public.users
  where id = p_user_id
  for update;

  if v_balance is null then
    raise exception 'user not found';
  end if;

  -- Already credited this payment → no-op, return the current balance.
  if exists (
    select 1
    from public.credit_transactions
    where payment_id = p_payment_id
      and type = 'purchase'
      and user_id = p_user_id
  ) then
    return v_balance;
  end if;

  update public.users
  set credits_balance = credits_balance + p_credits
  where id = p_user_id;

  -- Deliberately does NOT touch credits_expires_at: top-up credits ride the
  -- user's existing billing window and are wiped by the next renewal like any
  -- other balance (no rollover). The purchase UI says so.
  insert into public.credit_transactions (user_id, amount, type, payment_id)
  values (p_user_id, p_credits, 'purchase', p_payment_id);

  return v_balance + p_credits;
end;
$$;

-- Makes the idempotency lookup above an index probe rather than a scan of the
-- user's whole ledger. Partial: only `purchase` rows carry a payment id.
create index if not exists credit_transactions_payment_id_idx
  on public.credit_transactions (payment_id)
  where payment_id is not null;
