-- Multi-hand: same person may hold several slots.
-- Last-month close: only when every member has paid (no outstanding).

alter table public.chit_members
  drop constraint if exists chit_members_chit_id_customer_id_key;

-- Some DBs name the unique constraint differently.
do $$ begin
  alter table public.chit_members drop constraint chit_members_chit_id_customer_id_key;
exception when undefined_object then null;
end $$;

do $$
declare
  r record;
begin
  for r in
    select c.conname
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'chit_members'
      and c.contype = 'u'
      and pg_get_constraintdef(c.oid) ilike '%customer_id%'
  loop
    execute format('alter table public.chit_members drop constraint %I', r.conname);
  end loop;
end $$;

alter table public.auctions
  add column if not exists winner_slot int;

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
  v_slot int;
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
  select count(*) into n from public.chit_members where chit_id = p_chit_id;
  if n >= c.members_count then
    raise exception 'All slots are filled';
  end if;
  select coalesce(max(slot), 0) + 1 into v_slot
  from public.chit_members where chit_id = p_chit_id;
  insert into public.chit_members (chit_id, customer_id, slot)
  values (p_chit_id, p_customer_id, v_slot);
  return public._owned_chit(p_chit_id);
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
  m record;
  due_amt numeric;
  paid_amt numeric;
begin
  c := public._owned_chit(p_chit_id);
  if c.status <> 'running' then
    raise exception 'Chit is not running';
  end if;
  if not exists (select 1 from public.chit_members where chit_id = p_chit_id) then
    raise exception 'Add members before closing a cycle';
  end if;
  if c.mode = 'organise'
     and c.type <> 'loan'
     and not exists (
       select 1 from public.auctions where chit_id = p_chit_id and cycle = c.current_cycle
     ) then
    raise exception 'Settle this cycle''s winner before closing';
  end if;

  -- Last month: every unique member must have paid this cycle with nothing outstanding.
  if c.current_cycle >= c.duration then
    for m in
      select distinct customer_id from public.chit_members where chit_id = p_chit_id
    loop
      if public._outstanding(p_chit_id, m.customer_id) > 0.001 then
        raise exception 'Clear all outstanding dues before closing the last month';
      end if;
      -- Amount still due this cycle after carry-forward (0 if advances cover it).
      due_amt := public._cycle_due(p_chit_id, m.customer_id, c.current_cycle);
      if due_amt > 0.001 then
        select coalesce(sum(amount), 0) into paid_amt
        from public.payments
        where chit_id = p_chit_id and member_id = m.customer_id and cycle = c.current_cycle;
        if paid_amt + 0.001 < due_amt then
          raise exception 'Record every member''s payment for this month before closing';
        end if;
      end if;
    end loop;
  end if;

  next_cycle := c.current_cycle + 1;
  if next_cycle > c.duration then
    update public.chits
    set
      current_cycle = c.duration,
      status = 'completed'::public.chit_status
    where id = p_chit_id;
  else
    update public.chits
    set
      current_cycle = next_cycle,
      status = 'running'::public.chit_status
    where id = p_chit_id;
  end if;

  return public._owned_chit(p_chit_id);
end;
$$;

-- Multi-hand dues: each hand owes one instalment share.
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
  n_hands int;
  share_of numeric;
  share numeric;
  principal numeric;
  start_c int;
  rate numeric;
  interest numeric;
  tenure int;
  month_index int;
  had_upfront boolean;
  unit numeric;
  hand_sum numeric := 0;
  h record;
