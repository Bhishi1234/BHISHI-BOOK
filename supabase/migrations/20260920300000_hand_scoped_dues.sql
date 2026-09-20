-- Hands are independent: payments and loans are keyed by slot.
-- No new loans on the last month of a loan bhishi.

alter table public.payments
  add column if not exists member_slot int;

-- Backfill legacy receipts onto each person's lowest slot.
update public.payments p
set member_slot = sub.first_slot
from (
  select cm.chit_id, cm.customer_id, min(cm.slot) as first_slot
  from public.chit_members cm
  group by cm.chit_id, cm.customer_id
) sub
where p.member_slot is null
  and p.chit_id = sub.chit_id
  and p.member_id = sub.customer_id;

-- Loan principal for one hand (slot). Null slot = all hands of that person.
drop function if exists public._loan_principal(uuid, uuid);
drop function if exists public._first_loan_cycle(uuid, uuid);
drop function if exists public._paid_in_cycle(uuid, uuid, int);

create or replace function public._loan_principal(p_chit uuid, p_member uuid, p_slot int default null)
returns numeric
language sql
stable
as $$
  select coalesce(sum(
    case
      when coalesce(bid, 0) > 0 then bid
      else coalesce(payout, 0) + coalesce(discount, 0) + coalesce(arrears_withheld, 0)
    end
  ), 0)
  from public.auctions a
  where a.chit_id = p_chit
    and a.winner_id = p_member
    and a.method = 'fixed'
    and (
      p_slot is null
      or coalesce(a.winner_slot, (
        select min(slot) from public.chit_members
        where chit_id = p_chit and customer_id = p_member
      )) = p_slot
    );
$$;

create or replace function public._first_loan_cycle(p_chit uuid, p_member uuid, p_slot int default null)
returns int
language sql
stable
as $$
  select coalesce(min(cycle), 0)
  from public.auctions a
  where a.chit_id = p_chit
    and a.winner_id = p_member
    and a.method = 'fixed'
    and (
      p_slot is null
      or coalesce(a.winner_slot, (
        select min(slot) from public.chit_members
        where chit_id = p_chit and customer_id = p_member
      )) = p_slot
    );
$$;

-- Paid in one cycle for a person, or one hand when p_slot is set.
create or replace function public._paid_in_cycle(p_chit uuid, p_member uuid, p_cycle int, p_slot int default null)
returns numeric
language sql
stable
as $$
  select coalesce(sum(amount), 0)
  from public.payments p
  where p.chit_id = p_chit
    and p.member_id = p_member
    and p.cycle = p_cycle
    and (
      p_slot is null
      or coalesce(p.member_slot, (
        select min(slot) from public.chit_members
        where chit_id = p_chit and customer_id = p_member
      )) = p_slot
    );
$$;

-- Due for one hand (slot).
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
  principal numeric;
  start_c int;
  rate numeric;
  interest numeric;
  tenure int;
  month_index int;
  had_upfront boolean;
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
    principal := public._loan_principal(p_chit, p_member, p_slot);
    if principal <= 0 then return base; end if;
    start_c := public._first_loan_cycle(p_chit, p_member, p_slot);
    if start_c = 0 or p_cycle <= start_c then return base; end if;
    tenure := public._loan_effective_tenure(c, start_c);
    month_index := p_cycle - start_c;
    if month_index < 1 or month_index > tenure then return base; end if;
    rate := coalesce(c.interest_rate, 0);
    interest := round(principal * rate / 100);
    select exists (
      select 1 from public.auctions a
      where a.chit_id = p_chit and a.winner_id = p_member and a.method = 'fixed'
        and coalesce(a.discount, 0) > 0
        and coalesce(a.winner_slot, (
          select min(slot) from public.chit_members
          where chit_id = p_chit and customer_id = p_member
        )) = p_slot
    ) into had_upfront;
    if had_upfront and month_index = 1 then interest := 0; end if;
    if month_index = tenure then
      share := greatest(0, principal - ceil(principal / tenure) * (tenure - 1));
    else
      share := ceil(principal / tenure);
    end if;
    return base + interest + share;
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

-- Person-level raw due = sum of independent hands (never mirrors loan across hands).
create or replace function public._raw_due(p_chit uuid, p_member uuid, p_cycle int)
returns numeric
language plpgsql
stable
as $$
declare
  hand_sum numeric := 0;
  h record;
