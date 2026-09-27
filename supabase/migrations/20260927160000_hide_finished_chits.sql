-- Hide a finished bhishi from this user's lists. The group and its books stay.

create table if not exists public.hidden_chits (
  user_id uuid not null references public.profiles (id) on delete cascade,
  chit_id uuid not null references public.chits (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, chit_id)
);

alter table public.hidden_chits enable row level security;

drop policy if exists hidden_chits_own_select on public.hidden_chits;
create policy hidden_chits_own_select on public.hidden_chits
  for select using (user_id = auth.uid());

create or replace function public.hide_chit(p_chit_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := public._uid();
  st public.chit_status;
  owner uuid;
begin
  select c.status, c.owner_id into st, owner
  from public.chits c
  where c.id = p_chit_id;

  if owner is null then
    raise exception 'Bhishi not found';
  end if;

  if st not in ('completed', 'cancelled') then
    raise exception 'Only a completed or cancelled bhishi can be removed from your list';
  end if;

  if owner <> uid and not public.is_visible_member(p_chit_id) then
    raise exception 'Bhishi not found';
  end if;

  insert into public.hidden_chits (user_id, chit_id)
  values (uid, p_chit_id)
  on conflict do nothing;
end;
$$;

grant execute on function public.hide_chit(uuid) to authenticated;

-- Owner can still write their groups. Hidden ones drop out of lists only.
drop policy if exists chits_own on public.chits;
drop policy if exists chits_own_select on public.chits;
drop policy if exists chits_own_insert on public.chits;
drop policy if exists chits_own_update on public.chits;
drop policy if exists chits_own_delete on public.chits;

create policy chits_own_select on public.chits
  for select using (
    owner_id = auth.uid()
    and not exists (
      select 1 from public.hidden_chits h
      where h.user_id = auth.uid() and h.chit_id = chits.id
    )
  );

create policy chits_own_insert on public.chits
  for insert with check (owner_id = auth.uid());

create policy chits_own_update on public.chits
  for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy chits_own_delete on public.chits
  for delete using (owner_id = auth.uid());

drop policy if exists chits_member_read on public.chits;
create policy chits_member_read on public.chits
  for select using (
    public.is_visible_member(id)
    and not exists (
      select 1 from public.hidden_chits h
      where h.user_id = auth.uid() and h.chit_id = chits.id
    )
  );
