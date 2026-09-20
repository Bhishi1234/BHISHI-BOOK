-- Reject empty organised chits; members must fill every slot at create.

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
  v_count int;
  v_slots int;
begin
  select * into prof from public.profiles where id = uid;
  if not found then raise exception 'Profile missing'; end if;

  v_mode := coalesce((payload->>'mode')::public.chit_mode, 'organise');
  v_members := coalesce(payload->'members', '[]'::jsonb);
  v_count := jsonb_array_length(v_members);
  v_slots := greatest(1, coalesce((payload->>'membersCount')::int, 1));

  if v_mode = 'organise' then
    if v_count < 1 then
      raise exception 'Add members to every slot before creating this chit';
    end if;
    if v_count <> v_slots then
      raise exception 'Fill all % slots (currently %)', v_slots, v_count;
    end if;
  end if;

  cap := public._plan_cap(prof.plan);
  active := public._active_organised(uid);
  if v_mode = 'organise' and v_count > 0 and active >= cap then
    raise exception 'Your % plan allows % active organised chit(s)', prof.plan, cap;
  end if;

  insert into public.chits (
    owner_id, name, title, type, frequency, pot, instalment, members_count,
    commission_pct, commission_kind, commission_value, duration, start_date,
    mode, status, current_cycle, premium_amount, interest_rate, repayment_tenure,
    adjustment_style, auction_style, remind_days, member_visible
  ) values (
    uid,
    coalesce(nullif(payload->>'name', ''), 'Untitled chit'),
    nullif(payload->>'title', ''),
    (payload->>'type')::public.chit_type,
    coalesce((payload->>'frequency')::public.frequency, 'monthly'),
    coalesce((payload->>'pot')::numeric, 0),
    coalesce((payload->>'instalment')::numeric, 0),
    v_slots,
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
    nullif(payload->>'repaymentTenure', '')::int,
    coalesce((payload->>'adjustmentStyle')::public.adjustment_style, 'every_month'),
    coalesce((payload->>'auctionStyle')::public.auction_style, 'collect_first'),
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
    if v_customer is null then continue; end if;
    if not exists (select 1 from public.customers cu where cu.id = v_customer and cu.owner_id = uid) then
      raise exception 'Customer is not in your directory';
    end if;
    if v_slot <= 0 then
      select coalesce(max(slot), 0) + 1 into v_slot from public.chit_members where chit_id = c.id;
    end if;
    insert into public.chit_members (chit_id, customer_id, slot)
    values (c.id, v_customer, v_slot);
  end loop;

  return c;
end;
$$;
