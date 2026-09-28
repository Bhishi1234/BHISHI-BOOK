-- Store the hapta gap in days and use it for every new bhishi.

create or replace function public.create_chit(payload jsonb)
returns public.chits
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := public._uid();
  prof public.profiles;
  eff public.plan_id;
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
  v_principal_mode text;
  v_interest_upfront boolean;
  v_days int;
  v_freq public.frequency;
begin
  select * into prof from public.profiles where id = uid;
  if not found then raise exception 'Profile missing'; end if;

  v_mode := coalesce((payload->>'mode')::public.chit_mode, 'organise');
  v_members := coalesce(payload->'members', '[]'::jsonb);
  v_count := jsonb_array_length(v_members);
  v_slots := greatest(1, coalesce((payload->>'membersCount')::int, 1));
  v_principal_mode := coalesce(nullif(payload->>'loanPrincipalMode', ''), 'emi');
  if v_principal_mode not in ('emi', 'end') then
    v_principal_mode := 'emi';
  end if;
  v_interest_upfront := coalesce((payload->>'loanInterestUpfront')::boolean, true);

  v_days := nullif(payload->>'haptaIntervalDays', '')::int;
  if v_days is not null and (v_days < 1 or v_days > 3660) then
    raise exception 'Hapta interval must be between 1 and 3660 days';
  end if;
  if v_days is null then
    v_freq := coalesce((payload->>'frequency')::public.frequency, 'monthly');
    v_days := case v_freq
      when 'daily' then 1
      when 'weekly' then 7
      when 'biweekly' then 15
      when 'monthly' then 30
      else null
    end;
  else
    v_freq := case
      when v_days = 1 then 'daily'::public.frequency
      when v_days = 7 then 'weekly'::public.frequency
      when v_days = 15 then 'biweekly'::public.frequency
      when v_days = 30 then 'monthly'::public.frequency
      else 'custom'::public.frequency
    end;
  end if;

  if v_mode = 'organise' then
    if v_count < 1 then
      raise exception 'Add members to every slot before creating this chit';
    end if;
    if v_count <> v_slots then
      raise exception 'Fill all % slots (currently %)', v_slots, v_count;
    end if;
  end if;

  eff := public._effective_plan(prof);
  cap := public._plan_cap(eff);
  active := public._active_organised(uid);
  if v_mode = 'organise' and v_count > 0 and active >= cap then
    raise exception 'Your % plan allows % active organised chit(s)', eff, cap;
  end if;

  insert into public.chits (
    owner_id, name, title, type, frequency, hapta_interval_days, pot, instalment, members_count,
    commission_pct, commission_kind, commission_value, duration, start_date,
    mode, status, current_cycle, premium_amount, interest_rate, repayment_tenure,
    loan_principal_mode, loan_interest_upfront,
    adjustment_style, auction_style, remind_days, member_visible
  ) values (
    uid,
    coalesce(nullif(payload->>'name', ''), 'Untitled chit'),
    nullif(payload->>'title', ''),
    (payload->>'type')::public.chit_type,
    v_freq,
    v_days,
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
    v_principal_mode,
    v_interest_upfront,
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
    v_customer := (rec->>'customerId')::uuid;
    v_slot := coalesce((rec->>'slot')::int, 1);
    insert into public.chit_members (chit_id, customer_id, slot)
    values (c.id, v_customer, v_slot)
    on conflict do nothing;
  end loop;

  return public._owned_chit(c.id);
end;
$$;

grant execute on function public.create_chit(jsonb) to authenticated;

notify pgrst, 'reload schema';
