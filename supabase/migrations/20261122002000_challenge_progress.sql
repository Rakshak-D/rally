alter table public.challenges
  alter column created_by set default auth.uid();

create function public.get_challenge_progress(p_challenge_id uuid)
returns table (
  user_id uuid,
  display_name text,
  current_streak integer,
  longest_streak integer,
  completed_days integer,
  elapsed_days integer,
  last_checkin date,
  checked_in_today boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_workspace_id uuid;
  v_start_date date;
  v_end_date date;
  v_timezone text;
  v_today date;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'authentication required';
  end if;

  select challenge.workspace_id, challenge.start_date, challenge.end_date, challenge.timezone
  into v_workspace_id, v_start_date, v_end_date, v_timezone
  from public.challenges as challenge
  where challenge.id = p_challenge_id;

  if not found or not public.is_workspace_member(v_workspace_id) then
    raise exception using errcode = '42501', message = 'workspace membership required';
  end if;

  v_today := (pg_catalog.now() at time zone v_timezone)::date;

  return query
  with challenge_days as (
    select checkin.user_id, checkin.checkin_date
    from public.checkins as checkin
    where checkin.challenge_id = p_challenge_id
      and checkin.checkin_date between v_start_date and v_end_date
      and checkin.checkin_date <= v_today
  ), numbered_days as (
    select
      challenge_days.user_id,
      challenge_days.checkin_date,
      pg_catalog.row_number() over (
        partition by challenge_days.user_id order by challenge_days.checkin_date
      )::integer as sequence_number
    from challenge_days
  ), streak_groups as (
    select
      numbered_days.user_id,
      max(numbered_days.checkin_date) as end_date,
      count(*)::integer as day_count
    from numbered_days
    group by numbered_days.user_id, numbered_days.checkin_date - numbered_days.sequence_number
  ), streak_summary as (
    select
      streak_groups.user_id,
      max(streak_groups.day_count)::integer as longest_streak,
      coalesce(
        max(streak_groups.day_count) filter (
          where streak_groups.end_date between v_today - 1 and v_today
        ),
        0
      )::integer as current_streak
    from streak_groups
    group by streak_groups.user_id
  ), day_summary as (
    select
      challenge_days.user_id,
      count(*)::integer as completed_days,
      max(challenge_days.checkin_date) as last_checkin,
      coalesce(bool_or(challenge_days.checkin_date = v_today), false) as checked_in_today
    from challenge_days
    group by challenge_days.user_id
  )
  select
    member.user_id,
    profile.display_name,
    coalesce(streak_summary.current_streak, 0)::integer,
    coalesce(streak_summary.longest_streak, 0)::integer,
    coalesce(day_summary.completed_days, 0)::integer,
    greatest(0, least(v_end_date, v_today) - v_start_date + 1)::integer,
    day_summary.last_checkin,
    coalesce(day_summary.checked_in_today, false)
  from public.workspace_members as member
  join public.profiles as profile on profile.id = member.user_id
  left join streak_summary on streak_summary.user_id = member.user_id
  left join day_summary on day_summary.user_id = member.user_id
  where member.workspace_id = v_workspace_id
  order by profile.display_name;
end;
$$;

revoke all on function public.get_challenge_progress(uuid) from public, anon, authenticated;
grant execute on function public.get_challenge_progress(uuid) to authenticated;
