alter table public.tasks
  add column sort_order integer not null default 0,
  add constraint tasks_sort_order_nonnegative check (sort_order >= 0);

create index tasks_workspace_status_order_idx
  on public.tasks(workspace_id, status, sort_order, created_at, id)
  where deleted_at is null;

create function public.assign_task_order_on_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
begin
  if v_user_id is not null and (
    new.owner_id <> v_user_id
    or not public.is_workspace_member(new.workspace_id)
  ) then
    raise exception using errcode = '42501', message = 'workspace membership required';
  end if;

  perform 1
  from public.workspaces as workspace
  where workspace.id = new.workspace_id
  for update;

  select coalesce(pg_catalog.max(task.sort_order), -1) + 1
  into new.sort_order
  from public.tasks as task
  where task.workspace_id = new.workspace_id
    and task.status = new.status
    and task.deleted_at is null;

  return new;
end;
$$;

create trigger z_tasks_assign_shared_order
before insert on public.tasks
for each row execute function public.assign_task_order_on_insert();

create or replace function public.save_checkin(
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

    return pg_catalog.jsonb_build_object('status', 'updated', 'checkin_id', v_checkin_id);
  end if;

  insert into public.checkins (challenge_id, accomplishment, next_plan, notes)
  values (p_challenge_id, p_accomplishment, p_next_plan, p_notes)
  returning id into v_checkin_id;

  return pg_catalog.jsonb_build_object('status', 'created', 'checkin_id', v_checkin_id);
end;
$$;

create function public.undo_checkin(p_checkin_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_deleted_id uuid;
begin
  if v_user_id is null then
    return false;
  end if;

  delete from public.checkins as checkin
  using public.challenges as challenge
  where checkin.id = p_checkin_id
    and checkin.challenge_id = challenge.id
    and checkin.user_id = v_user_id
    and checkin.updated_at = checkin.created_at
    and checkin.created_at > pg_catalog.clock_timestamp() - interval '6 seconds'
    and checkin.checkin_date = (pg_catalog.clock_timestamp() at time zone challenge.timezone)::date
  returning checkin.id into v_deleted_id;

  return v_deleted_id is not null;
end;
$$;

create function public.reorder_task(p_task_id uuid, p_before_task_id uuid default null)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_workspace_id uuid;
  v_status public.task_status;
  v_before_order integer;
  v_last_order integer;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'authentication required';
  end if;

  select task.workspace_id, task.status
  into v_workspace_id, v_status
  from public.tasks as task
  where task.id = p_task_id
    and task.owner_id = v_user_id
    and task.deleted_at is null;

  if v_workspace_id is null or not public.is_workspace_member(v_workspace_id) then
    raise exception using errcode = '42501', message = 'task owner and workspace membership required';
  end if;

  perform 1
  from public.workspaces as workspace
  where workspace.id = v_workspace_id
  for update;

  select task.status into v_status
  from public.tasks as task
  where task.id = p_task_id
    and task.workspace_id = v_workspace_id
    and task.owner_id = v_user_id
    and task.deleted_at is null
  for update;

  if not found then
    raise exception using errcode = '42501', message = 'task owner required';
  end if;

  if p_before_task_id = p_task_id then
    return true;
  end if;

  if p_before_task_id is not null and not exists (
    select 1
    from public.tasks as anchor
    where anchor.id = p_before_task_id
      and anchor.workspace_id = v_workspace_id
      and anchor.status = v_status
      and anchor.deleted_at is null
  ) then
    raise exception using errcode = '22023', message = 'task position must belong to the same workspace and status';
  end if;

  with ranked_tasks as (
    select
      task.id,
      (pg_catalog.row_number() over (order by task.sort_order, task.created_at, task.id) - 1)::integer as sort_order
    from public.tasks as task
    where task.workspace_id = v_workspace_id
      and task.status = v_status
      and task.deleted_at is null
      and task.id <> p_task_id
  )
  update public.tasks as task
  set sort_order = ranked_tasks.sort_order
  from ranked_tasks
  where task.id = ranked_tasks.id;

  if p_before_task_id is null then
    select coalesce(pg_catalog.max(task.sort_order), -1) + 1
    into v_last_order
    from public.tasks as task
    where task.workspace_id = v_workspace_id
      and task.status = v_status
      and task.deleted_at is null
      and task.id <> p_task_id;

    update public.tasks as task
    set sort_order = v_last_order
    where task.id = p_task_id;
  else
    select anchor.sort_order into v_before_order
    from public.tasks as anchor
    where anchor.id = p_before_task_id;

    update public.tasks as task
    set sort_order = task.sort_order + 1
    where task.workspace_id = v_workspace_id
      and task.status = v_status
      and task.deleted_at is null
      and task.id <> p_task_id
      and task.sort_order >= v_before_order;

    update public.tasks as task
    set sort_order = v_before_order
    where task.id = p_task_id;
  end if;

  return true;
end;
$$;

revoke all on function public.save_checkin(uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.save_checkin(uuid, text, text, text) to authenticated;
revoke all on function public.undo_checkin(uuid) from public, anon, authenticated;
grant execute on function public.undo_checkin(uuid) to authenticated;
revoke all on function public.reorder_task(uuid, uuid) from public, anon, authenticated;
grant execute on function public.reorder_task(uuid, uuid) to authenticated;
revoke all on function public.assign_task_order_on_insert() from public, anon, authenticated;
