-- Postgres infers CASE/literals as text; chits.status is the chit_status enum.

create or replace function public.create_chit(payload jsonb)
returns public.chits
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := public._uid();
  prof public.profiles;
  cap int;
  active int;
  c public.chits;
  v_mode public.chit_mode;
  v_members jsonb;
  rec jsonb;
  v_customer uuid;
  v_slot int;
begin
  select * into prof from public.profiles where id = uid;
  if not found then
    raise exception 'Unauthorized';
  end if;
  if prof.deactivated_at is not null then
    raise exception 'Account is deactivated';
  end if;

  v_mode := coalesce((payload->>'mode')::public.chit_mode, 'organise');
  v_members := coalesce(payload->'members', '[]'::jsonb);

  cap := public._plan_cap(prof.plan);
  active := public._active_organised(uid);
  if v_mode = 'organise' and jsonb_array_length(v_members) > 0 and active >= cap then
    raise exception 'Your % plan allows % active organised chit(s)', prof.plan, cap;
  end if;

  insert into public.chits (
    owner_id, name, title, type, frequency, pot, instalment, members_count,
    commission_pct, commission_kind, commission_value, duration, start_date,
    mode, status, current_cycle, premium_amount, interest_rate,
    adjustment_style, remind_days, member_visible
  ) values (
    uid,
    coalesce(nullif(payload->>'name', ''), 'Untitled chit'),
    nullif(payload->>'title', ''),
    (payload->>'type')::public.chit_type,
    coalesce((payload->>'frequency')::public.frequency, 'monthly'),
    coalesce((payload->>'pot')::numeric, 0),
    coalesce((payload->>'instalment')::numeric, 0),
    greatest(1, coalesce((payload->>'membersCount')::int, 1)),
    coalesce((payload->>'commissionPct')::numeric, 0),
    coalesce((payload->>'commissionKind')::public.commission_kind, 'percent'),
    coalesce((payload->>'commissionValue')::numeric, 0),
    greatest(1, coalesce((payload->>'duration')::int, 1)),
    coalesce((payload->>'startDate')::date, current_date),
    v_mode,
    'running'::public.chit_status,
    1,
    nullif(payload->>'premiumAmount', '')::numeric,
    nullif(payload->>'interestRate', '')::numeric,
    coalesce((payload->>'adjustmentStyle')::public.adjustment_style, 'every_month'),
    coalesce(
      (select array_agg(x::int) from jsonb_array_elements_text(coalesce(payload->'remindDays', '[]'::jsonb)) as x),
      '{}'
    ),
    coalesce((payload->>'memberVisible')::boolean, false)
  )
  returning * into c;

  for rec in select * from jsonb_array_elements(v_members)
  loop
    v_customer := coalesce((rec->>'customerId')::uuid, (rec->>'customer_id')::uuid);
    v_slot := coalesce((rec->>'slot')::int, 0);
    if v_customer is null then
      continue;
    end if;
    if not exists (
      select 1 from public.customers cu where cu.id = v_customer and cu.owner_id = uid
    ) then
      raise exception 'Customer is not in your directory';
    end if;
    if v_slot <= 0 then
      select coalesce(max(slot), 0) + 1 into v_slot from public.chit_members where chit_id = c.id;
    end if;
    insert into public.chit_members (chit_id, customer_id, slot)
    values (c.id, v_customer, v_slot);
  end loop;

  select * into c from public.chits where id = c.id;
  return c;
end;
$$;

create or replace function public.cancel_chit(p_chit_id uuid)
returns public.chits
language plpgsql
security definer
set search_path = public
as $$
declare
  c public.chits;
begin
  c := public._owned_chit(p_chit_id);
  update public.chits set status = 'cancelled'::public.chit_status where id = c.id;
  return public._owned_chit(p_chit_id);
end;
$$;

create or replace function public.close_cycle(p_chit_id uuid)
returns public.chits
language plpgsql
security definer
set search_path = public
as $$
declare
  c public.chits;
  next_cycle int;
begin
  c := public._owned_chit(p_chit_id);
  if c.status <> 'running' then
    raise exception 'Chit is not running';
  end if;
  if not exists (select 1 from public.chit_members where chit_id = p_chit_id) then
    raise exception 'Add members before closing a cycle';
  end if;
  if c.mode = 'organise' and not exists (
    select 1 from public.auctions where chit_id = p_chit_id and cycle = c.current_cycle
  ) then
    raise exception 'Settle this cycle''s winner before closing';
  end if;
  next_cycle := c.current_cycle + 1;
  update public.chits
  set
    current_cycle = next_cycle,
    status = case
      when next_cycle > duration then 'completed'::public.chit_status
      else 'running'::public.chit_status
    end
  where id = p_chit_id;
  return public._owned_chit(p_chit_id);
end;
$$;

grant execute on function public.create_chit(jsonb) to authenticated;
grant execute on function public.cancel_chit(uuid) to authenticated;
grant execute on function public.close_cycle(uuid) to authenticated;
