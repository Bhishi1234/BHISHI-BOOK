-- Collect-first: every hand paid before award. All types: every hand paid before close.

create or replace function public._cycle_fully_collected(p_chit_id uuid, p_cycle int)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  m record;
  due_amt numeric;
  paid_amt numeric;
  hand_carry numeric;
  i int;
begin
  if not exists (select 1 from public.chit_members where chit_id = p_chit_id) then
    return false;
  end if;
  for m in
    select customer_id, slot from public.chit_members where chit_id = p_chit_id order by slot
  loop
    due_amt := public._raw_due_hand(p_chit_id, m.customer_id, m.slot, p_cycle);
    hand_carry := 0;
    for i in 1 .. greatest(0, p_cycle - 1) loop
      hand_carry := hand_carry
        + public._paid_in_cycle(p_chit_id, m.customer_id, i, m.slot)
        - public._raw_due_hand(p_chit_id, m.customer_id, m.slot, i);
    end loop;
    if hand_carry >= 0 then
      due_amt := greatest(0, due_amt - hand_carry);
    else
      due_amt := due_amt + abs(hand_carry);
    end if;
    if due_amt > 0.001 then
      paid_amt := public._paid_in_cycle(p_chit_id, m.customer_id, p_cycle, m.slot);
      if paid_amt + 0.001 < due_amt then
        return false;
      end if;
    end if;
  end loop;
  return true;
end;
$$;

