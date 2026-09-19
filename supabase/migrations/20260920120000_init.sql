-- Bhishi Book — ledger schema, RLS, and transactional RPCs.
-- Money never moves through this database. Rows are books only.

create extension if not exists pgcrypto;

do $$ begin
  create type public.chit_type as enum ('auction', 'fixed', 'base_premium', 'loan', 'lucky_draw');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.frequency as enum (
    'daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'halfyearly', 'yearly'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.chit_mode as enum ('organise', 'tracking');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.chit_status as enum ('running', 'cancelled', 'completed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.payment_kind as enum ('full', 'partial', 'advance');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.pay_mode as enum ('cash', 'upi', 'bank', 'cheque', 'adjusted');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.plan_id as enum ('free', 'pro', 'power');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.auction_method as enum ('auction', 'lucky_draw', 'fixed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.ticket_status as enum ('open', 'closed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.commission_kind as enum ('amount', 'percent');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.adjustment_style as enum ('every_month', 'at_end');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.billing_mode as enum ('subscription', 'payg');
exception when duplicate_object then null; end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null default 'Organiser',
  phone text not null unique,
  plan public.plan_id not null default 'free',
  language text not null default 'en',
  billing_mode public.billing_mode not null default 'payg',
  deactivated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint phone_10 check (phone ~ '^[0-9]{10}$')
);

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  phone text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (owner_id, phone)
);

create table if not exists public.chits (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  title text,
  type public.chit_type not null,
  frequency public.frequency not null default 'monthly',
  pot numeric(14, 2) not null check (pot >= 0),
  instalment numeric(14, 2) not null default 0,
  members_count int not null check (members_count > 0),
  commission_pct numeric(8, 4) not null default 0,
  commission_kind public.commission_kind not null default 'percent',
  commission_value numeric(14, 2) not null default 0,
  duration int not null check (duration > 0),
  start_date date not null,
  mode public.chit_mode not null default 'organise',
  status public.chit_status not null default 'running',
  current_cycle int not null default 1 check (current_cycle >= 1),
  premium_amount numeric(14, 2),
  interest_rate numeric(8, 4),
  adjustment_style public.adjustment_style not null default 'every_month',
  remind_days int[] not null default '{}',
  member_visible boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.chit_members (
  id uuid primary key default gen_random_uuid(),
  chit_id uuid not null references public.chits (id) on delete cascade,
  customer_id uuid not null references public.customers (id) on delete restrict,
  slot int not null check (slot > 0),
  prized_cycle int,
  unique (chit_id, customer_id),
  unique (chit_id, slot)
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  chit_id uuid not null references public.chits (id) on delete cascade,
  member_id uuid not null,
  cycle int not null check (cycle > 0),
  amount numeric(14, 2) not null check (amount > 0),
  kind public.payment_kind not null,
  mode public.pay_mode not null default 'cash',
  note text,
  paid_at timestamptz not null default now()
);

create table if not exists public.auctions (
  id uuid primary key default gen_random_uuid(),
  chit_id uuid not null references public.chits (id) on delete cascade,
  cycle int not null check (cycle > 0),
  winner_id uuid not null,
  bid numeric(14, 2) not null,
  method public.auction_method not null,
  discount numeric(14, 2) not null default 0,
  commission numeric(14, 2) not null default 0,
  dividend numeric(14, 2) not null default 0,
  payout numeric(14, 2) not null default 0,
  arrears_withheld numeric(14, 2) not null default 0,
  created_at timestamptz not null default now(),
  unique (chit_id, cycle)
);

create table if not exists public.tickets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  subject text not null,
  message text not null,
  status public.ticket_status not null default 'open',
  created_at timestamptz not null default now()
);

