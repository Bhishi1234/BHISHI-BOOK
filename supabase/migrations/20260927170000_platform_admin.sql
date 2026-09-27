-- Owner admin sessions and landing-visit counts.
-- The password hash is inserted out of band. This file does not contain it.

create table if not exists public.platform_admins (
  phone text primary key,
  password_hash text not null,
  created_at timestamptz not null default now(),
  constraint platform_admin_phone check (phone ~ '^[0-9]{10}$')
);

create table if not exists public.admin_sessions (
  token text primary key,
  phone text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists public.admin_login_attempts (
  id bigint generated always as identity primary key,
  phone text not null,
  ok boolean not null,
  created_at timestamptz not null default now()
);

create index if not exists admin_login_attempts_phone_idx
  on public.admin_login_attempts (phone, created_at desc);

create table if not exists public.site_visits (
  id bigint generated always as identity primary key,
  path text not null,
  created_at timestamptz not null default now()
);

create index if not exists site_visits_created_idx on public.site_visits (created_at desc);

alter table public.platform_admins enable row level security;
alter table public.admin_sessions enable row level security;
alter table public.admin_login_attempts enable row level security;
alter table public.site_visits enable row level security;

create or replace function public.record_site_visit(p_path text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.site_visits (path)
  values (left(coalesce(nullif(trim(p_path), ''), '/'), 80));
end;
$$;

create or replace function public.admin_sign_in(p_phone text, p_password text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  digits text;
  stored text;
  token text;
  recent_fails int;
begin
  digits := right(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g'), 10);
  if length(digits) <> 10 or p_password is null or length(p_password) < 6 or length(p_password) > 200 then
    raise exception 'Wrong phone or password';
  end if;

  select count(*) into recent_fails
  from public.admin_login_attempts
  where phone = digits
    and ok = false
    and created_at > now() - interval '15 minutes';

  if recent_fails >= 8 then
    raise exception 'Too many attempts. Wait 15 minutes.';
  end if;

  select password_hash into stored
  from public.platform_admins
  where phone = digits;

  if stored is null or stored <> extensions.crypt(p_password, stored) then
    insert into public.admin_login_attempts (phone, ok) values (digits, false);
    raise exception 'Wrong phone or password';
  end if;

  insert into public.admin_login_attempts (phone, ok) values (digits, true);
  delete from public.admin_sessions where expires_at < now() or phone = digits;

  token := encode(extensions.gen_random_bytes(32), 'hex');
  insert into public.admin_sessions (token, phone, expires_at)
  values (token, digits, now() + interval '12 hours');
  return token;
end;
$$;

create or replace function public.admin_sign_out(p_token text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.admin_sessions where token = coalesce(p_token, '');
end;
$$;

create or replace function public._admin_ok(p_token text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_token is null or length(p_token) < 20 or not exists (
    select 1 from public.admin_sessions s
    where s.token = p_token and s.expires_at > now()
  ) then
    raise exception 'Unauthorized';
  end if;
end;
$$;

create or replace function public.admin_report(p_token text, p_section text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  result jsonb;
  today date := (timezone('Asia/Kolkata', now()))::date;
  month_start date := date_trunc('month', timezone('Asia/Kolkata', now()))::date;
begin
  perform public._admin_ok(p_token);

  if p_section = 'overview' then
    select jsonb_build_object(
      'organisers', (select count(*) from public.profiles),
      'organisersToday', (select count(*) from public.profiles where (timezone('Asia/Kolkata', created_at))::date = today),
      'organisersMonth', (select count(*) from public.profiles where (timezone('Asia/Kolkata', created_at))::date >= month_start),
      'deactivated', (select count(*) from public.profiles where deactivated_at is not null),
      'bhishis', (select count(*) from public.chits),
      'running', (select count(*) from public.chits where status = 'running'),
      'completed', (select count(*) from public.chits where status = 'completed'),
      'cancelled', (select count(*) from public.chits where status = 'cancelled'),
      'createdToday', (select count(*) from public.chits where (timezone('Asia/Kolkata', created_at))::date = today),
      'createdMonth', (select count(*) from public.chits where (timezone('Asia/Kolkata', created_at))::date >= month_start),
      'potRunning', (select coalesce(sum(pot), 0)::float8 from public.chits where status = 'running' and mode = 'organise'),
      'monthlyBook', (select coalesce(sum(instalment * members_count), 0)::float8 from public.chits where status = 'running' and mode = 'organise'),
      'hands', (select count(*) from public.chit_members),
      'people', (select count(distinct right(regexp_replace(phone, '\D', '', 'g'), 10)) from public.customers),
      'collectedAll', (select coalesce(sum(amount), 0)::float8 from public.payments),
      'collectedToday', (select coalesce(sum(amount), 0)::float8 from public.payments where (timezone('Asia/Kolkata', paid_at))::date = today),
      'collectedMonth', (select coalesce(sum(amount), 0)::float8 from public.payments where (timezone('Asia/Kolkata', paid_at))::date >= month_start),
      'awards', (select count(*) from public.auctions),
      'payoutAll', (select coalesce(sum(payout), 0)::float8 from public.auctions),
      'openTickets', (select count(*) from public.tickets where status = 'open'),
      'visitsToday', (select count(*) from public.site_visits where (timezone('Asia/Kolkata', created_at))::date = today),
      'visitsMonth', (select count(*) from public.site_visits where (timezone('Asia/Kolkata', created_at))::date >= month_start)
    ) into result;
    return result;
  end if;

  if p_section = 'bhishis' then
    select jsonb_build_object(
      'byStatus', coalesce((
        select jsonb_agg(jsonb_build_object('label', status::text, 'count', n) order by n desc)
        from (select status, count(*) n from public.chits group by status) s
      ), '[]'::jsonb),
      'byType', coalesce((
        select jsonb_agg(jsonb_build_object('label', type::text, 'count', n) order by n desc)
        from (select type, count(*) n from public.chits group by type) s
      ), '[]'::jsonb),
      'byMode', coalesce((
        select jsonb_agg(jsonb_build_object('label', mode::text, 'count', n) order by n desc)
        from (select mode, count(*) n from public.chits group by mode) s
      ), '[]'::jsonb),
      'byFrequency', coalesce((
        select jsonb_agg(jsonb_build_object('label', frequency::text, 'count', n) order by n desc)
        from (select frequency, count(*) n from public.chits group by frequency) s
      ), '[]'::jsonb),
      'rows', coalesce((
        select jsonb_agg(row_to_json(x)::jsonb order by x.created_at desc)
        from (
          select
            c.id,
            c.name,
            c.type::text,
            c.status::text,
            c.mode::text,
            c.frequency::text,
            c.pot::float8,
            c.instalment::float8,
            c.members_count,
            c.duration,
            c.current_cycle,
            c.start_date,
            c.member_visible,
            c.created_at,
            coalesce(pr.name, 'Organiser') as owner_name,
            coalesce(pr.phone, '') as owner_phone
          from public.chits c
          left join public.profiles pr on pr.id = c.owner_id
        ) x
      ), '[]'::jsonb)
    ) into result;
    return result;
  end if;

  if p_section = 'members' then
    select jsonb_build_object(
      'rows', coalesce((
        select jsonb_agg(row_to_json(z)::jsonb order by z.monthly_due desc, z.paid desc)
        from (
          select
            p.phone,
            p.name,
            p.groups,
            p.running_groups,
            p.monthly_due,
            p.still_to_pay,
            p.unprized_hands,
            p.unprized_pot,
            p.organiser_count,
            p.organisers,
            coalesce(paid.paid, 0)::float8 as paid,
            coalesce(won.wins, 0) as wins,
            coalesce(won.won_amount, 0)::float8 as won_amount
          from (
            select
              right(regexp_replace(cu.phone, '\D', '', 'g'), 10) as phone,
              max(cu.name) as name,
              count(distinct cm.chit_id) as groups,
              count(distinct cm.chit_id) filter (where c.status = 'running') as running_groups,
              coalesce(sum(c.instalment) filter (where c.status = 'running'), 0)::float8 as monthly_due,
              coalesce(sum(c.instalment * greatest(c.duration - c.current_cycle + 1, 0)) filter (where c.status = 'running'), 0)::float8 as still_to_pay,
              count(*) filter (where c.status = 'running' and cm.prized_cycle is null) as unprized_hands,
              coalesce(sum(c.pot) filter (where c.status = 'running' and cm.prized_cycle is null), 0)::float8 as unprized_pot,
              count(distinct cu.owner_id) as organiser_count,
              coalesce(string_agg(distinct pr.name, ', '), '') as organisers
            from public.customers cu
            left join public.profiles pr on pr.id = cu.owner_id
            left join public.chit_members cm on cm.customer_id = cu.id
            left join public.chits c on c.id = cm.chit_id
            group by 1
          ) p
          left join (
            select right(regexp_replace(cu.phone, '\D', '', 'g'), 10) as phone,
                   coalesce(sum(pay.amount), 0)::float8 as paid
            from public.payments pay
            join public.customers cu on cu.id = pay.member_id
            group by 1
          ) paid on paid.phone = p.phone
          left join (
            select right(regexp_replace(cu.phone, '\D', '', 'g'), 10) as phone,
                   count(*) as wins,
                   coalesce(sum(a.payout), 0)::float8 as won_amount
            from public.auctions a
            join public.customers cu on cu.id = a.winner_id
            group by 1
          ) won on won.phone = p.phone
        ) z
      ), '[]'::jsonb)
    ) into result;
    return result;
  end if;

  if p_section = 'website' then
    select jsonb_build_object(
      'signupsAll', (select count(*) from public.profiles),
      'signupsToday', (select count(*) from public.profiles where (timezone('Asia/Kolkata', created_at))::date = today),
      'signupsWeek', (select count(*) from public.profiles where created_at >= now() - interval '7 days'),
      'signupsMonth', (select count(*) from public.profiles where (timezone('Asia/Kolkata', created_at))::date >= month_start),
      'deactivated', (select count(*) from public.profiles where deactivated_at is not null),
      'activeAccounts', (select count(*) from public.profiles where deactivated_at is null),
      'visitsAll', (select count(*) from public.site_visits),
      'visitsToday', (select count(*) from public.site_visits where (timezone('Asia/Kolkata', created_at))::date = today),
      'visitsWeek', (select count(*) from public.site_visits where created_at >= now() - interval '7 days'),
      'visitsMonth', (select count(*) from public.site_visits where (timezone('Asia/Kolkata', created_at))::date >= month_start),
      'groupsToday', (select count(*) from public.chits where (timezone('Asia/Kolkata', created_at))::date = today),
      'groupsMonth', (select count(*) from public.chits where (timezone('Asia/Kolkata', created_at))::date >= month_start),
      'paymentsToday', (select count(*) from public.payments where (timezone('Asia/Kolkata', paid_at))::date = today),
      'paymentsMonth', (select count(*) from public.payments where (timezone('Asia/Kolkata', paid_at))::date >= month_start),
      'languages', coalesce((
        select jsonb_agg(jsonb_build_object('label', lang, 'count', n) order by n desc)
        from (
          select coalesce(nullif(language, ''), 'en') as lang, count(*) n
          from public.profiles group by 1
        ) l
      ), '[]'::jsonb),
      'signupsByDay', coalesce((
        select jsonb_agg(jsonb_build_object('day', day, 'count', n) order by day)
        from (
          select (timezone('Asia/Kolkata', created_at))::date as day, count(*) n
          from public.profiles
          where created_at >= now() - interval '30 days'
          group by 1
        ) d
      ), '[]'::jsonb),
      'visitsByDay', coalesce((
        select jsonb_agg(jsonb_build_object('day', day, 'count', n) order by day)
        from (
          select (timezone('Asia/Kolkata', created_at))::date as day, count(*) n
          from public.site_visits
          where created_at >= now() - interval '30 days'
          group by 1
        ) d
      ), '[]'::jsonb)
    ) into result;
    return result;
  end if;

  if p_section = 'collections' then
    select jsonb_build_object(
      'count', (select count(*) from public.payments),
      'total', (select coalesce(sum(amount), 0)::float8 from public.payments),
      'today', (select coalesce(sum(amount), 0)::float8 from public.payments where (timezone('Asia/Kolkata', paid_at))::date = today),
      'month', (select coalesce(sum(amount), 0)::float8 from public.payments where (timezone('Asia/Kolkata', paid_at))::date >= month_start),
      'byMode', coalesce((
        select jsonb_agg(jsonb_build_object('label', mode::text, 'amount', amount, 'count', n) order by amount desc)
        from (
          select mode, coalesce(sum(amount), 0)::float8 as amount, count(*) n
          from public.payments group by mode
        ) m
      ), '[]'::jsonb),
      'byKind', coalesce((
        select jsonb_agg(jsonb_build_object('label', kind::text, 'amount', amount, 'count', n) order by amount desc)
        from (
          select kind, coalesce(sum(amount), 0)::float8 as amount, count(*) n
          from public.payments group by kind
        ) k
      ), '[]'::jsonb),
      'recent', coalesce((
        select jsonb_agg(row_to_json(r)::jsonb order by r.paid_at desc)
        from (
          select
            pay.paid_at,
            pay.amount::float8,
            pay.kind::text,
            pay.mode::text,
            pay.cycle,
            c.name as chit_name,
            coalesce(cu.name, '') as member_name,
            coalesce(cu.phone, '') as member_phone
          from public.payments pay
          join public.chits c on c.id = pay.chit_id
          left join public.customers cu on cu.id = pay.member_id
          order by pay.paid_at desc
          limit 80
        ) r
      ), '[]'::jsonb)
    ) into result;
    return result;
  end if;

  if p_section = 'awards' then
    select jsonb_build_object(
      'count', (select count(*) from public.auctions),
      'payout', (select coalesce(sum(payout), 0)::float8 from public.auctions),
      'commission', (select coalesce(sum(commission), 0)::float8 from public.auctions),
      'dividend', (select coalesce(sum(dividend), 0)::float8 from public.auctions),
      'today', (select count(*) from public.auctions where (timezone('Asia/Kolkata', created_at))::date = today),
      'month', (select count(*) from public.auctions where (timezone('Asia/Kolkata', created_at))::date >= month_start),
      'byMethod', coalesce((
        select jsonb_agg(jsonb_build_object('label', method::text, 'count', n, 'payout', payout) order by n desc)
        from (
          select method, count(*) n, coalesce(sum(payout), 0)::float8 as payout
          from public.auctions group by method
        ) m
      ), '[]'::jsonb),
      'recent', coalesce((
        select jsonb_agg(row_to_json(r)::jsonb order by r.created_at desc)
        from (
          select
            a.created_at,
            a.cycle,
            a.method::text,
            a.payout::float8,
            a.bid::float8,
            a.commission::float8,
            a.dividend::float8,
            c.name as chit_name,
            coalesce(cu.name, '') as winner_name,
            coalesce(cu.phone, '') as winner_phone
          from public.auctions a
          join public.chits c on c.id = a.chit_id
          left join public.customers cu on cu.id = a.winner_id
          order by a.created_at desc
          limit 80
        ) r
      ), '[]'::jsonb)
    ) into result;
    return result;
  end if;

  if p_section = 'organisers' then
    select jsonb_build_object(
      'rows', coalesce((
        select jsonb_agg(row_to_json(x)::jsonb order by x.created_at desc)
        from (
          select
            pr.id,
            pr.name,
            coalesce(pr.phone, '') as phone,
            coalesce(pr.language, 'en') as language,
            pr.created_at,
            pr.deactivated_at,
            (select count(*) from public.chits c where c.owner_id = pr.id) as groups,
            (select count(*) from public.chits c where c.owner_id = pr.id and c.status = 'running') as running,
            (select count(*) from public.customers cu where cu.owner_id = pr.id) as people,
            (select coalesce(sum(pay.amount), 0)::float8 from public.payments pay join public.chits c on c.id = pay.chit_id where c.owner_id = pr.id) as collected
          from public.profiles pr
        ) x
      ), '[]'::jsonb)
    ) into result;
    return result;
  end if;

  if p_section = 'support' then
    select jsonb_build_object(
      'open', (select count(*) from public.tickets where status = 'open'),
      'closed', (select count(*) from public.tickets where status = 'closed'),
      'rows', coalesce((
        select jsonb_agg(row_to_json(x)::jsonb order by x.created_at desc)
        from (
          select
            t.id,
            t.subject,
            t.message,
            t.status::text,
            t.created_at,
            coalesce(pr.name, '') as owner_name,
            coalesce(pr.phone, '') as owner_phone
          from public.tickets t
          left join public.profiles pr on pr.id = t.owner_id
        ) x
      ), '[]'::jsonb)
    ) into result;
    return result;
  end if;

  raise exception 'Unknown section';
end;
$$;

revoke all on function public.record_site_visit(text) from public;
revoke all on function public.admin_sign_in(text, text) from public;
revoke all on function public.admin_sign_out(text) from public;
revoke all on function public._admin_ok(text) from public;
revoke all on function public.admin_report(text, text) from public;

grant execute on function public.record_site_visit(text) to anon, authenticated;
grant execute on function public.admin_sign_in(text, text) to anon, authenticated;
grant execute on function public.admin_sign_out(text) to anon, authenticated;
grant execute on function public.admin_report(text, text) to anon, authenticated;
