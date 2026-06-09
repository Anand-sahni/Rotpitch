-- =============================================================================
-- Signup hook: when a new auth user is created, provision their public profile
-- on the Free plan with 1 free credit (never expires) and log the grant in
-- credit_transactions. Runs as SECURITY DEFINER so it can write past RLS.
--
-- This is the canonical "create users row on first signup" path. apps/api also
-- has an idempotent ensureUserProfile() fallback in case the trigger is ever
-- disabled.
-- =============================================================================

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_user_id uuid := new.id;
begin
  insert into public.users (id, email, plan, credits_balance, credits_expires_at)
  values (new_user_id, new.email, 'free', 1, null)
  on conflict (id) do nothing;

  -- Only log the signup grant if we actually inserted (avoid duplicates on
  -- re-runs / conflict).
  if found then
    insert into public.credit_transactions (user_id, amount, type)
    values (new_user_id, 1, 'signup');
  end if;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_auth_user();