create table if not exists public.otp_challenges (
  id uuid primary key default gen_random_uuid(),
  phone text not null,
  code_hash text not null,
  expires_at timestamptz not null,
  attempts int not null default 0,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists customers_owner_idx on public.customers (owner_id);
create index if not exists chits_owner_idx on public.chits (owner_id, status);
create index if not exists chit_members_chit_idx on public.chit_members (chit_id);
create index if not exists payments_chit_idx on public.payments (chit_id, cycle);
create index if not exists auctions_chit_idx on public.auctions (chit_id, cycle);
create index if not exists tickets_owner_idx on public.tickets (owner_id, created_at desc);
create index if not exists otp_phone_idx on public.otp_challenges (phone, created_at desc);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

drop trigger if exists chits_touch on public.chits;
create trigger chits_touch before update on public.chits
  for each row execute function public.touch_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  digits text;
begin
  digits := coalesce(
    new.raw_user_meta_data->>'phone10',
    right(regexp_replace(coalesce(new.phone, ''), '\D', '', 'g'), 10)
  );
  if digits is null or length(digits) <> 10 then
    digits := '0000000000';
  end if;
  insert into public.profiles (id, name, phone)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data->>'name', ''), 'Organiser'),
    digits
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.customers enable row level security;
alter table public.chits enable row level security;
alter table public.chit_members enable row level security;
alter table public.payments enable row level security;
alter table public.auctions enable row level security;
alter table public.tickets enable row level security;
alter table public.otp_challenges enable row level security;

drop policy if exists profiles_own on public.profiles;
create policy profiles_own on public.profiles
  for all using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists customers_own on public.customers;
create policy customers_own on public.customers
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists chits_own on public.chits;
create policy chits_own on public.chits
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists members_via_chit on public.chit_members;
create policy members_via_chit on public.chit_members
  for all using (
    exists (select 1 from public.chits c where c.id = chit_id and c.owner_id = auth.uid())
  ) with check (
    exists (select 1 from public.chits c where c.id = chit_id and c.owner_id = auth.uid())
  );

drop policy if exists payments_via_chit on public.payments;
create policy payments_via_chit on public.payments
  for all using (
    exists (select 1 from public.chits c where c.id = chit_id and c.owner_id = auth.uid())
  ) with check (
    exists (select 1 from public.chits c where c.id = chit_id and c.owner_id = auth.uid())
  );

drop policy if exists auctions_via_chit on public.auctions;
create policy auctions_via_chit on public.auctions
  for all using (
    exists (select 1 from public.chits c where c.id = chit_id and c.owner_id = auth.uid())
  ) with check (
    exists (select 1 from public.chits c where c.id = chit_id and c.owner_id = auth.uid())
  );

drop policy if exists tickets_own on public.tickets;
create policy tickets_own on public.tickets
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- OTP rows are never readable from the browser. Service role / edge only.
drop policy if exists otp_none on public.otp_challenges;
create policy otp_none on public.otp_challenges
  for all using (false) with check (false);

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.customers to authenticated;
grant select, insert, update, delete on public.chits to authenticated;
grant select, insert, update, delete on public.chit_members to authenticated;
grant select, insert, update, delete on public.payments to authenticated;
grant select, insert, update, delete on public.auctions to authenticated;
grant select, insert, update, delete on public.tickets to authenticated;

create or replace function public._uid()
returns uuid
language plpgsql
stable
as $$
begin
  if auth.uid() is null then
    raise exception 'Unauthorized';
  end if;
  return auth.uid();
end;
$$;

create or replace function public._owned_chit(p_chit_id uuid)
returns public.chits
language plpgsql
stable
as $$
declare
  c public.chits;
begin
  select * into c from public.chits where id = p_chit_id and owner_id = public._uid();
  if not found then
    raise exception 'Not found';
  end if;
  return c;
end;
$$;

create or replace function public._plan_cap(p public.plan_id)
returns int
language sql
immutable
as $$
  select case p
    when 'free' then 1
    when 'pro' then 5
    else 999
  end;
$$;

create or replace function public._active_organised(p_owner uuid)
returns int
language sql
stable
as $$
  select count(*)::int
  from public.chits c
  where c.owner_id = p_owner
    and c.status = 'running'
    and c.mode = 'organise'
    and exists (select 1 from public.chit_members m where m.chit_id = c.id);
$$;

create or replace function public._base_instalment(c public.chits)
returns numeric
language sql
immutable
as $$
  select case
    when coalesce(c.instalment, 0) > 0 then c.instalment
    when c.members_count > 0 then round(c.pot / c.members_count)
    else 0
  end;
