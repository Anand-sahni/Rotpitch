-- =============================================================================
-- RotPitch — credit mutation functions (race-safe, ledger-writing)
--
-- All credit changes go through these SECURITY DEFINER functions so the balance
-- update and the credit_transactions row always commit together, and concurrent
-- deductions are serialized by a row lock (FOR UPDATE). apps/api calls them with
-- the service role via supabase.rpc(); the browser never touches credits.
-- =============================================================================

-- Deduct one credit per video id (single generate => array of 1; Auto Generate
-- => N). Charges the whole batch atomically: if the balance can't cover every
-- video, nothing is deducted and 'insufficient_credits' is raised. Writes one
-- `use` ledger row (amount -1) per video. Returns the new balance.
create or replace function public.deduct_credits(
  p_user_id  uuid,
  p_video_ids uuid[]
) returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balance int;
  v_count   int := coalesce(array_length(p_video_ids, 1), 0);
  v_id      uuid;
begin
  if v_count < 1 then
    raise exception 'no videos to charge';
  end if;

  -- Lock the user row to serialize concurrent credit-consuming requests.
  select credits_balance into v_balance
  from public.users
  where id = p_user_id
  for update;

  if v_balance is null then
    raise exception 'user not found';
  end if;

  if v_balance < v_count then
    raise exception 'insufficient_credits' using errcode = 'P0001';
  end if;

  update public.users
  set credits_balance = credits_balance - v_count
  where id = p_user_id;

  foreach v_id in array p_video_ids loop
    insert into public.credit_transactions (user_id, amount, type, video_id)
    values (p_user_id, -1, 'use', v_id);
  end loop;

  return v_balance - v_count;
end;
$$;

-- Refund a single credit for a failed render. Adds 1 back and writes a `refund`
-- ledger row linked to the video. Returns the new balance.
create or replace function public.refund_credit(
  p_user_id  uuid,
  p_video_id uuid
) returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balance int;
begin
  update public.users
  set credits_balance = credits_balance + 1
  where id = p_user_id
  returning credits_balance into v_balance;

  if v_balance is null then
    raise exception 'user not found';
  end if;

  insert into public.credit_transactions (user_id, amount, type, video_id)
  values (p_user_id, 1, 'refund', p_video_id);

  return v_balance;
end;
$$;