begin
  for h in
    select slot from public.chit_members where chit_id = p_chit and customer_id = p_member order by slot
  loop
    hand_sum := hand_sum + public._raw_due_hand(p_chit, p_member, h.slot, p_cycle);
  end loop;
  if hand_sum = 0 and not exists (
    select 1 from public.chit_members where chit_id = p_chit and customer_id = p_member
  ) then
    return public._raw_due_hand(p_chit, p_member, 1, p_cycle);
  end if;
  return hand_sum;
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

-- Hand-scoped payment recording.
drop function if exists public.record_payment(uuid, uuid, numeric, public.payment_kind, public.pay_mode, text);

create or replace function public.record_payment(
  p_chit_id uuid,
  p_member_id uuid,
  p_amount numeric,
  p_kind public.payment_kind default null,
  p_mode public.pay_mode default 'cash',
  p_note text default null,
  p_member_slot int default null
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
  v_slot int;
  first_slot int;
  hand_carry numeric := 0;
  i int;
begin
  c := public._owned_chit(p_chit_id);
  if c.status <> 'running' then
    raise exception 'Chit is not running';
  end if;
  if not exists (
    select 1 from public.chit_members
    where chit_id = p_chit_id and customer_id = p_member_id
      and (p_member_slot is null or slot = p_member_slot)
  ) then
    raise exception 'Not a member of this chit';
  end if;
  if coalesce(p_amount, 0) <= 0 then
    raise exception 'Amount must be greater than 0';
  end if;

  select min(slot) into first_slot
  from public.chit_members where chit_id = p_chit_id and customer_id = p_member_id;
  v_slot := coalesce(p_member_slot, first_slot);

  if p_member_slot is null then
    due := public._cycle_due(p_chit_id, p_member_id, c.current_cycle);
  else
    due := public._raw_due_hand(p_chit_id, p_member_id, v_slot, c.current_cycle);
    for i in 1 .. greatest(0, c.current_cycle - 1) loop
      hand_carry := hand_carry
        + public._paid_in_cycle(p_chit_id, p_member_id, i, v_slot)
        - public._raw_due_hand(p_chit_id, p_member_id, v_slot, i);
    end loop;
    if hand_carry >= 0 then
      due := greatest(0, due - hand_carry);
    else
      due := due + abs(hand_carry);
    end if;
  end if;

  insert into public.payments (chit_id, member_id, cycle, amount, kind, mode, note, member_slot)
  values (
    p_chit_id,
    p_member_id,
    c.current_cycle,
    p_amount,
    coalesce(p_kind, public.infer_kind(due, p_amount)),
    coalesce(p_mode, 'cash'),
    p_note,
    v_slot
  )
  returning * into pay;
  return pay;
end;
$$;

grant execute on function public.record_payment(uuid, uuid, numeric, public.payment_kind, public.pay_mode, text, int) to authenticated;

-- Last-month close checks every hand; block new loans on last month in settle_payout.
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
  hand_carry numeric;
  i int;
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

  if c.current_cycle >= c.duration then
    for m in
      select customer_id, slot from public.chit_members where chit_id = p_chit_id order by slot
    loop
      -- Outstanding for this hand
      hand_carry := 0;
      for i in 1 .. c.current_cycle loop
        hand_carry := hand_carry
          + public._paid_in_cycle(p_chit_id, m.customer_id, i, m.slot)
          - public._raw_due_hand(p_chit_id, m.customer_id, m.slot, i);
      end loop;
      if hand_carry < -0.001 then
        raise exception 'Clear all outstanding dues before closing the last month';
      end if;

      due_amt := public._raw_due_hand(p_chit_id, m.customer_id, m.slot, c.current_cycle);
      hand_carry := 0;
      for i in 1 .. greatest(0, c.current_cycle - 1) loop
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
        paid_amt := public._paid_in_cycle(p_chit_id, m.customer_id, c.current_cycle, m.slot);
        if paid_amt + 0.001 < due_amt then
          raise exception 'Record every hand''s payment for this month before closing';
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

create or replace function public._outstanding_hand(p_chit uuid, p_member uuid, p_slot int)
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
  if not found then return 0; end if;
  for i in 1 .. c.current_cycle loop
    due := due + public._raw_due_hand(p_chit, p_member, p_slot, i);
    paid := paid + public._paid_in_cycle(p_chit, p_member, i, p_slot);
  end loop;
  return greatest(0, due - paid);
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
    -- Withhold only this hand's outstanding, not the person's other hands.
    arrears := public._outstanding_hand(p_chit_id, p_winner_id, winner.slot);
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

  -- Auction-first: book the winnerâ€™s bidÃ·N share as paid-in (self-contribution).
  if auction_first and p_method in ('auction', 'lucky_draw') then
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