$$;

create or replace function public._commission_amount(c public.chits)
returns numeric
language sql
immutable
as $$
  select case
    when c.commission_kind = 'amount' and coalesce(c.commission_value, 0) > 0
      then round(c.commission_value)
    else round(c.pot * coalesce(c.commission_pct, 0) / 100)
  end;
$$;

create or replace function public._paid_in_cycle(p_chit uuid, p_member uuid, p_cycle int)
returns numeric
language sql
stable
as $$
  select coalesce(sum(amount), 0)
  from public.payments
  where chit_id = p_chit and member_id = p_member and cycle = p_cycle;
$$;

create or replace function public._raw_due(p_chit uuid, p_member uuid, p_cycle int)
returns numeric
language plpgsql
stable
as $$
declare
  c public.chits;
  base numeric;
  prev public.auctions;
  prized int;
begin
  select * into c from public.chits where id = p_chit;
  if not found then
    return 0;
  end if;
  base := public._base_instalment(c);

  if c.type = 'auction' then
    select * into prev from public.auctions where chit_id = p_chit and cycle = p_cycle - 1;
    if found then
      return greatest(0, base - coalesce(prev.dividend, 0));
    end if;
  end if;

  if c.type = 'base_premium' or (c.type = 'fixed' and coalesce(c.premium_amount, 0) > 0) then
    select prized_cycle into prized
    from public.chit_members
    where chit_id = p_chit and customer_id = p_member;
    if prized is not null and p_cycle >= prized then
      return round(coalesce(c.premium_amount, base * 1.2));
    end if;
  end if;

  if c.type = 'loan' and coalesce(c.interest_rate, 0) > 0 then
    return round(base + (base * c.interest_rate) / 100);
  end if;

  return base;
end;
$$;

create or replace function public._surplus_before(p_chit uuid, p_member uuid, p_cycle int)
returns numeric
language plpgsql
stable
as $$
declare
  i int;
  surplus numeric := 0;
begin
  for i in 1 .. greatest(0, p_cycle - 1) loop
    surplus := surplus + public._paid_in_cycle(p_chit, p_member, i) - public._raw_due(p_chit, p_member, i);
  end loop;
  return surplus;
end;
$$;

create or replace function public._cycle_due(p_chit uuid, p_member uuid, p_cycle int)
returns numeric
language plpgsql
stable
as $$
declare
  raw numeric;
  carry numeric;
begin
  raw := public._raw_due(p_chit, p_member, p_cycle);
  carry := public._surplus_before(p_chit, p_member, p_cycle);
  if carry >= 0 then
    return greatest(0, raw - carry);
  end if;
  return raw + abs(carry);
end;
$$;

create or replace function public._outstanding(p_chit uuid, p_member uuid)
returns numeric
language plpgsql
stable
as $$
declare
  c public.chits;
  i int;
  due numeric := 0;
  paid numeric := 0;
begin
  select * into c from public.chits where id = p_chit;
  if not found then
    return 0;
  end if;
  for i in 1 .. c.current_cycle loop
    due := due + public._raw_due(p_chit, p_member, i);
    paid := paid + public._paid_in_cycle(p_chit, p_member, i);
  end loop;
  return greatest(0, due - paid);
end;
$$;

create or replace function public.infer_kind(p_due numeric, p_amount numeric)
returns public.payment_kind
language sql
immutable
as $$
  select case
    when p_amount > p_due then 'advance'::public.payment_kind
    when p_amount < p_due then 'partial'::public.payment_kind
    else 'full'::public.payment_kind
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
  cap int;
  active int;
  c public.chits;
  v_mode public.chit_mode;
  v_members jsonb;
  rec jsonb;
  v_customer uuid;
  v_slot int;
