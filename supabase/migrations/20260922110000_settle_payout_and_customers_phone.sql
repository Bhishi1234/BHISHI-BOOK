-- Resolve "function settle_payout(...) is not unique" (4-arg vs 5-arg overloads).
drop function if exists public.settle_payout(uuid, uuid, numeric, public.auction_method);

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
  return public.settle_payout(
    p_chit_id,
    winner,
    c.pot,
    'lucky_draw'::public.auction_method,
    null
  );
end;
$$;

grant execute on function public.settle_payout(uuid, uuid, numeric, public.auction_method, int) to authenticated;

-- Allow multiple customer records with the same phone (different names / family on one number).
alter table public.customers drop constraint if exists customers_owner_id_phone_key;
