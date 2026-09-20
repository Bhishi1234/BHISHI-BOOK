-- Auction subtypes: collect_first (default) vs auction_first (bid then pay bid÷n).

do $$ begin
  create type public.auction_style as enum ('collect_first', 'auction_first');
exception when duplicate_object then null;
end $$;

alter table public.chits
  add column if not exists auction_style public.auction_style not null default 'collect_first';

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
    adjustment_style, auction_style, remind_days, member_visible
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

  return c;
end;
$$;

-- Dues: auction_first uses this cycle's winning bid ÷ N (plus commission).
create or replace function public._raw_due(p_chit uuid, p_member uuid, p_cycle int)
returns numeric
language plpgsql
stable
as $$
declare
  c public.chits;
  base numeric;
  prev public.auctions;
  this_a public.auctions;
  prized int;
  n_members int;
  share_of numeric;
begin
  select * into c from public.chits where id = p_chit;
  if not found then
    return 0;
  end if;
  base := public._base_instalment(c);
  select greatest(1, count(*)) into n_members from public.chit_members where chit_id = p_chit;

  if c.type = 'auction' then
    if coalesce(c.auction_style, 'collect_first') = 'auction_first' then
      select * into this_a
      from public.auctions
      where chit_id = p_chit and cycle = p_cycle
        and method in ('auction', 'lucky_draw')
      limit 1;
      if found then
        share_of := this_a.bid + coalesce(this_a.commission, 0);
        return greatest(0, ceil(share_of / n_members));
      end if;
      return base;
    end if;

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

-- settle_payout: auction_first may run before collections and without cash-on-hand gate.
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
  cash_on_hand numeric;
  already_loaned boolean := false;
  unprized int;
  last_auction boolean := false;
  auction_first boolean := false;
begin
  c := public._owned_chit(p_chit_id);
  if c.status <> 'running' and p_method <> 'settlement' then
    raise exception 'Chit is not running';
  end if;
  if c.status = 'cancelled' then
    raise exception 'Chit is cancelled';
  end if;

  auction_first :=
    c.type = 'auction'
    and coalesce(c.auction_style, 'collect_first') = 'auction_first'
    and p_method in ('auction', 'lucky_draw');

  if p_method <> 'settlement' and not auction_first and not exists (
    select 1 from public.payments
    where chit_id = p_chit_id and cycle = c.current_cycle
  ) then
    raise exception 'Record this month''s collections before the auction';
  end if;

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

  select count(*) into unprized
  from public.chit_members
  where chit_id = p_chit_id and prized_cycle is null;

  last_auction :=
    c.type = 'auction'
    and p_method in ('auction', 'lucky_draw')
    and (c.current_cycle >= c.duration or unprized <= 1);

  select coalesce(sum(amount), 0) into money_in from public.payments where chit_id = p_chit_id;
  select coalesce(sum(a.payout + a.commission), 0) into money_out from public.auctions a where a.chit_id = p_chit_id;
  cash_on_hand := greatest(0, money_in - money_out);

  if p_method = 'settlement' or last_auction then
    commission := 0;
  elsif p_method = 'fixed' and c.type = 'loan' and already_loaned then
    commission := 0;
  else
    commission := public._commission_amount(c);
  end if;

  if last_auction and auction_first then
    safe_bid := greatest(0, c.pot);
  elsif last_auction then
    safe_bid := cash_on_hand;
  elsif p_method = 'auction' then
    safe_bid := least(c.pot, greatest(0, coalesce(p_bid, 0)));
  elsif p_method = 'lucky_draw' then
    safe_bid := greatest(0, c.pot - commission);
  else
    safe_bid := greatest(0, coalesce(p_bid, 0));
    if safe_bid <= 0 then
      safe_bid := c.pot;
    end if;
  end if;

  discount := case
    when p_method = 'auction' and not last_auction then greatest(0, c.pot - safe_bid)
    else 0
  end;
  select greatest(1, count(*)) into n_members
  from public.chit_members where chit_id = p_chit_id;
  dividend := case
    when p_method = 'auction' and not last_auction then floor(greatest(0, discount - commission) / n_members)
    else 0
  end;

  if p_method = 'settlement' then
    arrears := 0;
  else
    arrears := public._outstanding(p_chit_id, p_winner_id);
  end if;
  payout := greatest(0, safe_bid - arrears);

  if not auction_first and payout + commission > cash_on_hand then
    raise exception 'Amount plus commission is more than cash on hand (%). Collect more or lower the amount.',
      cash_on_hand;
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