begin
  select * into prof from public.profiles where id = uid;
  if not found then
    raise exception 'Unauthorized';
  end if;
  if prof.deactivated_at is not null then
    raise exception 'Account is deactivated';
  end if;

  v_mode := coalesce((payload->>'mode')::public.chit_mode, 'organise');
  v_members := coalesce(payload->'members', '[]'::jsonb);

  cap := public._plan_cap(prof.plan);
  active := public._active_organised(uid);
  if v_mode = 'organise' and jsonb_array_length(v_members) > 0 and active >= cap then
    raise exception 'Your % plan allows % active organised chit(s)', prof.plan, cap;
  end if;

  insert into public.chits (
    owner_id, name, title, type, frequency, pot, instalment, members_count,
    commission_pct, commission_kind, commission_value, duration, start_date,
    mode, status, current_cycle, premium_amount, interest_rate,
    adjustment_style, remind_days, member_visible
  ) values (
    uid,
    coalesce(nullif(payload->>'name', ''), 'Untitled chit'),
    nullif(payload->>'title', ''),
    (payload->>'type')::public.chit_type,
    coalesce((payload->>'frequency')::public.frequency, 'monthly'),
    coalesce((payload->>'pot')::numeric, 0),
    coalesce((payload->>'instalment')::numeric, 0),
    greatest(1, coalesce((payload->>'membersCount')::int, 1)),
    coalesce((payload->>'commissionPct')::numeric, 0),
    coalesce((payload->>'commissionKind')::public.commission_kind, 'percent'),
    coalesce((payload->>'commissionValue')::numeric, 0),
    greatest(1, coalesce((payload->>'duration')::int, 1)),
    coalesce((payload->>'startDate')::date, current_date),
    v_mode,
    'running',
    1,
    nullif(payload->>'premiumAmount', '')::numeric,
    nullif(payload->>'interestRate', '')::numeric,
    coalesce((payload->>'adjustmentStyle')::public.adjustment_style, 'every_month'),
    coalesce(
      (select array_agg(x::int) from jsonb_array_elements_text(coalesce(payload->'remindDays', '[]'::jsonb)) as x),
      '{}'
    ),
    coalesce((payload->>'memberVisible')::boolean, false)
  )
  returning * into c;

  for rec in select * from jsonb_array_elements(v_members)
  loop
    v_customer := coalesce((rec->>'customerId')::uuid, (rec->>'customer_id')::uuid);
    v_slot := coalesce((rec->>'slot')::int, 0);
    if v_customer is null then
      continue;
    end if;
    if not exists (
      select 1 from public.customers cu where cu.id = v_customer and cu.owner_id = uid
    ) then
      raise exception 'Customer is not in your directory';
    end if;
    if v_slot <= 0 then
      select coalesce(max(slot), 0) + 1 into v_slot from public.chit_members where chit_id = c.id;
    end if;
    insert into public.chit_members (chit_id, customer_id, slot)
    values (c.id, v_customer, v_slot);
  end loop;

  select * into c from public.chits where id = c.id;
  return c;
end;
$$;

create or replace function public.add_chit_member(p_chit_id uuid, p_customer_id uuid)
returns public.chits
language plpgsql
security definer
set search_path = public
as $$
declare
  c public.chits;
  uid uuid := public._uid();
  n int;
begin
  c := public._owned_chit(p_chit_id);
  if c.status <> 'running' then
    raise exception 'Chit is not running';
  end if;
  if not exists (
    select 1 from public.customers cu where cu.id = p_customer_id and cu.owner_id = uid
  ) then
    raise exception 'Customer is not in your directory';
  end if;
  if exists (
    select 1 from public.chit_members where chit_id = p_chit_id and customer_id = p_customer_id
  ) then
    return c;
  end if;
  select count(*) into n from public.chit_members where chit_id = p_chit_id;
  if n >= c.members_count then
    raise exception 'All slots are filled';
  end if;
  insert into public.chit_members (chit_id, customer_id, slot)
  values (p_chit_id, p_customer_id, n + 1);
  return public._owned_chit(p_chit_id);
end;
$$;

create or replace function public.cancel_chit(p_chit_id uuid)
returns public.chits
language plpgsql
security definer
set search_path = public
as $$
declare
  c public.chits;
begin
  c := public._owned_chit(p_chit_id);
  update public.chits set status = 'cancelled' where id = c.id;
  return public._owned_chit(p_chit_id);
end;
$$;

