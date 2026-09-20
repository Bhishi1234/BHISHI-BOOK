-- Profile phone + member read access to organiser chits (member_visible + phone match).

create or replace function public.set_profile_phone(p_phone text)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  p public.profiles;
  digits text;
begin
  digits := nullif(right(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g'), 10), '');
  if digits is not null and length(digits) <> 10 then
    raise exception 'phone must be 10 digits';
  end if;

  begin
    update public.profiles
    set phone = digits
    where id = public._uid()
    returning * into p;
  exception
    when unique_violation then
      raise exception 'This phone number is already linked to another account';
  end;

  if p.id is null then
    raise exception 'Unauthorized';
  end if;
  return p;
end;
$$;

-- SECURITY DEFINER so RLS policies can call this without recursion.
create or replace function public.is_visible_member(p_chit_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  my_phone text;
begin
  if auth.uid() is null then
    return false;
  end if;

  select phone into my_phone from public.profiles where id = auth.uid();
  if my_phone is null or my_phone = '' then
    return false;
  end if;

  return exists (
    select 1
    from public.chits c
    join public.chit_members cm on cm.chit_id = c.id
    join public.customers cu on cu.id = cm.customer_id
    where c.id = p_chit_id
      and c.member_visible = true
      and c.status <> 'cancelled'
      and c.owner_id <> auth.uid()
      and cu.phone = my_phone
  );
end;
$$;

create or replace function public.is_own_visible_payment(p_chit_id uuid, p_member_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  my_phone text;
begin
  if not public.is_visible_member(p_chit_id) then
    return false;
  end if;

  select phone into my_phone from public.profiles where id = auth.uid();
  if my_phone is null or my_phone = '' then
    return false;
  end if;

  return exists (
    select 1
    from public.customers cu
    where cu.id = p_member_id
      and cu.phone = my_phone
  );
end;
$$;

drop policy if exists chits_member_read on public.chits;
create policy chits_member_read on public.chits
  for select using (public.is_visible_member(id));

drop policy if exists members_member_read on public.chit_members;
create policy members_member_read on public.chit_members
  for select using (public.is_visible_member(chit_id));

drop policy if exists auctions_member_read on public.auctions;
create policy auctions_member_read on public.auctions
  for select using (public.is_visible_member(chit_id));

drop policy if exists payments_member_read on public.payments;
create policy payments_member_read on public.payments
  for select using (public.is_own_visible_payment(chit_id, member_id));

-- Safer customer visibility check (avoids RLS recursion on nested EXISTS).
create or replace function public.is_shared_customer(p_customer_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  my_phone text;
begin
  if auth.uid() is null then
    return false;
  end if;
  select phone into my_phone from public.profiles where id = auth.uid();
  if my_phone is null or my_phone = '' then
    return false;
  end if;
  return exists (
    select 1
    from public.customers cu
    join public.chit_members cm on cm.customer_id = cu.id
    join public.chits c on c.id = cm.chit_id
    where cu.id = p_customer_id
      and cu.phone = my_phone
      and c.member_visible = true
      and c.status <> 'cancelled'
      and c.owner_id <> auth.uid()
  );
end;
$$;

drop policy if exists customers_member_read on public.customers;
create policy customers_member_read on public.customers
  for select using (public.is_shared_customer(id));

grant execute on function public.set_profile_phone(text) to authenticated;
grant execute on function public.is_visible_member(uuid) to authenticated;
grant execute on function public.is_own_visible_payment(uuid, uuid) to authenticated;
grant execute on function public.is_shared_customer(uuid) to authenticated;

