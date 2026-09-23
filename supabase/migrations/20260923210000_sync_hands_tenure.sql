-- Before start: keep duration, members_count, and instalment in sync with hands.

create or replace function public._sync_chit_hands(p_chit_id uuid)
returns public.chits
language plpgsql
security definer
set search_path = public
as $$
declare
  c public.chits;
  n int;
  new_inst numeric;
begin
  c := public._owned_chit(p_chit_id);
  select count(*) into n from public.chit_members where chit_id = p_chit_id;
  if n < 1 then
    raise exception 'Keep at least one member in the group';
  end if;
  -- Instalment so N × instalment covers the pot (same as app computeInstalment).
  new_inst := round(c.pot / n);
  if new_inst * n < c.pot then
    new_inst := new_inst + 1;
  end if;
  update public.chits
  set
    members_count = n,
    duration = n,
    instalment = new_inst,
    repayment_tenure = case
      when repayment_tenure is null then null
      when repayment_tenure > n then n
      else repayment_tenure
    end
  where id = p_chit_id;
  return public._owned_chit(p_chit_id);
end;
$$;

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
  if public._chit_has_started(p_chit_id) then
    raise exception 'Cannot add members after the bhishi has started. Use Swap to replace a person on a seat.';
  end if;
  if not exists (
    select 1 from public.customers cu where cu.id = p_customer_id and cu.owner_id = uid
  ) then
    raise exception 'Customer is not in your directory';
  end if;
  select count(*) into n from public.chit_members where chit_id = p_chit_id;
  -- Before start, adding a hand grows the group (tenure + instalment follow).
  select coalesce(max(slot), 0) + 1 into v_slot
    from public.chit_members where chit_id = p_chit_id;
  insert into public.chit_members (chit_id, customer_id, slot)
  values (p_chit_id, p_customer_id, v_slot);
  return public._sync_chit_hands(p_chit_id);
end;
$$;

create or replace function public.remove_chit_member(p_chit_id uuid, p_slot int)
returns public.chits
language plpgsql
security definer
set search_path = public
as $$
declare
  c public.chits;
  n int;
begin
  c := public._owned_chit(p_chit_id);
  if c.status <> 'running' then
    raise exception 'Chit is not running';
  end if;
  if public._chit_has_started(p_chit_id) then
    raise exception 'Cannot remove members after the bhishi has started. Use Swap instead.';
  end if;
  if not exists (
    select 1 from public.chit_members where chit_id = p_chit_id and slot = p_slot
  ) then
    raise exception 'Hand / slot not found';
  end if;
  select count(*) into n from public.chit_members where chit_id = p_chit_id;
  if n <= 1 then
    raise exception 'Keep at least one member in the group';
  end if;
  delete from public.chit_members where chit_id = p_chit_id and slot = p_slot;
  return public._sync_chit_hands(p_chit_id);
end;
$$;

grant execute on function public._sync_chit_hands(uuid) to authenticated;
grant execute on function public.add_chit_member(uuid, uuid) to authenticated;
grant execute on function public.remove_chit_member(uuid, int) to authenticated;
