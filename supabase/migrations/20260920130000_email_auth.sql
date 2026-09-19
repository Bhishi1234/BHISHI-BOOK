-- Switch organiser login to email. Phone stays optional for later SMS auth.

alter table public.profiles add column if not exists email text;

alter table public.profiles alter column phone drop not null;

alter table public.profiles drop constraint if exists phone_10;
alter table public.profiles add constraint phone_10
  check (phone is null or phone ~ '^[0-9]{10}$');

create unique index if not exists profiles_email_unique
  on public.profiles (email)
  where email is not null;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  digits text;
  addr text;
begin
  digits := coalesce(
    new.raw_user_meta_data->>'phone10',
    right(regexp_replace(coalesce(new.phone, ''), '\D', '', 'g'), 10)
  );
  if digits is null or length(digits) <> 10 then
    digits := null;
  end if;
  addr := lower(nullif(coalesce(new.email, new.raw_user_meta_data->>'email'), ''));
  insert into public.profiles (id, name, email, phone)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data->>'name', ''), split_part(coalesce(addr, 'organiser'), '@', 1), 'Organiser'),
    addr,
    digits
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
