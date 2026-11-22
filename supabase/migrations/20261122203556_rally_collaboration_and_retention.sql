alter table public.goals
  add column progress_current numeric(12, 2) not null default 0,
  add column progress_target numeric(12, 2),
  add column progress_unit text,
  add column deleted_at timestamptz,
  add constraint goals_progress_nonnegative check (progress_current >= 0),
  add constraint goals_progress_target_positive check (progress_target is null or progress_target > 0),
  add constraint goals_progress_not_over_target check (progress_target is null or progress_current <= progress_target),
  add constraint goals_progress_unit_length check (progress_unit is null or char_length(progress_unit) <= 24);

alter table public.tasks
  add column assignee_id uuid references public.profiles(id) on delete set null,
  add column deleted_at timestamptz;

create index goals_recently_deleted_idx on public.goals(workspace_id, deleted_at desc)
  where deleted_at is not null;
create index tasks_recently_deleted_idx on public.tasks(workspace_id, deleted_at desc)
  where deleted_at is not null;
create index tasks_assignee_open_idx on public.tasks(assignee_id, status)
  where assignee_id is not null and deleted_at is null;

create table public.goal_progress_history (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references public.goals(id) on delete restrict,
  workspace_id uuid not null references public.workspaces(id) on delete restrict,
  changed_by uuid references public.profiles(id) on delete set null,
  progress_current numeric(12, 2) not null,
  progress_target numeric(12, 2),
  progress_unit text,
  recorded_at timestamptz not null default clock_timestamp(),
  constraint goal_progress_history_current_nonnegative check (progress_current >= 0),
  constraint goal_progress_history_target_positive check (progress_target is null or progress_target > 0),
  constraint goal_progress_history_unit_length check (progress_unit is null or char_length(progress_unit) <= 24)
);

create index goal_progress_history_goal_time_idx
  on public.goal_progress_history(goal_id, recorded_at desc, id desc);

alter table public.goal_progress_history enable row level security;

create policy goal_progress_history_select_member on public.goal_progress_history
for select to authenticated
using (public.is_workspace_member(workspace_id));

grant select on public.goal_progress_history to authenticated;

create function private.record_goal_progress()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT'
    or new.progress_current is distinct from old.progress_current
    or new.progress_target is distinct from old.progress_target
    or new.progress_unit is distinct from old.progress_unit then
    insert into public.goal_progress_history (
      goal_id, workspace_id, changed_by, progress_current, progress_target, progress_unit
    ) values (
      new.id, new.workspace_id, (select auth.uid()),
      new.progress_current, new.progress_target, new.progress_unit
    );
  end if;
  return new;
end;
$$;

revoke all on function private.record_goal_progress() from public, anon, authenticated;

create trigger goals_record_progress
after insert or update of progress_current, progress_target, progress_unit on public.goals
for each row execute function private.record_goal_progress();

create function private.validate_task_assignee()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.assignee_id is not null and not exists (
    select 1
    from public.workspace_members as member
    where member.workspace_id = new.workspace_id
      and member.user_id = new.assignee_id
  ) then
    raise exception using errcode = '22023', message = 'task assignee must be a workspace member';
  end if;
  return new;
end;
$$;

revoke all on function private.validate_task_assignee() from public, anon, authenticated;

create trigger tasks_validate_assignee
before insert or update of workspace_id, assignee_id on public.tasks
for each row execute function private.validate_task_assignee();

drop policy goals_select_member on public.goals;
create policy goals_select_member on public.goals
for select to authenticated
using (
  public.is_workspace_member(workspace_id)
  and (deleted_at is null or owner_id = (select auth.uid()))
);

drop policy goals_delete_owner on public.goals;
drop policy tasks_select_member on public.tasks;
create policy tasks_select_member on public.tasks
for select to authenticated
using (
  public.is_workspace_member(workspace_id)
  and (deleted_at is null or owner_id = (select auth.uid()))
);
drop policy tasks_delete_owner on public.tasks;

revoke delete on public.goals, public.tasks from authenticated;
grant update (progress_current, progress_target, progress_unit, deleted_at) on public.goals to authenticated;
grant insert (progress_current, progress_target, progress_unit) on public.goals to authenticated;
grant update (assignee_id, deleted_at) on public.tasks to authenticated;
grant insert (assignee_id) on public.tasks to authenticated;

