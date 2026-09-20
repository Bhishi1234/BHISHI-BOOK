-- Loan / fixed payouts: principal leaves at face value; commission is separate.
-- Lucky draw still pays pot − commission.

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
begin
  c := public._owned_chit(p_chit_id);
  if c.status <> 'running' then
    raise exception 'Chit is not running';
  end if;
  if not exists (
    select 1 from public.payments
    where chit_id = p_chit_id and cycle = c.current_cycle
  ) then
    raise exception 'Record this month''s collections before the auction';
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

  commission := public._commission_amount(c);
  if p_method = 'auction' then
    safe_bid := least(c.pot, greatest(0, coalesce(p_bid, 0)));
  elsif p_method = 'lucky_draw' then
    safe_bid := greatest(0, c.pot - commission);
  else
    -- fixed / loan principal
    safe_bid := greatest(0, coalesce(nullif(p_bid, 0), c.pot));
  end if;
  discount := greatest(0, c.pot - least(safe_bid, c.pot));
  select greatest(1, count(*)) into n_members
  from public.chit_members
  where chit_id = p_chit_id;
  dividend := case
    when p_method = 'auction' then floor(greatest(0, discount - commission) / n_members)
    else 0
  end;
  arrears := public._outstanding(p_chit_id, p_winner_id);
  payout := greatest(0, safe_bid - arrears);

  select coalesce(sum(amount), 0) into money_in
  from public.payments
  where chit_id = p_chit_id;
  select coalesce(sum(a.payout + a.commission), 0) into money_out
  from public.auctions a
  where a.chit_id = p_chit_id;
  if payout + commission > greatest(0, money_in - money_out) then
    raise exception 'Payout plus commission is more than cash on hand. Collect remaining dues or lower the amount.';
  end if;

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

-- Loan months may close without a disbursement. Auction / fixed still need a settlement.
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
  if c.mode = 'organise'
     and c.type <> 'loan'
     and not exists (
       select 1 from public.auctions where chit_id = p_chit_id and cycle = c.current_cycle
     ) then
    raise exception 'Settle this cycle''s winner before closing';
  end if;
  next_cycle := c.current_cycle + 1;
  update public.chits
  set
    current_cycle = next_cycle,
    status = case
      when next_cycle > duration then 'completed'::public.chit_status
      else 'running'::public.chit_status
    end
  where id = p_chit_id;
  return public._owned_chit(p_chit_id);
end;
$$;
