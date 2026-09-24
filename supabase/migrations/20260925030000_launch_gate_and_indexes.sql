-- Launch hardening: ensure collect gate exists + scale indexes.
-- Safe to re-run (IF NOT EXISTS / CREATE OR REPLACE).

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

create index if not exists payments_chit_idx on public.payments (chit_id, cycle);
create index if not exists payments_chit_cycle_member_idx on public.payments (chit_id, cycle, member_id);
create index if not exists auctions_chit_idx on public.auctions (chit_id, cycle);
create index if not exists auctions_chit_cycle_method_idx on public.auctions (chit_id, cycle, method);
create index if not exists chit_members_customer_idx on public.chit_members (customer_id);
create index if not exists chits_owner_status_idx on public.chits (owner_id, status);
create index if not exists customers_owner_phone_idx on public.customers (owner_id, phone);

comment on function public._cycle_fully_collected(uuid, int) is
  'True when every hand has paid this cycle''s dues (used by settle_payout / close_cycle).';
