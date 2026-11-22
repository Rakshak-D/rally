create function public.save_checkin(
  p_challenge_id uuid,
  p_accomplishment text,
  p_next_plan text,
  p_notes text default null
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_timezone text;
  v_start_date date;
  v_end_date date;
  v_today date;
  v_checkin_id uuid;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'authentication required';
  end if;

  select challenge.timezone, challenge.start_date, challenge.end_date
  into v_timezone, v_start_date, v_end_date
  from public.challenges as challenge
  where challenge.id = p_challenge_id
    and public.is_challenge_member(challenge.id);

  if v_timezone is null then
    raise exception using errcode = '42501', message = 'workspace membership required';
  end if;

  v_today := (pg_catalog.now() at time zone v_timezone)::date;
  if v_today < v_start_date or v_today > v_end_date then
    raise exception using errcode = '22023', message = 'check-ins are only allowed during the challenge';
  end if;

  select checkin.id into v_checkin_id
  from public.checkins as checkin
  where checkin.challenge_id = p_challenge_id
    and checkin.user_id = v_user_id
    and checkin.checkin_date = v_today
  for update;

  if found then
    update public.checkins
    set accomplishment = p_accomplishment,
        next_plan = p_next_plan,
        notes = p_notes
    where id = v_checkin_id;

    return pg_catalog.jsonb_build_object('status', 'updated');
  end if;

  insert into public.checkins (challenge_id, accomplishment, next_plan, notes)
  values (p_challenge_id, p_accomplishment, p_next_plan, p_notes)
  returning id into v_checkin_id;

  return pg_catalog.jsonb_build_object('status', 'created');
end;
$$;

revoke all on function public.save_checkin(uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.save_checkin(uuid, text, text, text) to authenticated;
