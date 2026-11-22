create function public.get_challenge_calendar(
  p_challenge_id uuid,
  p_days integer default 28,
  p_member_id uuid default null
)
returns table (local_date date, checkin_count integer)
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_workspace_id uuid;
  v_timezone text;
  v_start_date date;
  v_end_date date;
  v_today date;
  v_through_date date;
  v_from_date date;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'authentication required';
  end if;

  if p_days not between 7 and 90 then
    raise exception using errcode = '22023', message = 'calendar range must be 7 to 90 days';
  end if;

  select challenge.workspace_id, challenge.timezone, challenge.start_date, challenge.end_date
  into v_workspace_id, v_timezone, v_start_date, v_end_date
  from public.challenges as challenge
  where challenge.id = p_challenge_id;

  if not found or not public.is_workspace_member(v_workspace_id) then
    raise exception using errcode = '42501', message = 'workspace membership required';
  end if;

  if p_member_id is not null and not exists (
    select 1 from public.workspace_members as member
    where member.workspace_id = v_workspace_id and member.user_id = p_member_id
  ) then
    raise exception using errcode = '42501', message = 'workspace membership required';
  end if;

  v_today := (pg_catalog.now() at time zone v_timezone)::date;
  v_through_date := least(v_today, v_end_date);
  v_from_date := greatest(v_start_date, v_through_date - (p_days - 1));

  return query
  select
    series.day_timestamp::date,
    count(checkin.id)::integer
  from pg_catalog.generate_series(
    v_from_date::timestamp without time zone,
    v_through_date::timestamp without time zone,
    interval '1 day'
  ) as series(day_timestamp)
  left join public.checkins as checkin
    on checkin.challenge_id = p_challenge_id
    and checkin.checkin_date = series.day_timestamp::date
    and (p_member_id is null or checkin.user_id = p_member_id)
  group by series.day_timestamp
  order by series.day_timestamp;
end;
$$;

revoke all on function public.get_challenge_calendar(uuid, integer, uuid) from public, anon, authenticated;
grant execute on function public.get_challenge_calendar(uuid, integer, uuid) to authenticated;
