-- Loan: optional principal-at-end repayment (interest monthly, principal on last repay month).
-- Payload key: loanPrincipalMode = 'emi' | 'end'

alter table public.chits
  add column if not exists loan_principal_mode text not null default 'emi';

alter table public.chits
  drop constraint if exists chits_loan_principal_mode_check;

alter table public.chits
  add constraint chits_loan_principal_mode_check
  check (loan_principal_mode in ('emi', 'end'));

-- Remove mistaken 4-arg overload if a prior draft created it
drop function if exists public._cycle_due(uuid, uuid, int, int);

create or replace function public._raw_due_hand(p_chit uuid, p_member uuid, p_slot int, p_cycle int)
returns numeric
language plpgsql
stable
as $$
declare
  c public.chits;
  base numeric;
  prev public.auctions;
  this_a public.auctions;
  prized int;
  n_members int;
  share_of numeric;
  share numeric;
  principal numeric;
  start_c int;
  rate numeric;
  interest numeric;
  tenure int;
  month_index int;
  had_upfront boolean;
begin
  select * into c from public.chits where id = p_chit;
  if not found then return 0; end if;
  base := public._base_instalment(c);
  select greatest(1, count(*)) into n_members from public.chit_members where chit_id = p_chit;

  if c.type = 'auction' then
    if coalesce(c.auction_style, 'collect_first') = 'auction_first' then
      select * into this_a from public.auctions
      where chit_id = p_chit and cycle = p_cycle and method in ('auction', 'lucky_draw') limit 1;
      if found then
        share_of := this_a.bid;
        share := round(share_of / n_members::numeric);
        if share * n_members < share_of then share := share + 1; end if;
        return greatest(0, share);
      end if;
      return base;
    end if;
    select * into prev from public.auctions where chit_id = p_chit and cycle = p_cycle - 1;
    if found then
      return greatest(0, base - coalesce(prev.dividend, 0));
    end if;
    return base;
  end if;

  if c.type = 'loan' then
    principal := public._loan_principal(p_chit, p_member, p_slot);
    if principal <= 0 then return base; end if;
    start_c := public._first_loan_cycle(p_chit, p_member, p_slot);
    if start_c = 0 or p_cycle <= start_c then return base; end if;
    tenure := public._loan_effective_tenure(c, start_c);
    month_index := p_cycle - start_c;
    if month_index < 1 or month_index > tenure then return base; end if;
    rate := coalesce(c.interest_rate, 0);
    interest := round(principal * rate / 100);
    select exists (
      select 1 from public.auctions a
      where a.chit_id = p_chit and a.winner_id = p_member and a.method = 'fixed'
        and coalesce(a.discount, 0) > 0
        and coalesce(a.winner_slot, (
          select min(slot) from public.chit_members
          where chit_id = p_chit and customer_id = p_member
        )) = p_slot
    ) into had_upfront;
    if had_upfront and month_index = 1 then interest := 0; end if;
    if coalesce(c.loan_principal_mode, 'emi') = 'end' then
      share := case when month_index = tenure then principal else 0 end;
    elsif month_index = tenure then
      share := greatest(0, principal - ceil(principal / tenure) * (tenure - 1));
    else
      share := ceil(principal / tenure);
    end if;
    return base + interest + share;
  end if;

  if c.type = 'base_premium' or (c.type = 'fixed' and coalesce(c.premium_amount, 0) > 0) then
    select prized_cycle into prized
    from public.chit_members
    where chit_id = p_chit and customer_id = p_member and slot = p_slot;
    if prized is not null and p_cycle >= prized then
      return round(coalesce(c.premium_amount, base * 1.2));
    end if;
    return base;
  end if;

  return base;
end;
$$;

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
    owner_id, name, title, type, frequency, pot, instalment, members_count,
    commission_pct, commission_kind, commission_value, duration, start_date,
    mode, status, current_cycle, premium_amount, interest_rate, repayment_tenure,
    loan_principal_mode,
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
    v_principal_mode,
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
