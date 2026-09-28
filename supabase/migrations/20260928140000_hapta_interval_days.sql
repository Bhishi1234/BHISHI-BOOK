-- Day gap between haptas. Presets are 1, 7, 15, and 30. Any other count is custom.
-- 'custom' is added here and used only in the next migration (enum values
-- cannot be used in the same transaction that adds them).

alter type public.frequency add value if not exists 'custom';

alter table public.chits
  add column if not exists hapta_interval_days integer;

do $$ begin
  alter table public.chits
    add constraint chits_hapta_interval_days_check
    check (hapta_interval_days is null or (hapta_interval_days >= 1 and hapta_interval_days <= 3660));
exception when duplicate_object then null;
end $$;
