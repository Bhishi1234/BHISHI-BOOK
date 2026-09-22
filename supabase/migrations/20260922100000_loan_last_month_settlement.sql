-- Loan bhishi: last month cannot close until final settlement clears cash on hand.

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
  money_in numeric;
  money_out numeric;
  cash_on_hand numeric;
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

    if c.type = 'loan' then
      select coalesce(sum(amount), 0) into money_in from public.payments where chit_id = p_chit_id;
      select coalesce(sum(a.payout + a.commission), 0)
        + case when c.type = 'hand_sacrifice' then coalesce(sum(a.discount), 0) else 0 end
      into money_out
      from public.auctions a
      where a.chit_id = p_chit_id;
      cash_on_hand := greatest(0, money_in - money_out);
      if cash_on_hand > 0.001 then
        raise exception 'Run final settlement (interest dividends + leftover) before closing the last month';
      end if;
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

grant execute on function public.close_cycle(uuid) to authenticated;