create or replace function public.update_chit_settings(
  p_chit_id uuid,
  p_member_visible boolean default null,
  p_remind_days int[] default null
)
returns public.chits
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public._owned_chit(p_chit_id);
  update public.chits
  set
    member_visible = coalesce(p_member_visible, member_visible),
    remind_days = coalesce(p_remind_days, remind_days)
  where id = p_chit_id;
  return public._owned_chit(p_chit_id);
end;
$$;

create or replace function public.record_payment(
  p_chit_id uuid,
  p_member_id uuid,
  p_amount numeric,
  p_kind public.payment_kind default null,
  p_mode public.pay_mode default 'cash',
  p_note text default null
)
returns public.payments
language plpgsql
security definer
set search_path = public
as $$
declare
  c public.chits;
  due numeric;
  pay public.payments;
begin
  c := public._owned_chit(p_chit_id);
  if c.status <> 'running' then
    raise exception 'Chit is not running';
  end if;
  if not exists (
    select 1 from public.chit_members where chit_id = p_chit_id and customer_id = p_member_id
  ) then
    raise exception 'Not a member of this chit';
  end if;
  if coalesce(p_amount, 0) <= 0 then
    raise exception 'Amount must be greater than 0';
  end if;
  due := public._cycle_due(p_chit_id, p_member_id, c.current_cycle);
  insert into public.payments (chit_id, member_id, cycle, amount, kind, mode, note)
  values (
    p_chit_id,
    p_member_id,
    c.current_cycle,
    p_amount,
    coalesce(p_kind, public.infer_kind(due, p_amount)),
    coalesce(p_mode, 'cash'),
    p_note
  )
  returning * into pay;
  return pay;
end;
$$;

