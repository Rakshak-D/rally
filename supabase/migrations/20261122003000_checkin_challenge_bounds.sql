create or replace function public.enforce_checkin_integrity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_timezone text;
  v_start_date date;
  v_end_date date;
  v_today date;
  v_user_id uuid := (select auth.uid());
begin
  if v_user_id is null then
    if session_user = 'postgres' and pg_catalog.current_setting('role', true) = 'none' then
      return new;
    end if;

    raise exception using errcode = '42501', message = 'authentication required';
  end if;

  select challenge.timezone, challenge.start_date, challenge.end_date
  into v_timezone, v_start_date, v_end_date
  from public.challenges as challenge
  where challenge.id = new.challenge_id
    and public.is_challenge_member(challenge.id);

  if v_timezone is null then
    raise exception using errcode = '42501', message = 'workspace membership required';
  end if;

  v_today := (pg_catalog.now() at time zone v_timezone)::date;

  if v_today < v_start_date or v_today > v_end_date then
    raise exception using errcode = '22023', message = 'check-ins are only allowed during the challenge';
  end if;

  if tg_op = 'INSERT' then
    new.user_id := v_user_id;
    new.checkin_date := v_today;
    new.created_at := pg_catalog.clock_timestamp();
    new.updated_at := new.created_at;
  else
    if old.user_id <> v_user_id
      or old.challenge_id <> new.challenge_id
      or old.user_id <> new.user_id
      or old.checkin_date <> v_today
      or old.checkin_date <> new.checkin_date then
      raise exception using errcode = '42501', message = 'only an owned check-in for today can be edited';
    end if;
    new.updated_at := pg_catalog.clock_timestamp();
    new.created_at := old.created_at;
  end if;

  return new;
end;
$$;
