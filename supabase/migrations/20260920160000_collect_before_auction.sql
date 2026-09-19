-- Auction / lucky draw only after this cycle has collections,
-- and payout cannot exceed cash on hand.

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

  select coalesce(sum(amount), 0) into money_in
  from public.payments
  where chit_id = p_chit_id;
  select coalesce(sum(a.payout), 0) into money_out
  from public.auctions a
  where a.chit_id = p_chit_id;
  if payout > greatest(0, money_in - money_out) then
    raise exception 'Payout is more than cash on hand. Collect remaining dues or lower the winning bid.';
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
