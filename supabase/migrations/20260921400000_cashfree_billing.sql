-- Cashfree subscription billing: tables, plan expiry, lock client set_plan

alter table public.profiles
  add column if not exists plan_expires_at timestamptz,
  add column if not exists cashfree_customer_id text;

do $$ begin
  create type public.billing_interval as enum ('month', 'year');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.billing_subscription_status as enum (
    'pending', 'active', 'paused', 'cancelled', 'failed'
  );
exception when duplicate_object then null;
end $$;

create table if not exists public.billing_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  plan public.plan_id not null check (plan in ('pro', 'power')),
  interval public.billing_interval not null,
  amount_inr numeric not null check (amount_inr > 0),
  status public.billing_subscription_status not null default 'pending',
  cashfree_plan_id text,
  cashfree_subscription_id text,
  cashfree_session_id text,
  cf_payment_id text,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists billing_subscriptions_user_idx
  on public.billing_subscriptions (user_id, created_at desc);

create unique index if not exists billing_subscriptions_cf_sub_uidx
  on public.billing_subscriptions (cashfree_subscription_id)
  where cashfree_subscription_id is not null;

create table if not exists public.billing_events (
  id uuid primary key default gen_random_uuid(),
  event_id text not null,
  event_type text,
  cashfree_subscription_id text,
  payload jsonb not null default '{}'::jsonb,
  processed_at timestamptz not null default now(),
  unique (event_id)
);

create index if not exists billing_events_sub_idx
  on public.billing_events (cashfree_subscription_id);

alter table public.billing_subscriptions enable row level security;
alter table public.billing_events enable row level security;

drop policy if exists billing_subscriptions_select_own on public.billing_subscriptions;
create policy billing_subscriptions_select_own
  on public.billing_subscriptions for select
  to authenticated
  using (user_id = auth.uid());

-- No client writes on billing_events
drop policy if exists billing_events_deny_all on public.billing_events;
create policy billing_events_deny_all
  on public.billing_events for all
  to authenticated
  using (false)
  with check (false);

-- Effective plan for caps: expired paid plans count as free
create or replace function public._effective_plan(p public.profiles)
returns public.plan_id
language sql
stable
as $$
  select case
    when p.plan in ('pro', 'power')
      and p.plan_expires_at is not null
      and p.plan_expires_at <= now()
      then 'free'::public.plan_id
    else coalesce(p.plan, 'free'::public.plan_id)
  end;
$$;

create or replace function public.create_chit(payload jsonb)
returns public.chits
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := public._uid();
  prof public.profiles;
  eff public.plan_id;
  cap int;
  active int;
  c public.chits;
  v_mode public.chit_mode;
  v_members jsonb;
  rec jsonb;
  v_customer uuid;
  v_slot int;
  v_count int;
  v_slots int;
