-- Remove Cashfree billing tables and subscription RPCs.
-- Platform is free; app no longer uses these objects.

drop function if exists public.activate_subscription_plan(
  uuid, public.plan_id, public.billing_interval, text, timestamptz, text
);
drop function if exists public.mark_subscription_status(
  text, public.billing_subscription_status
);

drop table if exists public.billing_events cascade;
drop table if exists public.billing_subscriptions cascade;

-- set_plan: no paid upgrades; always keep free (callable leftover for old clients).
create or replace function public.set_plan(p_plan public.plan_id)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
  set
    plan = 'free',
    billing_mode = coalesce(billing_mode, 'payg'),
    plan_expires_at = null
  where id = public._uid();
  return (select p from public.profiles p where p.id = public._uid());
end;
$$;

grant execute on function public.set_plan(public.plan_id) to authenticated;

comment on function public.set_plan(public.plan_id) is
  'Legacy no-op upgrade path — Bhishi Circle is free; always stores plan=free.';