begin
  select * into c from public.chits where id = p_chit;
  if not found then return 0; end if;
  base := public._base_instalment(c);
  select greatest(1, count(*)) into n_members from public.chit_members where chit_id = p_chit;
  select greatest(1, count(*)) into n_hands from public.chit_members where chit_id = p_chit and customer_id = p_member;

  if c.type = 'auction' then
    if coalesce(c.auction_style, 'collect_first') = 'auction_first' then
      select * into this_a from public.auctions
      where chit_id = p_chit and cycle = p_cycle and method in ('auction', 'lucky_draw') limit 1;
      if found then
        share_of := this_a.bid;
        share := round(share_of / n_members::numeric);
        if share * n_members < share_of then share := share + 1; end if;
        return greatest(0, share) * n_hands;
      end if;
      return base * n_hands;
    end if;
    select * into prev from public.auctions where chit_id = p_chit and cycle = p_cycle - 1;
    if found then
      return greatest(0, base - coalesce(prev.dividend, 0)) * n_hands;
    end if;
    return base * n_hands;
  end if;

  if c.type = 'loan' then
    principal := public._loan_principal(p_chit, p_member);
    if principal <= 0 then return base * n_hands; end if;
    start_c := public._first_loan_cycle(p_chit, p_member);
    if start_c = 0 or p_cycle <= start_c then return base * n_hands; end if;
    tenure := public._loan_effective_tenure(c, start_c);
    month_index := p_cycle - start_c;
    if month_index < 1 or month_index > tenure then return base * n_hands; end if;
    rate := coalesce(c.interest_rate, 0);
    interest := round(principal * rate / 100);
    select exists (
      select 1 from public.auctions a
      where a.chit_id = p_chit and a.winner_id = p_member and a.method = 'fixed'
        and coalesce(a.discount, 0) > 0
    ) into had_upfront;
    if had_upfront and month_index = 1 then interest := 0; end if;
    if month_index = tenure then
      share := greatest(0, principal - ceil(principal / tenure) * (tenure - 1));
    else
      share := ceil(principal / tenure);
    end if;
    return base * n_hands + interest + share;
  end if;

  if c.type = 'base_premium' or (c.type = 'fixed' and coalesce(c.premium_amount, 0) > 0) then
    for h in select prized_cycle from public.chit_members where chit_id = p_chit and customer_id = p_member
    loop
      if h.prized_cycle is not null and p_cycle >= h.prized_cycle then
        hand_sum := hand_sum + round(coalesce(c.premium_amount, base * 1.2));
      else
        hand_sum := hand_sum + base;
      end if;
    end loop;
    return hand_sum;
  end if;

  return base * n_hands;
end;
$$;

