-- Allow organisers to rename a chit and tweak title from Settings / Edit chit.
drop function if exists public.update_chit_settings(uuid, boolean, int[]);

create or replace function public.update_chit_settings(
  p_chit_id uuid,
  p_member_visible boolean default null,
  p_remind_days int[] default null,
  p_name text default null,
  p_title text default null
)
returns public.chits
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public._owned_chit(p_chit_id);
  update public.chits
  set
    member_visible = coalesce(p_member_visible, member_visible),
    remind_days = coalesce(p_remind_days, remind_days),
    name = coalesce(nullif(trim(p_name), ''), name),
    title = case when p_title is null then title else nullif(trim(p_title), '') end
  where id = p_chit_id;
  return public._owned_chit(p_chit_id);
end;
$$;

grant execute on function public.update_chit_settings(uuid, boolean, int[], text, text) to authenticated;
