-- Cancel reasons, account deletion feedback, customer phone update, member exit,
-- and foreman commission on auction-first (peer) awards.

alter table public.chits
  add column if not exists cancel_reasons text[] not null default '{}';

create table if not exists public.account_deletion_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete set null,
  phone text,
  reasons text[] not null default '{}',
  note text,
  created_at timestamptz not null default now()
);

alter table public.account_deletion_feedback enable row level security;

drop policy if exists deletion_feedback_insert on public.account_deletion_feedback;
create policy deletion_feedback_insert on public.account_deletion_feedback
  for insert to authenticated
  with check (user_id = auth.uid());

grant insert on public.account_deletion_feedback to authenticated;

-- Replace older single-arg overloads so reasons always persist.
drop function if exists public.cancel_chit(uuid);
drop function if exists public.deactivate_account();

create or replace function public.cancel_chit(p_chit_id uuid, p_reasons text[] default null)
returns public.chits
language plpgsql
security definer
set search_path = public
as $$
declare
  c public.chits;
begin
  c := public._owned_chit(p_chit_id);
  update public.chits
  set
    status = 'cancelled'::public.chit_status,
    cancel_reasons = coalesce(p_reasons, '{}')
  where id = c.id;
  return public._owned_chit(p_chit_id);
end;
$$;

create or replace function public.deactivate_account(p_reasons text[] default null, p_note text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := public._uid();
  ph text;
begin
  select phone into ph from public.profiles where id = uid;
  insert into public.account_deletion_feedback (user_id, phone, reasons, note)
  values (uid, ph, coalesce(p_reasons, '{}'), nullif(trim(coalesce(p_note, '')), ''));
  update public.profiles
  set deactivated_at = now()
  where id = uid;
end;
$$;

create or replace function public.update_customer(
  p_customer_id uuid,
  p_name text default null,
  p_phone text default null
)
returns public.customers
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := public._uid();
  row public.customers;
  digits text;
begin
  select * into row from public.customers where id = p_customer_id and owner_id = uid;
  if not found then raise exception 'Customer not found'; end if;
  if p_phone is not null then
    digits := right(regexp_replace(p_phone, '\D', '', 'g'), 10);
    if length(digits) <> 10 then
      raise exception 'Phone must be 10 digits';
    end if;
  end if;
  update public.customers
  set
    name = coalesce(nullif(trim(p_name), ''), name),
    phone = coalesce(digits, phone)
  where id = p_customer_id
  returning * into row;
  return row;
end;
$$;

-- Member leaves a shared (visible) chit they belong to via phone match.
create or replace function public.exit_chit_as_member(p_chit_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := public._uid();
  ph text;
  removed int;
begin
  select phone into ph from public.profiles where id = uid;
  if ph is null or length(ph) < 10 then
    raise exception 'Add your phone on Profile before leaving a group';
  end if;
  if not exists (
    select 1 from public.chits c
    where c.id = p_chit_id and c.member_visible = true and c.status = 'running'
  ) then
    raise exception 'This group is not shared or is not running';
  end if;

  delete from public.chit_members cm
  using public.customers cu
  where cm.chit_id = p_chit_id
    and cm.customer_id = cu.id
    and right(regexp_replace(cu.phone, '\D', '', 'g'), 10)
      = right(regexp_replace(ph, '\D', '', 'g'), 10);

  get diagnostics removed = row_count;
  if removed = 0 then
    raise exception 'Could not match your phone to a member on this group';
  end if;
end;
$$;

grant execute on function public.cancel_chit(uuid, text[]) to authenticated;
grant execute on function public.deactivate_account(text[], text) to authenticated;
grant execute on function public.update_customer(uuid, text, text) to authenticated;
grant execute on function public.exit_chit_as_member(uuid) to authenticated;