create function public.update_assigned_task_status(p_task_id uuid, p_status public.task_status)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'authentication required';
  end if;

  update public.tasks as task
  set status = p_status
  where task.id = p_task_id
    and task.assignee_id = v_user_id
    and task.deleted_at is null
    and public.is_workspace_member(task.workspace_id);

  if not found then
    raise exception using errcode = '42501', message = 'assigned task required';
  end if;
  return true;
end;
$$;

revoke all on function public.update_assigned_task_status(uuid, public.task_status) from public, anon, authenticated;
grant execute on function public.update_assigned_task_status(uuid, public.task_status) to authenticated;

create or replace function public.leave_workspace(p_workspace_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_role public.workspace_role;
begin
  perform 1 from public.workspaces as workspace
  where workspace.id = p_workspace_id
  for update;

  select member.role into v_role
  from public.workspace_members as member
  where member.workspace_id = p_workspace_id and member.user_id = v_user_id;

  if v_role is null then
    raise exception using errcode = '42501', message = 'workspace membership required';
  end if;
  if v_role = 'owner' then
    raise exception using errcode = '42501', message = 'owner must transfer ownership before leaving';
  end if;

  update public.tasks
  set assignee_id = null
  where workspace_id = p_workspace_id and assignee_id = v_user_id;

  delete from public.workspace_members
  where workspace_id = p_workspace_id and user_id = v_user_id;
end;
$$;

create or replace function public.remove_workspace_member(p_workspace_id uuid, p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform 1 from public.workspaces as workspace
  where workspace.id = p_workspace_id
  for update;

  if not public.is_workspace_owner(p_workspace_id) then
    raise exception using errcode = '42501', message = 'workspace owner role required';
  end if;

  if not exists (
    select 1 from public.workspace_members as member
    where member.workspace_id = p_workspace_id
      and member.user_id = p_user_id
      and member.role = 'member'
  ) then
    raise exception using errcode = '42501', message = 'only a workspace member can be removed';
  end if;

  update public.tasks
  set assignee_id = null
  where workspace_id = p_workspace_id and assignee_id = p_user_id;

  delete from public.workspace_members as member
  where member.workspace_id = p_workspace_id and member.user_id = p_user_id;
end;
$$;

create function public.transfer_workspace_ownership(p_workspace_id uuid, p_new_owner_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
begin
  perform 1 from public.workspaces as workspace
  where workspace.id = p_workspace_id
  for update;

  if v_user_id is null or not public.is_workspace_owner(p_workspace_id) then
    raise exception using errcode = '42501', message = 'workspace owner role required';
  end if;
  if p_new_owner_id = v_user_id then
    raise exception using errcode = '22023', message = 'new owner must be another workspace member';
  end if;
  if not exists (
    select 1 from public.workspace_members as member
    where member.workspace_id = p_workspace_id
      and member.user_id = p_new_owner_id
      and member.role = 'member'
  ) then
    raise exception using errcode = '42501', message = 'new owner must be a workspace member';
  end if;

  update public.workspace_members
  set role = 'member'
  where workspace_id = p_workspace_id and user_id = v_user_id and role = 'owner';
  if not found then
    raise exception using errcode = '42501', message = 'workspace owner role required';
  end if;

  update public.workspace_members
  set role = 'owner'
  where workspace_id = p_workspace_id and user_id = p_new_owner_id and role = 'member';
  if not found then
    raise exception using errcode = '42501', message = 'new owner must be a workspace member';
  end if;
end;
$$;

revoke all on function public.leave_workspace(uuid) from public, anon, authenticated;
revoke all on function public.remove_workspace_member(uuid, uuid) from public, anon, authenticated;
revoke all on function public.transfer_workspace_ownership(uuid, uuid) from public, anon, authenticated;
grant execute on function public.leave_workspace(uuid) to authenticated;
grant execute on function public.remove_workspace_member(uuid, uuid) to authenticated;
grant execute on function public.transfer_workspace_ownership(uuid, uuid) to authenticated;
