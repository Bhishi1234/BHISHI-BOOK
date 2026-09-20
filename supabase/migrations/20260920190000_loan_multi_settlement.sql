-- Loan bhishi: multiple disbursements per cycle, amount not capped at pot,
-- settlement payouts, repayment tenure, interest on principal.

do $$ begin
  alter type public.auction_method add value if not exists 'settlement';
exception when duplicate_object then null;
end $$;

alter table public.chits
  add column if not exists repayment_tenure int;

-- Allow multiple loans / settlements in the same cycle
alter table public.auctions drop constraint if exists auctions_chit_id_cycle_key;
drop index if exists auctions_chit_id_cycle_key;

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
  n_members int;
  dividend numeric;
  arrears numeric;
  payout numeric;
  money_in numeric;
  money_out numeric;
  already_loaned boolean := false;
begin
  c := public._owned_chit(p_chit_id);
  if c.status <> 'running' and p_method <> 'settlement' then
    raise exception 'Chit is not running';
  end if;
  if c.status = 'cancelled' then
    raise exception 'Chit is cancelled';
  end if;
  if p_method <> 'settlement' and not exists (
    select 1 from public.payments
    where chit_id = p_chit_id and cycle = c.current_cycle
  ) then
    raise exception 'Record this month''s collections before the auction';
  end if;

  -- Auction / fixed / lucky draw: one settlement row per cycle
  if p_method in ('auction', 'lucky_draw') or (p_method = 'fixed' and c.type <> 'loan') then
    if exists (
      select 1 from public.auctions
      where chit_id = p_chit_id and cycle = c.current_cycle
        and method in ('auction', 'lucky_draw', 'fixed')
    ) then
      raise exception 'This cycle is already settled';
    end if;
  end if;

  select * into winner
  from public.chit_members
  where chit_id = p_chit_id and customer_id = p_winner_id;
  if not found then
    raise exception 'Winner is not a member of this chit';
  end if;
  if p_method not in ('fixed', 'settlement') and winner.prized_cycle is not null then
    raise exception 'This member already won';
  end if;
  if p_method = 'fixed' and c.type = 'loan' and coalesce(p_bid, 0) <= 0 then
    raise exception 'Enter a loan amount';
  end if;

  select exists (
    select 1 from public.auctions
    where chit_id = p_chit_id and cycle = c.current_cycle and method = 'fixed'
  ) into already_loaned;

  if p_method = 'settlement' then
    commission := 0;
  elsif p_method = 'fixed' and c.type = 'loan' and already_loaned then
    commission := 0;
  else
    commission := public._commission_amount(c);
  end if;

  if p_method = 'auction' then
    safe_bid := least(c.pot, greatest(0, coalesce(p_bid, 0)));
  elsif p_method = 'lucky_draw' then
    safe_bid := greatest(0, c.pot - commission);
  else
    -- loan / fixed / settlement: full amount entered
    safe_bid := greatest(0, coalesce(p_bid, 0));
    if safe_bid <= 0 then
      safe_bid := c.pot;
    end if;
  end if;

  discount := case when p_method = 'auction' then greatest(0, c.pot - safe_bid) else 0 end;
  select greatest(1, count(*)) into n_members
  from public.chit_members where chit_id = p_chit_id;
  dividend := case
    when p_method = 'auction' then floor(greatest(0, discount - commission) / n_members)
    else 0
  end;

  if p_method = 'settlement' then
    arrears := 0;
  else
    arrears := public._outstanding(p_chit_id, p_winner_id);
  end if;
  payout := greatest(0, safe_bid - arrears);

  select coalesce(sum(amount), 0) into money_in from public.payments where chit_id = p_chit_id;
  select coalesce(sum(a.payout + a.commission), 0) into money_out from public.auctions a where a.chit_id = p_chit_id;
  if payout + commission > greatest(0, money_in - money_out) then
    raise exception 'Amount plus commission is more than cash on hand (%). Collect more or lower the amount.',
      greatest(0, money_in - money_out);
  end if;

  insert into public.auctions (
    chit_id, cycle, winner_id, bid, method, discount, commission, dividend, payout, arrears_withheld
  ) values (
    p_chit_id, c.current_cycle, p_winner_id, safe_bid, p_method,
    discount, commission, dividend, payout, arrears
  )
  returning * into rec;

  if p_method <> 'settlement' then
    update public.chit_members
    set prized_cycle = coalesce(prized_cycle, c.current_cycle)
    where chit_id = p_chit_id and customer_id = p_winner_id;
  end if;

  return rec;