create or replace function public.settle_payout(
  p_chit_id uuid,
  p_winner_id uuid,
  p_bid numeric,
  p_method public.auction_method,
  p_winner_slot int default null
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
  discount numeric := 0;
  commission numeric;
  n_members int;
  dividend numeric := 0;
  arrears numeric;
  payout numeric;
  money_in numeric;
  money_out numeric;
  cash_on_hand numeric;
  already_loaned boolean := false;
  unprized int;
  last_auction boolean := false;
  auction_first boolean := false;
  hand_sacrifice boolean := false;
  last_hand boolean := false;
  sacrifice numeric := 0;
  remaining int;
  winner_share numeric;
  already_paid numeric;
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

  hand_sacrifice :=
    c.type = 'hand_sacrifice'
    and p_method in ('fixed', 'lucky_draw');

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
  where chit_id = p_chit_id and customer_id = p_winner_id
    and (p_winner_slot is null or slot = p_winner_slot)
  order by
    case when prized_cycle is null then 0 else 1 end,
    slot
  limit 1;
  if not found then
    raise exception 'Winner is not a member of this chit';
  end if;
  if p_method not in ('fixed', 'settlement') and winner.prized_cycle is not null then
    raise exception 'This member already won';
  end if;
  -- Fixed / hand-sacrifice awards also require an unprized winner.
  if p_method = 'fixed' and c.type <> 'loan' and winner.prized_cycle is not null then
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

  last_hand := hand_sacrifice and unprized <= 1;

  select coalesce(sum(amount), 0) into money_in from public.payments where chit_id = p_chit_id;
  select coalesce(sum(a.payout + a.commission), 0)
    + case when c.type = 'hand_sacrifice' then coalesce(sum(a.discount), 0) else 0 end
  into money_out
  from public.auctions a
  where a.chit_id = p_chit_id;
  cash_on_hand := greatest(0, money_in - money_out);

  if p_method = 'settlement' or last_auction or auction_first then
    commission := 0;
  elsif p_method = 'fixed' and c.type = 'loan' and already_loaned then
    commission := 0;
  else
    commission := public._commission_amount(c);
  end if;

  select greatest(1, count(*)) into n_members
  from public.chit_members where chit_id = p_chit_id;

  if hand_sacrifice then
    -- One full instalment left as cash dividends (full pot for last member).
    if last_hand then
      sacrifice := 0;
    else
      sacrifice := public._base_instalment(c);
    end if;
    discount := sacrifice;
    safe_bid := greatest(0, c.pot - sacrifice - commission);
    safe_bid := least(safe_bid, greatest(0, cash_on_hand - commission - sacrifice));
    remaining := greatest(0, unprized - 1);
    dividend := case when remaining > 0 and sacrifice > 0 then floor(sacrifice / remaining) else 0 end;
  elsif last_auction and auction_first then
    safe_bid := greatest(0, c.pot);
  elsif last_auction then
    safe_bid := cash_on_hand;
  elsif p_method = 'auction' then
    safe_bid := least(c.pot, greatest(0, coalesce(p_bid, 0)));
    if not auction_first then
      safe_bid := least(safe_bid, greatest(0, cash_on_hand - commission));
    end if;
  elsif p_method = 'lucky_draw' then
    safe_bid := greatest(0, c.pot - commission);
    if not auction_first then
      safe_bid := least(safe_bid, greatest(0, cash_on_hand - commission));
    end if;
  elsif p_method = 'fixed' and c.type = 'loan' then
    -- Face principal; one month's interest cut stays in the pot.
    safe_bid := greatest(0, coalesce(p_bid, 0));
    discount := round(safe_bid * coalesce(c.interest_rate, 0) / 100);
  else
    safe_bid := greatest(0, coalesce(p_bid, 0));
    if safe_bid <= 0 then
      safe_bid := c.pot;
    end if;
    if c.type in ('fixed', 'base_premium', 'lucky_draw') then
      safe_bid := least(safe_bid, greatest(0, cash_on_hand - commission));
    end if;
  end if;

  if not hand_sacrifice and not (p_method = 'fixed' and c.type = 'loan') then
    discount := case
      when p_method = 'auction' and not last_auction and not auction_first then greatest(0, c.pot - safe_bid)
      else 0
    end;
    dividend := case
      when p_method = 'auction' and not last_auction and not auction_first
        then floor(greatest(0, discount - commission) / n_members)
      else 0
    end;
  end if;

  if p_method = 'settlement' or auction_first then
    arrears := 0;
  else
    arrears := public._outstanding(p_chit_id, p_winner_id);
  end if;
  payout := greatest(0, safe_bid - arrears);
  if p_method = 'fixed' and c.type = 'loan' then
    payout := greatest(0, safe_bid - discount - arrears);
    payout := least(payout, greatest(0, cash_on_hand - commission));
  end if;

  if not auction_first then
    -- PL/pgSQL cannot embed a SQL CASE in an IF expression; branch instead.
    if hand_sacrifice then
      if payout + commission + discount > cash_on_hand then
        raise exception 'Amount plus commission is more than cash on hand (%). Collect more or lower the amount.',
          cash_on_hand;
      end if;
    elsif payout + commission > cash_on_hand then
      raise exception 'Amount plus commission is more than cash on hand (%). Collect more or lower the amount.',
        cash_on_hand;
    end if;
  end if;

  insert into public.auctions (
    chit_id, cycle, winner_id, bid, method, discount, commission, dividend, payout, arrears_withheld, winner_slot
  ) values (
    p_chit_id, c.current_cycle, p_winner_id, safe_bid, p_method,
    discount, commission, dividend, payout, arrears, winner.slot
  )
  returning * into rec;

  if p_method <> 'settlement' then
    update public.chit_members
    set prized_cycle = coalesce(prized_cycle, c.current_cycle)
    where id = winner.id;
  end if;

  -- Auction-first: book the winner’s bid÷N share as paid-in (self-contribution).
  if auction_first and p_method in ('auction', 'lucky_draw') then
    winner_share := round(safe_bid / n_members::numeric);
    if winner_share * n_members < safe_bid then
      winner_share := winner_share + 1;
    end if;
    select coalesce(sum(amount), 0) into already_paid
    from public.payments
    where chit_id = p_chit_id and member_id = p_winner_id and cycle = c.current_cycle;
    if winner_share > already_paid then
      insert into public.payments (chit_id, member_id, cycle, amount, kind, mode, note)
      values (
        p_chit_id,
        p_winner_id,
        c.current_cycle,
        winner_share - already_paid,
        'full',
        'adjusted',
        'Winner self-contribution (auction-first)'
      );
    end if;
  end if;

  return rec;
end;
$$;