-- Patch only the collection gate inside settle_payout (rest unchanged from prior migration).
create or replace function public.settle_payout(
  p_chit_id uuid,
  p_winner_id uuid,
  p_bid numeric,
  p_method public.auction_method,
  p_winner_slot int default null,
  p_interest_rate numeric default null
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
  award_first boolean := false;
  auction_peer boolean := false;
  hand_sacrifice boolean := false;
  last_hand boolean := false;
  sacrifice numeric := 0;
  remaining int;
  winner_share numeric;
  already_paid numeric;
  loan_rate numeric;
begin
  c := public._owned_chit(p_chit_id);
  if c.status <> 'running' and p_method <> 'settlement' then
    raise exception 'Chit is not running';
  end if;
  if c.status = 'cancelled' then
    raise exception 'Chit is cancelled';
  end if;

  award_first := coalesce(c.auction_style, 'collect_first') = 'auction_first';
  auction_peer :=
    c.type = 'auction'
    and award_first
    and p_method in ('auction', 'lucky_draw');
  auction_first := auction_peer;

  hand_sacrifice :=
    c.type = 'hand_sacrifice'
    and p_method in ('fixed', 'lucky_draw');

  if p_method <> 'settlement' and not award_first then
    if not public._cycle_fully_collected(p_chit_id, c.current_cycle) then
      raise exception 'Collect every hand''s full dues for this month before the award';
    end if;
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
  if p_method = 'fixed' and c.type <> 'loan' and winner.prized_cycle is not null then
    raise exception 'This member already won';
  end if;
  if p_method = 'fixed' and c.type = 'loan' and coalesce(p_bid, 0) <= 0 then
    raise exception 'Enter a loan amount';
  end if;
  if p_method = 'fixed' and c.type = 'loan' and c.current_cycle >= c.duration then
    raise exception 'No new loans on the last month — collect dues and settle leftover cash instead';
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

  if p_method = 'settlement' or last_auction then
    commission := 0;
  elsif p_method = 'fixed' and c.type = 'loan' and already_loaned then
    commission := 0;
  else
    commission := public._commission_amount(c);
  end if;

  select greatest(1, count(*)) into n_members
  from public.chit_members where chit_id = p_chit_id;

  if hand_sacrifice then
    if last_hand then
      sacrifice := 0;
    else
      sacrifice := public._base_instalment(c);
    end if;
    discount := sacrifice;
    safe_bid := greatest(0, c.pot - sacrifice - commission);
    if not award_first then
      safe_bid := least(safe_bid, greatest(0, cash_on_hand - commission - sacrifice));
    end if;
    remaining := greatest(0, unprized - 1);
    dividend := case when remaining > 0 and sacrifice > 0 then floor(sacrifice / remaining) else 0 end;
  elsif last_auction and auction_peer then
    safe_bid := greatest(0, c.pot);
  elsif last_auction and award_first then
    safe_bid := greatest(0, c.pot - commission);
  elsif last_auction then
    safe_bid := cash_on_hand;
  elsif p_method = 'auction' then
    safe_bid := least(c.pot, greatest(0, coalesce(p_bid, 0)));
    if not auction_peer then
      safe_bid := least(safe_bid, greatest(0, cash_on_hand - commission));
    end if;
  elsif p_method = 'lucky_draw' then
    safe_bid := greatest(0, c.pot - commission);
    if not award_first then
      safe_bid := least(safe_bid, greatest(0, cash_on_hand - commission));
    end if;
  elsif p_method = 'fixed' and c.type = 'loan' then
    safe_bid := greatest(0, coalesce(p_bid, 0));
    safe_bid := least(safe_bid, floor(public._loan_funding_capacity(p_chit_id)));
    loan_rate := coalesce(p_interest_rate, c.interest_rate, 0);
    if coalesce(c.loan_interest_upfront, true) then
      discount := round(safe_bid * loan_rate / 100);
    else
      discount := 0;
    end if;
  else
    safe_bid := greatest(0, coalesce(p_bid, 0));
    if safe_bid <= 0 then
      safe_bid := c.pot;
    end if;
    if c.type in ('fixed', 'base_premium', 'lucky_draw', 'hand_sacrifice') and not award_first then
      safe_bid := least(safe_bid, greatest(0, cash_on_hand - commission));
    elsif c.type in ('fixed', 'base_premium', 'lucky_draw') and award_first and safe_bid >= c.pot and commission > 0 then
      safe_bid := greatest(0, c.pot - commission);
    end if;
  end if;

  if not hand_sacrifice and not (p_method = 'fixed' and c.type = 'loan') then
    discount := case
      when p_method = 'auction' and not last_auction and not auction_peer then greatest(0, c.pot - safe_bid)
      else 0
    end;
    dividend := case
      when p_method = 'auction' and not last_auction and not auction_peer
        then floor(greatest(0, discount - commission) / n_members)
      else 0
    end;
  end if;

  if p_method = 'settlement' or auction_peer then
    arrears := 0;
  else
    arrears := public._outstanding_hand(p_chit_id, p_winner_id, winner.slot);
  end if;
  payout := greatest(0, safe_bid - arrears);
  if p_method = 'fixed' and c.type = 'loan' then
    payout := greatest(0, safe_bid - discount - arrears);
    payout := least(payout, greatest(0, public._loan_funding_capacity(p_chit_id) - commission));
  end if;

  if p_method = 'fixed' and c.type = 'loan' then
    if payout + commission > public._loan_funding_capacity(p_chit_id) then
      raise exception 'Loan payout plus commission exceeds cash on hand plus this month''s expected collections (%).',
        public._loan_funding_capacity(p_chit_id);
    end if;
  elsif not award_first then
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
    chit_id, cycle, winner_id, bid, method, discount, commission, dividend, payout, arrears_withheld, winner_slot, interest_rate
  ) values (
    p_chit_id, c.current_cycle, p_winner_id, safe_bid, p_method,
    discount, commission, dividend, payout, arrears, winner.slot,
    case when p_method = 'fixed' and c.type = 'loan' then coalesce(p_interest_rate, c.interest_rate, 0) else null end
  )
  returning * into rec;

  if p_method <> 'settlement' then
    update public.chit_members
    set prized_cycle = coalesce(prized_cycle, c.current_cycle)
    where id = winner.id;
  end if;

  if auction_peer and p_method in ('auction', 'lucky_draw') then
    winner_share := round(safe_bid / n_members::numeric);
    if winner_share * n_members < safe_bid then
      winner_share := winner_share + 1;
    end if;
    select coalesce(sum(amount), 0) into already_paid
    from public.payments
    where chit_id = p_chit_id and member_id = p_winner_id and cycle = c.current_cycle
      and coalesce(member_slot, winner.slot) = winner.slot;
    if winner_share > already_paid then
      insert into public.payments (chit_id, member_id, cycle, amount, kind, mode, note, member_slot)
      values (
        p_chit_id,
        p_winner_id,
        c.current_cycle,
        winner_share - already_paid,
        'full',
        'adjusted',
        'Winner self-contribution (auction-first)',
        winner.slot
      );
    end if;
  end if;

  return rec;
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
  money_in numeric;
  money_out numeric;
  cash_on_hand numeric;
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

  if not public._cycle_fully_collected(p_chit_id, c.current_cycle) then
    raise exception 'Collect every hand''s dues for this month before closing';
  end if;

  if c.current_cycle >= c.duration and c.type = 'loan' then
    select coalesce(sum(amount), 0) into money_in from public.payments where chit_id = p_chit_id;
    select coalesce(sum(a.payout + a.commission), 0)
    into money_out
    from public.auctions a
    where a.chit_id = p_chit_id;
    cash_on_hand := greatest(0, money_in - money_out);
    if cash_on_hand > 0.001 then
      raise exception 'Run final settlement (interest dividends + leftover) before closing the last month';
    end if;
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

grant execute on function public._cycle_fully_collected(uuid, int) to authenticated;
grant execute on function public.settle_payout(uuid, uuid, numeric, public.auction_method, int, numeric) to authenticated;
grant execute on function public.close_cycle(uuid) to authenticated;
