-- Platform is free: unlimited organised bhishi for every account.
create or replace function public._plan_cap(p public.plan_id)
returns int
language sql
immutable
as $$
  select 1000000;
$$;

comment on function public._plan_cap(public.plan_id) is
  'Always unlimited — Bhishi Circle is free with no active-group caps.';
