-- Which of the given phones already have a Bhishi Circle profile (signed up).
-- Used so organisers only see Invite-on-WhatsApp for people not yet on the app.

create or replace function public.phones_on_app(p_phones text[])
returns text[]
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  cleaned text[];
begin
  if p_phones is null or cardinality(p_phones) = 0 then
    return '{}';
  end if;

  select coalesce(array_agg(distinct d), '{}')
  into cleaned
  from (
    select nullif(right(regexp_replace(coalesce(x, ''), '\D', '', 'g'), 10), '') as d
    from unnest(p_phones) as x
  ) s
  where d is not null and length(d) = 10;

  if cleaned is null or cardinality(cleaned) = 0 then
    return '{}';
  end if;

  return coalesce(
    (
      select array_agg(distinct p.phone)
      from public.profiles p
      where p.phone = any (cleaned)
        and p.phone is not null
        and p.phone <> ''
        and p.deactivated_at is null
    ),
    '{}'
  );
end;
$$;

revoke all on function public.phones_on_app(text[]) from public;
grant execute on function public.phones_on_app(text[]) to authenticated;
