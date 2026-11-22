create function private.prevent_started_challenge_date_changes()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_today date := (pg_catalog.now() at time zone old.timezone)::date;
begin
  if v_today >= old.start_date
    and (
      new.start_date is distinct from old.start_date
      or new.end_date is distinct from old.end_date
      or new.timezone is distinct from old.timezone
    ) then
    raise exception using errcode = '42501', message = 'challenge dates and timezone are fixed after the challenge starts';
  end if;

  return new;
end;
$$;
revoke all on function private.prevent_started_challenge_date_changes() from public, anon, authenticated;

create trigger a_challenges_dates_immutable
before update of start_date, end_date, timezone on public.challenges
for each row execute function private.prevent_started_challenge_date_changes();
