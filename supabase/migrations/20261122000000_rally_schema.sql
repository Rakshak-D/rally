create extension if not exists pgcrypto with schema extensions;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create type public.workspace_role as enum ('owner', 'member');
create type public.goal_status as enum ('active', 'completed');
create type public.task_status as enum ('todo', 'in_progress', 'completed');

create or replace function public.is_valid_timezone(p_timezone text)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select exists (
    select 1
    from pg_catalog.pg_timezone_names as timezone_name
    where timezone_name.name = p_timezone
  );
$$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete restrict,
  display_name text not null check (char_length(btrim(display_name)) between 1 and 80),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 80),
  timezone text not null check (public.is_valid_timezone(timezone)),
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.workspace_members (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete restrict,
  role public.workspace_role not null default 'member',
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create table public.workspace_invites (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  created_by uuid not null references public.profiles(id) on delete restrict,
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  max_uses integer not null default 1 check (max_uses between 1 and 25),
  use_count integer not null default 0 check (use_count between 0 and max_uses),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.challenges (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete restrict,
  title text not null check (char_length(btrim(title)) between 1 and 100),
  description text not null default '' check (char_length(description) <= 1200),
  start_date date not null,
  end_date date not null,
  timezone text not null check (public.is_valid_timezone(timezone)),
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, workspace_id),
  check (end_date >= start_date)
);

create table public.checkins (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.challenges(id) on delete restrict,
  user_id uuid not null default auth.uid() references public.profiles(id) on delete restrict,
  checkin_date date not null,
  accomplishment text not null check (char_length(btrim(accomplishment)) between 1 and 1200),
  next_plan text not null check (char_length(btrim(next_plan)) between 1 and 1200),
  notes text check (notes is null or char_length(notes) <= 1200),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (challenge_id, user_id, checkin_date)
);

create table public.goals (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete restrict,
  challenge_id uuid not null,
  owner_id uuid not null default auth.uid() references public.profiles(id) on delete restrict,
  title text not null check (char_length(btrim(title)) between 1 and 100),
  description text not null default '' check (char_length(description) <= 1200),
  status public.goal_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (challenge_id, workspace_id) references public.challenges(id, workspace_id) on delete restrict
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete restrict,
  challenge_id uuid not null,
  owner_id uuid not null default auth.uid() references public.profiles(id) on delete restrict,
  title text not null check (char_length(btrim(title)) between 1 and 120),
  description text not null default '' check (char_length(description) <= 1200),
  status public.task_status not null default 'todo',
  due_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (challenge_id, workspace_id) references public.challenges(id, workspace_id) on delete restrict
);

create index workspace_members_user_idx on public.workspace_members(user_id, workspace_id);
create index workspace_invites_workspace_expiry_idx on public.workspace_invites(workspace_id, expires_at desc);
create index challenges_workspace_dates_idx on public.challenges(workspace_id, start_date, end_date);
create index checkins_challenge_day_idx on public.checkins(challenge_id, checkin_date desc);
create index checkins_member_history_idx on public.checkins(challenge_id, user_id, checkin_date desc);
create index goals_workspace_status_idx on public.goals(workspace_id, status, updated_at desc);
create index tasks_workspace_status_due_idx on public.tasks(workspace_id, status, due_date, updated_at desc);

create view public.challenge_status
with (security_invoker = true)
as
select
  challenge.*,
  case
    when (now() at time zone challenge.timezone)::date < challenge.start_date then 'upcoming'
    when (now() at time zone challenge.timezone)::date > challenge.end_date then 'completed'
    else 'active'
  end as status,
  greatest(
    0,
    least(challenge.end_date, (now() at time zone challenge.timezone)::date) - challenge.start_date + 1
  )::integer as day_number,
  greatest(0, challenge.end_date - (now() at time zone challenge.timezone)::date)::integer as days_remaining
from public.challenges as challenge;

create table private.rate_limit_buckets (
  subject_id uuid not null,
  action text not null,
  window_started_at timestamptz not null,
  hit_count integer not null check (hit_count > 0),
  primary key (subject_id, action)
);
alter table private.rate_limit_buckets enable row level security;

create function private.consume_rate_limit(
  p_subject_id uuid,
  p_action text,
  p_limit integer,
  p_window interval
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_hits integer;
begin
  insert into private.rate_limit_buckets as bucket (subject_id, action, window_started_at, hit_count)
  values (p_subject_id, p_action, pg_catalog.now(), 1)
  on conflict (subject_id, action) do update
  set window_started_at = case
        when bucket.window_started_at + p_window <= pg_catalog.now() then pg_catalog.now()
        else bucket.window_started_at
      end,
      hit_count = case
        when bucket.window_started_at + p_window <= pg_catalog.now() then 1
        else bucket.hit_count + 1
      end
  returning hit_count into v_hits;

  return v_hits <= p_limit;
end;
$$;
revoke all on function private.consume_rate_limit(uuid, text, integer, interval) from public, anon, authenticated;

create function public.is_workspace_member(p_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.workspace_members as member
    where member.workspace_id = p_workspace_id
      and member.user_id = (select auth.uid())
  );
$$;

create function public.is_workspace_owner(p_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.workspace_members as member
    where member.workspace_id = p_workspace_id
      and member.user_id = (select auth.uid())
      and member.role = 'owner'
  );
$$;

create function public.is_challenge_member(p_challenge_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.challenges as challenge
    join public.workspace_members as member on member.workspace_id = challenge.workspace_id
    where challenge.id = p_challenge_id
      and member.user_id = (select auth.uid())
  );
$$;

create function public.is_challenge_owner(p_challenge_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.challenges as challenge
    join public.workspace_members as member on member.workspace_id = challenge.workspace_id
    where challenge.id = p_challenge_id
      and member.user_id = (select auth.uid())
      and member.role = 'owner'
  );
$$;

create function public.touch_updated_at()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.updated_at := pg_catalog.clock_timestamp();
  return new;
end;
$$;

create function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_display_name text;
begin
  v_display_name := nullif(pg_catalog.btrim(new.raw_user_meta_data ->> 'display_name'), '');

  insert into public.profiles (id, display_name)
  values (new.id, coalesce(v_display_name, 'New member'))
  on conflict (id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();

create function public.prevent_challenge_overlap()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform 1
  from public.workspaces as workspace
  where workspace.id = new.workspace_id
  for update;

  if not found then
    raise exception using errcode = '23503', message = 'workspace does not exist';
  end if;

  if exists (
    select 1
    from public.challenges as existing
    where existing.workspace_id = new.workspace_id
      and existing.id is distinct from new.id
      and pg_catalog.daterange(existing.start_date, existing.end_date, '[]')
        && pg_catalog.daterange(new.start_date, new.end_date, '[]')
  ) then
    raise exception using errcode = '23P01', message = 'challenge dates overlap another challenge';
  end if;

  return new;
end;
$$;

create function private.enforce_creation_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    if session_user = 'postgres' and pg_catalog.current_setting('role', true) = 'none' then
      return new;
    end if;

    raise exception using errcode = '42501', message = 'authentication required';
  end if;

  if not private.consume_rate_limit(
    (select auth.uid()),
    tg_argv[0],
    tg_argv[1]::integer,
    tg_argv[2]::interval
  ) then
    raise exception using errcode = 'P0001', message = 'rate limit exceeded';
  end if;

  return new;
end;
$$;
revoke all on function private.enforce_creation_rate_limit() from public, anon, authenticated;

create trigger a_challenges_creation_rate_limit
before insert on public.challenges
for each row execute function private.enforce_creation_rate_limit('challenge_create', '5', '1 hour');
create trigger b_challenges_prevent_overlap
before insert or update of workspace_id, start_date, end_date on public.challenges
for each row execute function public.prevent_challenge_overlap();

create trigger a_checkins_creation_rate_limit
before insert on public.checkins
for each row execute function private.enforce_creation_rate_limit('checkin_create', '20', '1 hour');

create function public.enforce_checkin_integrity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_timezone text;
  v_today date;
  v_user_id uuid := (select auth.uid());
begin
  if v_user_id is null then
    if session_user = 'postgres' and pg_catalog.current_setting('role', true) = 'none' then
      return new;
    end if;

    raise exception using errcode = '42501', message = 'authentication required';
  end if;

  select challenge.timezone
  into v_timezone
  from public.challenges as challenge
  where challenge.id = new.challenge_id
    and public.is_challenge_member(challenge.id);

  if v_timezone is null then
    raise exception using errcode = '42501', message = 'workspace membership required';
  end if;

  v_today := (pg_catalog.now() at time zone v_timezone)::date;

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

    new.user_id := old.user_id;
    new.challenge_id := old.challenge_id;
    new.checkin_date := old.checkin_date;
    new.created_at := old.created_at;
    new.updated_at := pg_catalog.clock_timestamp();
  end if;

  return new;
end;
$$;

create trigger b_checkins_integrity
before insert or update on public.checkins
for each row execute function public.enforce_checkin_integrity();

create trigger a_goals_creation_rate_limit
before insert on public.goals
for each row execute function private.enforce_creation_rate_limit('goal_create', '30', '1 hour');
create trigger a_tasks_creation_rate_limit
before insert on public.tasks
for each row execute function private.enforce_creation_rate_limit('task_create', '60', '1 hour');

create trigger profiles_touch_updated_at before update on public.profiles for each row execute function public.touch_updated_at();
create trigger workspaces_touch_updated_at before update on public.workspaces for each row execute function public.touch_updated_at();
create trigger invites_touch_updated_at before update on public.workspace_invites for each row execute function public.touch_updated_at();
create trigger challenges_touch_updated_at before update on public.challenges for each row execute function public.touch_updated_at();
create trigger goals_touch_updated_at before update on public.goals for each row execute function public.touch_updated_at();
create trigger tasks_touch_updated_at before update on public.tasks for each row execute function public.touch_updated_at();

create function public.create_workspace(p_name text, p_timezone text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_workspace_id uuid;
  v_name text := pg_catalog.btrim(p_name);
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'authentication required';
  end if;

  if v_name is null or pg_catalog.char_length(v_name) not between 1 and 80 then
    raise exception using errcode = '22023', message = 'workspace name must be 1 to 80 characters';
  end if;

  if not public.is_valid_timezone(p_timezone) then
    raise exception using errcode = '22023', message = 'timezone is invalid';
  end if;

  if not private.consume_rate_limit(v_user_id, 'workspace_create', 5, interval '1 hour') then
    raise exception using errcode = 'P0001', message = 'rate limit exceeded';
  end if;

  insert into public.workspaces (name, timezone, created_by)
  values (v_name, p_timezone, v_user_id)
  returning id into v_workspace_id;

  insert into public.workspace_members (workspace_id, user_id, role)
  values (v_workspace_id, v_user_id, 'owner');

  return v_workspace_id;
end;
$$;

create function public.create_invite(
  p_workspace_id uuid,
  p_token_hash text,
  p_expires_at timestamptz,
  p_max_uses integer default 1
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_invite_id uuid;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'authentication required';
  end if;

  if not public.is_workspace_owner(p_workspace_id) then
    raise exception using errcode = '42501', message = 'workspace owner role required';
  end if;

  if p_token_hash !~ '^[0-9a-f]{64}$'
    or p_expires_at <= pg_catalog.now()
    or p_expires_at > pg_catalog.now() + interval '30 days'
    or p_max_uses not between 1 and 25 then
    raise exception using errcode = '22023', message = 'invitation settings are invalid';
  end if;

  if not private.consume_rate_limit(v_user_id, 'invite_create', 10, interval '1 hour') then
    raise exception using errcode = 'P0001', message = 'rate limit exceeded';
  end if;

  insert into public.workspace_invites (workspace_id, created_by, token_hash, expires_at, max_uses)
  values (p_workspace_id, v_user_id, p_token_hash, p_expires_at, p_max_uses)
  returning id into v_invite_id;

  return v_invite_id;
end;
$$;

create function public.redeem_invite(p_token_hash text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_invite public.workspace_invites%rowtype;
  v_rows integer;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'authentication required';
  end if;

  if not private.consume_rate_limit(v_user_id, 'invite_redeem', 20, interval '1 hour') then
    return pg_catalog.jsonb_build_object('status', 'unavailable', 'workspace_id', null);
  end if;

  if p_token_hash !~ '^[0-9a-f]{64}$' then
    return pg_catalog.jsonb_build_object('status', 'unavailable', 'workspace_id', null);
  end if;

  select invite.* into v_invite
  from public.workspace_invites as invite
  where invite.token_hash = p_token_hash
  for update;

  if not found
    or v_invite.revoked_at is not null
    or v_invite.expires_at <= pg_catalog.now()
    or v_invite.use_count >= v_invite.max_uses then
    return pg_catalog.jsonb_build_object('status', 'unavailable', 'workspace_id', null);
  end if;

  insert into public.workspace_members (workspace_id, user_id, role)
  values (v_invite.workspace_id, v_user_id, 'member')
  on conflict (workspace_id, user_id) do nothing;

  get diagnostics v_rows = row_count;

  if v_rows = 0 then
    return pg_catalog.jsonb_build_object('status', 'already_member', 'workspace_id', v_invite.workspace_id);
  end if;

  update public.workspace_invites
  set use_count = use_count + 1
  where id = v_invite.id;

  return pg_catalog.jsonb_build_object('status', 'joined', 'workspace_id', v_invite.workspace_id);
end;
$$;

create function public.revoke_invite(p_invite_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_workspace_id uuid;
begin
  select invite.workspace_id into v_workspace_id
  from public.workspace_invites as invite
  where invite.id = p_invite_id;

  if v_workspace_id is null or not public.is_workspace_owner(v_workspace_id) then
    raise exception using errcode = '42501', message = 'workspace owner role required';
  end if;

  update public.workspace_invites
  set revoked_at = coalesce(revoked_at, pg_catalog.clock_timestamp())
  where id = p_invite_id;

  return true;
end;
$$;

create function public.leave_workspace(p_workspace_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_role public.workspace_role;
begin
  select member.role into v_role
  from public.workspace_members as member
  where member.workspace_id = p_workspace_id and member.user_id = v_user_id;

  if v_role is null then
    raise exception using errcode = '42501', message = 'workspace membership required';
  end if;
  if v_role = 'owner' then
    raise exception using errcode = '42501', message = 'owner must transfer ownership before leaving';
  end if;

  delete from public.workspace_members
  where workspace_id = p_workspace_id and user_id = v_user_id;
end;
$$;

create function public.remove_workspace_member(p_workspace_id uuid, p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_workspace_owner(p_workspace_id) then
    raise exception using errcode = '42501', message = 'workspace owner role required';
  end if;

  delete from public.workspace_members as member
  where member.workspace_id = p_workspace_id
    and member.user_id = p_user_id
    and member.role = 'member';

  if not found then
    raise exception using errcode = '42501', message = 'only a workspace member can be removed';
  end if;
end;
$$;

alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.workspace_invites enable row level security;
alter table public.challenges enable row level security;
alter table public.checkins enable row level security;
alter table public.goals enable row level security;
alter table public.tasks enable row level security;

create policy profiles_shared_select on public.profiles
for select to authenticated
using (
  id = (select auth.uid())
  or exists (
    select 1
    from public.workspace_members as viewer
    join public.workspace_members as subject on subject.workspace_id = viewer.workspace_id
    where viewer.user_id = (select auth.uid())
      and subject.user_id = profiles.id
  )
);
create policy profiles_update_self on public.profiles
for update to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

create policy workspaces_select_member on public.workspaces
for select to authenticated
using (public.is_workspace_member(id));
create policy workspaces_update_owner on public.workspaces
for update to authenticated
using (public.is_workspace_owner(id))
with check (public.is_workspace_owner(id));

create policy workspace_members_select_member on public.workspace_members
for select to authenticated
using (public.is_workspace_member(workspace_id));

create policy workspace_invites_select_owner on public.workspace_invites
for select to authenticated
using (public.is_workspace_owner(workspace_id));

create policy challenges_select_member on public.challenges
for select to authenticated
using (public.is_workspace_member(workspace_id));
create policy challenges_insert_owner on public.challenges
for insert to authenticated
with check (public.is_workspace_owner(workspace_id) and created_by = (select auth.uid()));
create policy challenges_update_owner on public.challenges
for update to authenticated
using (public.is_workspace_owner(workspace_id))
with check (public.is_workspace_owner(workspace_id));

create policy checkins_select_member on public.checkins
for select to authenticated
using (public.is_challenge_member(challenge_id));
create policy checkins_insert_self on public.checkins
for insert to authenticated
with check (user_id = (select auth.uid()) and public.is_challenge_member(challenge_id));
create policy checkins_update_self_today on public.checkins
for update to authenticated
using (user_id = (select auth.uid()) and public.is_challenge_member(challenge_id))
with check (user_id = (select auth.uid()) and public.is_challenge_member(challenge_id));

create policy goals_select_member on public.goals
for select to authenticated
using (public.is_workspace_member(workspace_id));
create policy goals_insert_owner on public.goals
for insert to authenticated
with check (owner_id = (select auth.uid()) and public.is_workspace_member(workspace_id));
create policy goals_update_owner on public.goals
for update to authenticated
using (owner_id = (select auth.uid()) and public.is_workspace_member(workspace_id))
with check (owner_id = (select auth.uid()) and public.is_workspace_member(workspace_id));
create policy goals_delete_owner on public.goals
for delete to authenticated
using (owner_id = (select auth.uid()) and public.is_workspace_member(workspace_id));

create policy tasks_select_member on public.tasks
for select to authenticated
using (public.is_workspace_member(workspace_id));
create policy tasks_insert_owner on public.tasks
for insert to authenticated
with check (owner_id = (select auth.uid()) and public.is_workspace_member(workspace_id));
create policy tasks_update_owner on public.tasks
for update to authenticated
using (owner_id = (select auth.uid()) and public.is_workspace_member(workspace_id))
with check (owner_id = (select auth.uid()) and public.is_workspace_member(workspace_id));
create policy tasks_delete_owner on public.tasks
for delete to authenticated
using (owner_id = (select auth.uid()) and public.is_workspace_member(workspace_id));

revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
grant usage on schema public to authenticated;

grant select on public.profiles, public.workspaces, public.workspace_members,
  public.challenges, public.challenge_status, public.checkins, public.goals, public.tasks
to authenticated;
grant select (id, workspace_id, created_by, expires_at, revoked_at, max_uses, use_count, created_at, updated_at)
on public.workspace_invites to authenticated;

grant update (display_name) on public.profiles to authenticated;
grant update (name, timezone) on public.workspaces to authenticated;
grant insert (workspace_id, title, description, start_date, end_date, timezone) on public.challenges to authenticated;
grant update (title, description, start_date, end_date, timezone) on public.challenges to authenticated;
grant insert (challenge_id, accomplishment, next_plan, notes) on public.checkins to authenticated;
grant update (accomplishment, next_plan, notes) on public.checkins to authenticated;
grant insert (workspace_id, challenge_id, title, description, status) on public.goals to authenticated;
grant update (title, description, status) on public.goals to authenticated;
grant delete on public.goals to authenticated;
grant insert (workspace_id, challenge_id, title, description, due_date, status) on public.tasks to authenticated;
grant update (title, description, status, due_date) on public.tasks to authenticated;
grant delete on public.tasks to authenticated;

revoke execute on all functions in schema public from public, anon, authenticated;
alter default privileges revoke execute on functions from public;
alter default privileges in schema public revoke execute on functions from anon, authenticated;
alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;

grant execute on function public.is_valid_timezone(text) to authenticated;
grant execute on function public.is_workspace_member(uuid) to authenticated;
grant execute on function public.is_workspace_owner(uuid) to authenticated;
grant execute on function public.is_challenge_member(uuid) to authenticated;
grant execute on function public.is_challenge_owner(uuid) to authenticated;
grant execute on function public.create_workspace(text, text) to authenticated;
grant execute on function public.create_invite(uuid, text, timestamptz, integer) to authenticated;
grant execute on function public.redeem_invite(text) to authenticated;
grant execute on function public.revoke_invite(uuid) to authenticated;
grant execute on function public.leave_workspace(uuid) to authenticated;
grant execute on function public.remove_workspace_member(uuid, uuid) to authenticated;
grant execute on function public.prevent_challenge_overlap() to authenticated;
grant execute on function public.enforce_checkin_integrity() to authenticated;
grant execute on function public.touch_updated_at() to authenticated;

