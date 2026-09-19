-- Unlimited organisers. Signup must not collide on a blank / placeholder phone.

alter table public.profiles drop constraint if exists profiles_phone_key;
alter table public.profiles drop constraint if exists profiles_email_key;
alter table public.profiles drop constraint if exists phone_10;

alter table public.profiles alter column phone drop not null;

update public.profiles
set phone = null
where phone is null or btrim(phone) = '' or phone = '0000000000';

alter table public.profiles add constraint phone_10
  check (phone is null or phone ~ '^[0-9]{10}$');

drop index if exists public.profiles_email_unique;
drop index if exists public.profiles_phone_unique;

create unique index if not exists profiles_email_unique
  on public.profiles (email)
  where email is not null and email <> '';

create unique index if not exists profiles_phone_unique
  on public.profiles (phone)
  where phone is not null and phone <> '';

grant usage on schema public to supabase_auth_admin;
grant insert, update on public.profiles to supabase_auth_admin;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  digits text;
  addr text;
  display text;
begin
  digits := coalesce(
    nullif(new.raw_user_meta_data->>'phone10', ''),
    nullif(right(regexp_replace(coalesce(new.phone, ''), '\D', '', 'g'), 10), '')
  );
  if digits is null or length(digits) <> 10 then
    digits := null;
  end if;

  addr := lower(nullif(trim(coalesce(new.email, new.raw_user_meta_data->>'email', '')), ''));
  display := coalesce(
    nullif(new.raw_user_meta_data->>'name', ''),
    nullif(split_part(coalesce(addr, ''), '@', 1), ''),
    'Organiser'
  );

  insert into public.profiles (id, name, email, phone)
  values (new.id, display, addr, digits)
  on conflict (id) do update
    set email = coalesce(public.profiles.email, excluded.email),
        name = case when public.profiles.name in ('Organiser', '') then excluded.name else public.profiles.name end;

  return new;
exception
  when unique_violation then
    insert into public.profiles (id, name, email, phone)
    values (new.id, display, addr, null)
    on conflict (id) do nothing;
    return new;
end;
$$;
