-- Member management: add/remove only before bhishi starts; swap after.

create or replace function public._chit_has_started(p_chit uuid)
returns boolean
language sql
stable
as $$
  select
    exists (select 1 from public.chits where id = p_chit and current_cycle > 1)
    or exists (select 1 from public.payments where chit_id = p_chit)
    or exists (select 1 from public.auctions where chit_id = p_chit)
    or exists (select 1 from public.chit_members where chit_id = p_chit and prized_cycle is not null);
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
  if n >= c.members_count then
    raise exception 'All slots are filled';
  end if;
  select coalesce(max(slot), 0) + 1 into v_slot
    from public.chit_members where chit_id = p_chit_id;
  insert into public.chit_members (chit_id, customer_id, slot)
  values (p_chit_id, p_customer_id, v_slot);
  return public._owned_chit(p_chit_id);
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
  delete from public.chit_members where chit_id = p_chit_id and slot = p_slot;
  return public._owned_chit(p_chit_id);
end;
$$;

-- Replace the person on a seat. Slot history (payments / awards for that hand) moves with the seat.
create or replace function public.swap_chit_member(
  p_chit_id uuid,
  p_slot int,
  p_new_customer_id uuid
)
returns public.chits
language plpgsql
security definer
set search_path = public
as $$
declare
  c public.chits;
  uid uuid := public._uid();
  old_id uuid;
begin
  c := public._owned_chit(p_chit_id);
  if c.status <> 'running' then
    raise exception 'Chit is not running';
  end if;
  if not public._chit_has_started(p_chit_id) then
    raise exception 'Before the bhishi starts, remove and add members instead of swapping';
  end if;
  if not exists (
    select 1 from public.customers cu where cu.id = p_new_customer_id and cu.owner_id = uid
  ) then
    raise exception 'Customer is not in your directory';
  end if;

  select customer_id into old_id
  from public.chit_members
  where chit_id = p_chit_id and slot = p_slot;
  if old_id is null then
    raise exception 'Hand / slot not found';
  end if;
  if old_id = p_new_customer_id then
    return public._owned_chit(p_chit_id);
  end if;

  -- Payments and awards for this hand move to the new person.
  update public.payments
  set member_id = p_new_customer_id
  where chit_id = p_chit_id
    and member_id = old_id
    and (
      member_slot = p_slot
      or (
        member_slot is null
        and (select count(*) from public.chit_members where chit_id = p_chit_id and customer_id = old_id) = 1
      )
    );

  update public.auctions
  set winner_id = p_new_customer_id
  where chit_id = p_chit_id
    and winner_id = old_id
    and (
      winner_slot = p_slot
      or (
        winner_slot is null
        and (select count(*) from public.chit_members where chit_id = p_chit_id and customer_id = old_id) = 1
      )
    );

  update public.chit_members
  set customer_id = p_new_customer_id
  where chit_id = p_chit_id and slot = p_slot;

  return public._owned_chit(p_chit_id);
end;
$$;

grant execute on function public._chit_has_started(uuid) to authenticated;
grant execute on function public.add_chit_member(uuid, uuid) to authenticated;
grant execute on function public.remove_chit_member(uuid, int) to authenticated;
grant execute on function public.swap_chit_member(uuid, int, uuid) to authenticated;