begin
  select * into prof from public.profiles where id = uid;
  if not found then raise exception 'Profile missing'; end if;

  v_mode := coalesce((payload->>'mode')::public.chit_mode, 'organise');
  v_members := coalesce(payload->'members', '[]'::jsonb);
  v_count := jsonb_array_length(v_members);
  v_slots := greatest(1, coalesce((payload->>'membersCount')::int, 1));

  if v_mode = 'organise' then
    if v_count < 1 then
      raise exception 'Add members to every slot before creating this chit';
    end if;
    if v_count <> v_slots then
      raise exception 'Fill all % slots (currently %)', v_slots, v_count;
    end if;
  end if;

  eff := public._effective_plan(prof);
  cap := public._plan_cap(eff);
  active := public._active_organised(uid);
  if v_mode = 'organise' and v_count > 0 and active >= cap then
    raise exception 'Your % plan allows % active organised chit(s)', eff, cap;
  end if;

  insert into public.chits (
    owner_id, name, title, type, frequency, pot, instalment, members_count,
    commission_pct, commission_kind, commission_value, duration, start_date,
    mode, status, current_cycle, premium_amount, interest_rate, repayment_tenure,
    adjustment_style, auction_style, remind_days, member_visible
  ) values (
    uid,
    coalesce(nullif(payload->>'name', ''), 'Untitled chit'),
    nullif(payload->>'title', ''),
    (payload->>'type')::public.chit_type,
    coalesce((payload->>'frequency')::public.frequency, 'monthly'),
    coalesce((payload->>'pot')::numeric, 0),
    coalesce((payload->>'instalment')::numeric, 0),
    v_slots,
    coalesce((payload->>'commissionPct')::numeric, 0),
    coalesce((payload->>'commissionKind')::public.commission_kind, 'percent'),
    coalesce((payload->>'commissionValue')::numeric, 0),
    greatest(1, coalesce((payload->>'duration')::int, 1)),
    coalesce((payload->>'startDate')::date, current_date),
    v_mode,
    'running'::public.chit_status,
    1,
    nullif(payload->>'premiumAmount', '')::numeric,
    nullif(payload->>'interestRate', '')::numeric,
    nullif(payload->>'repaymentTenure', '')::int,
    coalesce((payload->>'adjustmentStyle')::public.adjustment_style, 'every_month'),
    coalesce((payload->>'auctionStyle')::public.auction_style, 'collect_first'),
    coalesce(
      (select array_agg(x::int) from jsonb_array_elements_text(coalesce(payload->'remindDays', '[]'::jsonb)) as x),
      '{}'
    ),
    coalesce((payload->>'memberVisible')::boolean, false)
  )
  returning * into c;

  for rec in select * from jsonb_array_elements(v_members)
  loop
    v_customer := (rec->>'customerId')::uuid;
    v_slot := coalesce((rec->>'slot')::int, 1);
    insert into public.chit_members (chit_id, customer_id, slot)
    values (c.id, v_customer, v_slot)
    on conflict do nothing;
  end loop;

  return public._owned_chit(c.id);
end;
$$;

-- Client can no longer self-upgrade to paid plans
create or replace function public.set_plan(p_plan public.plan_id)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_plan in ('pro', 'power') then
    raise exception 'Upgrade via Cashfree checkout on the Upgrade page';
  end if;
  update public.profiles
  set plan = 'free', billing_mode = coalesce(billing_mode, 'payg'), plan_expires_at = null
  where id = public._uid();
  return (select p from public.profiles p where p.id = public._uid());
end;
$$;

-- Service role / webhook only (revoke from authenticated)
create or replace function public.activate_subscription_plan(
  p_user_id uuid,
  p_plan public.plan_id,
  p_interval public.billing_interval,
  p_cashfree_subscription_id text,
  p_period_end timestamptz,
  p_cf_payment_id text default null
)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  p public.profiles;
begin
  if p_plan not in ('pro', 'power') then
    raise exception 'Invalid plan';
  end if;

  update public.billing_subscriptions
  set
    status = 'active',
    cashfree_subscription_id = coalesce(p_cashfree_subscription_id, cashfree_subscription_id),
    cf_payment_id = coalesce(p_cf_payment_id, cf_payment_id),
    current_period_end = p_period_end,
    updated_at = now()
  where user_id = p_user_id
    and cashfree_subscription_id = p_cashfree_subscription_id;

  update public.profiles
  set
    plan = p_plan,
    billing_mode = 'subscription',
    plan_expires_at = p_period_end,
    updated_at = now()
  where id = p_user_id
  returning * into p;

  return p;
end;
$$;

create or replace function public.mark_subscription_status(
  p_cashfree_subscription_id text,
  p_status public.billing_subscription_status
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.billing_subscriptions
  set status = p_status, updated_at = now()
  where cashfree_subscription_id = p_cashfree_subscription_id;

  if p_status in ('cancelled', 'failed') then
    -- Keep plan until period end; do not wipe immediately
    null;
  end if;
end;
$$;

revoke all on function public.activate_subscription_plan(uuid, public.plan_id, public.billing_interval, text, timestamptz, text) from public, anon, authenticated;
revoke all on function public.mark_subscription_status(text, public.billing_subscription_status) from public, anon, authenticated;
grant execute on function public.activate_subscription_plan(uuid, public.plan_id, public.billing_interval, text, timestamptz, text) to service_role;
grant execute on function public.mark_subscription_status(text, public.billing_subscription_status) to service_role;
grant execute on function public.set_plan(public.plan_id) to authenticated;
grant execute on function public.create_chit(jsonb) to authenticated;
grant execute on function public._effective_plan(public.profiles) to authenticated;

grant select on public.billing_subscriptions to authenticated;
