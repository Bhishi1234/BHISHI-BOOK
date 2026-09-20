-- Auction ledger: commission leaves cash every month; dividend is
-- (discount − commission) / all members; next month's due drops by that dividend.

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
  safe_bid := case
    when p_method = 'auction' then least(c.pot, greatest(0, coalesce(p_bid, 0)))
    else greatest(0, c.pot - commission)
  end;
  discount := greatest(0, c.pot - safe_bid);
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
    raise exception 'Payout plus commission is more than cash on hand. Collect remaining dues or lower the winning bid.';
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
begin
  select * into c from public.chits where id = p_chit;
  if not found then
    return 0;
  end if;
  base := public._base_instalment(c);
  select greatest(1, count(*)) into n_members
  from public.chit_members
  where chit_id = p_chit;

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
    select * into prev from public.auctions where chit_id = p_chit and cycle = p_cycle - 1;
    if found and prev.method = 'auction' then
      div := floor(greatest(0, (c.pot - prev.bid) - prev.commission) / n_members);
      return greatest(0, base - div);
    end if;
    return base;
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
    select prized_cycle into prized
    from public.chit_members
    where chit_id = p_chit and customer_id = p_member;
    if prized is not null and p_cycle > prized then
      return round(base + (base * c.interest_rate) / 100);
    end if;
    return base;
  end if;

  return base;
end;
$$;
