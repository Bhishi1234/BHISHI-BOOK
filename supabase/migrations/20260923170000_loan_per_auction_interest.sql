-- Per-loan interest rate (set on Award when giving the loan).

alter table public.auctions
  add column if not exists interest_rate numeric(8, 4);

-- Backfill existing loan rows from chit default (legacy).
update public.auctions a
set interest_rate = c.interest_rate
from public.chits c
where a.chit_id = c.id
  and a.method = 'fixed'
  and c.type = 'loan'
  and a.interest_rate is null
  and c.interest_rate is not null;

create or replace function public._raw_due_hand(p_chit uuid, p_member uuid, p_slot int, p_cycle int)
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
  share numeric;
  a record;
  face numeric;
  start_c int;
  rate numeric;
  tenure int;
  month_index int;
  had_upfront boolean;
  interest_sum numeric := 0;
  principal_sum numeric := 0;
  int_part numeric;
  prin_part numeric;
  base_share numeric;
  outstanding numeric;
begin
  select * into c from public.chits where id = p_chit;
  if not found then return 0; end if;
  base := public._base_instalment(c);
  select greatest(1, count(*)) into n_members from public.chit_members where chit_id = p_chit;

  if c.type = 'auction' then
    if coalesce(c.auction_style, 'collect_first') = 'auction_first' then
      select * into this_a from public.auctions
      where chit_id = p_chit and cycle = p_cycle and method in ('auction', 'lucky_draw') limit 1;
      if found then
        share_of := this_a.bid;
        share := round(share_of / n_members::numeric);
        if share * n_members < share_of then share := share + 1; end if;
        return greatest(0, share);
      end if;
      return base;
    end if;
    select * into prev from public.auctions where chit_id = p_chit and cycle = p_cycle - 1;
    if found then
      return greatest(0, base - coalesce(prev.dividend, 0));
    end if;
    return base;
  end if;

  if c.type = 'loan' then
    for a in
      select *
      from public.auctions au
      where au.chit_id = p_chit
        and au.winner_id = p_member
        and au.method = 'fixed'
        and coalesce(au.winner_slot, (
          select min(slot) from public.chit_members
          where chit_id = p_chit and customer_id = p_member
        )) = p_slot
    loop
      face := greatest(0, coalesce(a.bid, 0));
      if face <= 0 then continue; end if;
      start_c := a.cycle;
      if p_cycle <= start_c then continue; end if;
      tenure := public._loan_effective_tenure(c, start_c);
      month_index := p_cycle - start_c;
      if month_index < 1 or month_index > tenure then continue; end if;
      had_upfront := coalesce(a.discount, 0) > 0;
      rate := coalesce(a.interest_rate, c.interest_rate, 0);

      if coalesce(c.loan_principal_mode, 'emi') = 'end' then
        int_part := round(face * rate / 100);
        if had_upfront and month_index = 1 then int_part := 0; end if;
        prin_part := case when month_index = tenure then face else 0 end;
      else
        base_share := ceil(face / tenure);
        if month_index <= 1 then
          outstanding := face;
        else
          outstanding := greatest(0, face - base_share * (month_index - 1));
        end if;
        int_part := round(outstanding * rate / 100);
        if had_upfront and month_index = 1 then int_part := 0; end if;
        if month_index = tenure then
          prin_part := greatest(0, face - base_share * (tenure - 1));
        else
          prin_part := base_share;
        end if;
      end if;
      interest_sum := interest_sum + int_part;
      principal_sum := principal_sum + prin_part;
    end loop;
    return base + interest_sum + principal_sum;
  end if;

  if c.type = 'base_premium' or (c.type = 'fixed' and coalesce(c.premium_amount, 0) > 0) then
    select prized_cycle into prized
    from public.chit_members
    where chit_id = p_chit and customer_id = p_member and slot = p_slot;
    if prized is not null and p_cycle >= prized then
      return round(coalesce(c.premium_amount, base * 1.2));
    end if;
    return base;
  end if;

  return base;
end;
$$;


-- settle_payout: accept and store per-loan interest rate
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
  -- Legacy name: peer bid÷n path (auction only). Collection/cash gates use award_first.
  auction_first := auction_peer;

  hand_sacrifice :=
    c.type = 'hand_sacrifice'
    and p_method in ('fixed', 'lucky_draw');

  if p_method <> 'settlement' and not award_first and not exists (
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

  if p_method = 'settlement' or last_auction or auction_peer then
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
    -- Face principal; clamp to cash on hand + still expected this month.
    -- Interest rate comes from this award (p_interest_rate), else chit legacy default.
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
    -- Withhold only this hand's outstanding, not the person's other hands.
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

  -- Auction-first: book the winnerâ€™s bidÃ·N share as paid-in (self-contribution).
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