end;
$$;

create or replace function public._loan_principal(p_chit uuid, p_member uuid)
returns numeric
language sql
stable
as $$
  select coalesce(sum(payout), 0)
  from public.auctions
  where chit_id = p_chit and winner_id = p_member and method = 'fixed';
$$;

create or replace function public._first_loan_cycle(p_chit uuid, p_member uuid)
returns int
language sql
stable
as $$
  select coalesce(min(cycle), 0)
  from public.auctions
  where chit_id = p_chit and winner_id = p_member and method = 'fixed';
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
  n_members int;
  div numeric := 0;
  accrued numeric := 0;
  principal numeric;
  start_c int;
  rate numeric;
  interest numeric;
  tenure int;
  month_index int;
  share numeric;
begin
  select * into c from public.chits where id = p_chit;
  if not found then return 0; end if;
  base := public._base_instalment(c);
  select greatest(1, count(*)) into n_members from public.chit_members where chit_id = p_chit;

  if c.type = 'auction' then
    if c.adjustment_style = 'at_end' then
      if p_cycle = c.duration then
        select coalesce(sum(floor(greatest(0, (c.pot - a.bid) - a.commission) / n_members)), 0)
          into accrued
        from public.auctions a
        where a.chit_id = p_chit and a.cycle < p_cycle and a.method = 'auction';
        return greatest(0, base - accrued);
      end if;
      return base;
    end if;
    select * into prev from public.auctions where chit_id = p_chit and cycle = p_cycle - 1 and method = 'auction';
    if found then
      div := floor(greatest(0, (c.pot - prev.bid) - prev.commission) / n_members);
      return greatest(0, base - div);
    end if;
    return base;
  end if;

  if c.type = 'loan' then
    principal := public._loan_principal(p_chit, p_member);
    if principal <= 0 then return base; end if;
    start_c := public._first_loan_cycle(p_chit, p_member);
    if start_c = 0 or p_cycle <= start_c then return base; end if;
    rate := coalesce(c.interest_rate, 0);
    interest := round(principal * rate / 100);
    tenure := greatest(1, coalesce(nullif(c.repayment_tenure, 0), greatest(1, c.duration - start_c)));
    month_index := p_cycle - start_c;
    if month_index < 1 or month_index > tenure then
      share := 0;
    elsif month_index = tenure then
      share := greatest(0, principal - ceil(principal / tenure) * (tenure - 1));
    else
      share := ceil(principal / tenure);
    end if;
    return base + interest + share;
  end if;

  if c.type = 'base_premium' or (c.type = 'fixed' and coalesce(c.premium_amount, 0) > 0) then
    select prized_cycle into prized from public.chit_members
    where chit_id = p_chit and customer_id = p_member;
    if prized is not null and p_cycle >= prized then
      return round(coalesce(c.premium_amount, base * 1.2));
    end if;
  end if;

  return base;
end;
$$;

-- Persist repayment tenure on create
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
  if not found then raise exception 'Profile missing'; end if;

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
    mode, status, current_cycle, premium_amount, interest_rate, repayment_tenure,
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
    'running'::public.chit_status,
    1,
    nullif(payload->>'premiumAmount', '')::numeric,
    nullif(payload->>'interestRate', '')::numeric,
    nullif(payload->>'repaymentTenure', '')::int,
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
    if v_customer is null then continue; end if;
    if not exists (select 1 from public.customers cu where cu.id = v_customer and cu.owner_id = uid) then
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