create or replace function public.undo_payment(p_chit_id uuid, p_payment_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public._owned_chit(p_chit_id);
  delete from public.payments
  where id = p_payment_id and chit_id = p_chit_id;
end;
$$;

create or replace function public.settle_payout(
  p_chit_id uuid,
  p_winner_id uuid,
  p_bid numeric,
  p_method public.auction_method
)
returns public.auctions
language plpgsql
security definer
set search_path = public
as $$
declare
  c public.chits;
  winner public.chit_members;
  rec public.auctions;
  safe_bid numeric;
  discount numeric;
  commission numeric;
  unprized int;
  dividend numeric;
  arrears numeric;
  payout numeric;
begin
  c := public._owned_chit(p_chit_id);
  if c.status <> 'running' then
    raise exception 'Chit is not running';
  end if;
  if exists (select 1 from public.auctions where chit_id = p_chit_id and cycle = c.current_cycle) then
    raise exception 'This cycle is already settled';
  end if;
  select * into winner
  from public.chit_members
  where chit_id = p_chit_id and customer_id = p_winner_id;
  if not found then
    raise exception 'Winner is not a member of this chit';
  end if;
  if winner.prized_cycle is not null then
    raise exception 'This member already won';
  end if;

  safe_bid := case
    when p_method = 'auction' then least(c.pot, greatest(0, coalesce(p_bid, 0)))
    else c.pot
  end;
  discount := greatest(0, c.pot - safe_bid);
  commission := case when p_method = 'auction' then public._commission_amount(c) else 0 end;
  select greatest(1, count(*) - 1) into unprized
  from public.chit_members
  where chit_id = p_chit_id and prized_cycle is null;
  dividend := case
    when p_method = 'auction' then floor(greatest(0, discount - commission) / unprized)
    else 0
  end;
  arrears := public._outstanding(p_chit_id, p_winner_id);
  payout := greatest(0, safe_bid - arrears);

  insert into public.auctions (
    chit_id, cycle, winner_id, bid, method, discount, commission, dividend, payout, arrears_withheld
  ) values (
    p_chit_id, c.current_cycle, p_winner_id, safe_bid, p_method,
    discount, commission, dividend, payout, arrears
  )
  returning * into rec;

  update public.chit_members
  set prized_cycle = c.current_cycle
  where chit_id = p_chit_id and customer_id = p_winner_id;

  return rec;
end;
$$;

create or replace function public.lucky_draw(p_chit_id uuid)
returns public.auctions
language plpgsql
security definer
set search_path = public
as $$
declare
  c public.chits;
  winner uuid;
begin
  c := public._owned_chit(p_chit_id);
  select customer_id into winner
  from public.chit_members
  where chit_id = p_chit_id and prized_cycle is null
  order by random()
  limit 1;
  if winner is null then
    raise exception 'No unprized members left';
  end if;
  return public.settle_payout(p_chit_id, winner, c.pot, 'lucky_draw');
end;
$$;

create or replace function public.close_cycle(p_chit_id uuid)
returns public.chits
language plpgsql
security definer
set search_path = public
as $$
declare
  c public.chits;
  next_cycle int;
begin
  c := public._owned_chit(p_chit_id);
  if c.status <> 'running' then
    raise exception 'Chit is not running';
  end if;
  if not exists (select 1 from public.chit_members where chit_id = p_chit_id) then
    raise exception 'Add members before closing a cycle';
  end if;
  if c.mode = 'organise' and not exists (
    select 1 from public.auctions where chit_id = p_chit_id and cycle = c.current_cycle
  ) then
    raise exception 'Settle this cycle''s winner before closing';
  end if;
  next_cycle := c.current_cycle + 1;
  update public.chits
  set
    current_cycle = next_cycle,
    status = case when next_cycle > duration then 'completed' else 'running' end
  where id = p_chit_id;
  return public._owned_chit(p_chit_id);
end;
$$;

create or replace function public.set_plan(p_plan public.plan_id)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  p public.profiles;
begin
  update public.profiles
  set plan = p_plan, billing_mode = 'subscription'
  where id = public._uid()
  returning * into p;
  return p;
end;
$$;

create or replace function public.set_billing_mode(p_mode public.billing_mode)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  p public.profiles;
begin
  update public.profiles
  set billing_mode = p_mode
  where id = public._uid()
  returning * into p;
  return p;
end;
$$;

create or replace function public.deactivate_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
  set deactivated_at = now()
  where id = public._uid();
end;
$$;

create or replace function public.reactivate_if_allowed()
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  p public.profiles;
begin
  select * into p from public.profiles where id = public._uid();
  if not found then
    raise exception 'Unauthorized';
  end if;
  if p.deactivated_at is not null then
    if p.deactivated_at < now() - interval '30 days' then
      raise exception 'Account was permanently closed';
    end if;
    update public.profiles set deactivated_at = null where id = p.id returning * into p;
  end if;
  return p;
end;
$$;

revoke all on function public._uid() from public, anon;
revoke all on function public._owned_chit(uuid) from public, anon;
revoke all on function public._plan_cap(public.plan_id) from public, anon;
revoke all on function public._active_organised(uuid) from public, anon;
revoke all on function public._base_instalment(public.chits) from public, anon;
revoke all on function public._commission_amount(public.chits) from public, anon;
revoke all on function public._paid_in_cycle(uuid, uuid, int) from public, anon;
revoke all on function public._raw_due(uuid, uuid, int) from public, anon;
revoke all on function public._surplus_before(uuid, uuid, int) from public, anon;
revoke all on function public._cycle_due(uuid, uuid, int) from public, anon;
revoke all on function public._outstanding(uuid, uuid) from public, anon;

grant execute on function public.infer_kind(numeric, numeric) to authenticated;
grant execute on function public.create_chit(jsonb) to authenticated;
grant execute on function public.add_chit_member(uuid, uuid) to authenticated;
grant execute on function public.cancel_chit(uuid) to authenticated;
grant execute on function public.update_chit_settings(uuid, boolean, int[]) to authenticated;
grant execute on function public.record_payment(uuid, uuid, numeric, public.payment_kind, public.pay_mode, text) to authenticated;
grant execute on function public.undo_payment(uuid, uuid) to authenticated;
grant execute on function public.settle_payout(uuid, uuid, numeric, public.auction_method) to authenticated;
grant execute on function public.lucky_draw(uuid) to authenticated;
grant execute on function public.close_cycle(uuid) to authenticated;
grant execute on function public.set_plan(public.plan_id) to authenticated;
grant execute on function public.set_billing_mode(public.billing_mode) to authenticated;
grant execute on function public.deactivate_account() to authenticated;
grant execute on function public.reactivate_if_allowed() to authenticated;
