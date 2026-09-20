-- When the last month is closed, stay on duration (e.g. 5/5), not duration+1 (6/5).
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
  if c.mode = 'organise'
     and c.type <> 'loan'
     and not exists (
       select 1 from public.auctions where chit_id = p_chit_id and cycle = c.current_cycle
     ) then
    raise exception 'Settle this cycle''s winner before closing';
  end if;

  next_cycle := c.current_cycle + 1;
  if next_cycle > c.duration then
    update public.chits
    set
      current_cycle = c.duration,
      status = 'completed'::public.chit_status
    where id = p_chit_id;
  else
    update public.chits
    set
      current_cycle = next_cycle,
      status = 'running'::public.chit_status
    where id = p_chit_id;
  end if;

  return public._owned_chit(p_chit_id);
end;
$$;

-- Repair chits already stuck at 6/5 (or any current_cycle past duration).
update public.chits
set current_cycle = duration
where current_cycle > duration;
