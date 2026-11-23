begin;

create extension if not exists pgtap with schema extensions;
select plan(105);

select has_table('public', 'profiles', 'profiles table exists');
select has_table('public', 'workspaces', 'workspaces table exists');
select has_table('public', 'workspace_members', 'workspace membership table exists');
select has_table('public', 'workspace_invites', 'workspace invitations table exists');
select has_table('public', 'challenges', 'challenges table exists');
select has_table('public', 'checkins', 'check-ins table exists');
select has_table('public', 'goals', 'goals table exists');
select has_table('public', 'tasks', 'tasks table exists');
select has_table('public', 'goal_progress_history', 'goal progress history table exists');
select has_column('public', 'profiles', 'avatar_path', 'profile avatar path is available');
select has_column('public', 'profiles', 'tagline', 'profile tagline is available');
select ok(exists (select 1 from pg_catalog.pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'Rally avatar owners can insert their own images'), 'avatar inserts are scoped to the user folder');
select ok(exists (select 1 from pg_catalog.pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'Rally avatar owners can read their own image records'), 'avatar upserts can inspect only the user folder');
select ok(exists (select 1 from pg_catalog.pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'Rally avatar owners can update their own images'), 'avatar updates are scoped to the user folder');
select ok(exists (select 1 from pg_catalog.pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'Rally avatar owners can delete their own images'), 'avatar deletes are scoped to the user folder');
select is((select file_size_limit::integer from storage.buckets where id = 'avatars'), 2097152, 'avatar bucket caps objects at 2 MB');
select ok((select allowed_mime_types = array['image/png', 'image/jpeg', 'image/webp']::text[] from storage.buckets where id = 'avatars'), 'avatar bucket accepts only supported image types');
select ok(has_column_privilege('authenticated', 'public.profiles', 'display_name', 'UPDATE'), 'authenticated users retain display name updates');
select ok(has_column_privilege('authenticated', 'public.profiles', 'avatar_path', 'UPDATE'), 'authenticated users can update the avatar path column');
select ok(has_column_privilege('authenticated', 'public.profiles', 'tagline', 'UPDATE'), 'authenticated users can update the tagline column');
select ok(pg_catalog.to_regprocedure('public.transfer_workspace_ownership(uuid,uuid)') is not null, 'ownership transfer function exists');
select ok(pg_catalog.to_regprocedure('public.update_assigned_task_status(uuid,public.task_status)') is not null, 'assigned task status function exists');
select ok(not has_function_privilege('anon', 'public.transfer_workspace_ownership(uuid,uuid)', 'EXECUTE'), 'anonymous users cannot call ownership transfer');
select has_view('public', 'challenge_status', 'challenge status view exists');
select ok(
  pg_catalog.to_regprocedure('public.get_challenge_progress(uuid)') is not null,
  'challenge progress summary function exists'
);
select ok(
  pg_catalog.to_regprocedure('public.save_checkin(uuid,text,text,text)') is not null,
  'atomic check-in save function exists'
);
select ok(
  pg_catalog.to_regprocedure('public.get_challenge_calendar(uuid,integer,uuid)') is not null,
  'bounded challenge calendar function exists'
);

select ok(
  (
    select count(*) = 9 and bool_and(relrowsecurity)
    from pg_catalog.pg_class as relation
    join pg_catalog.pg_namespace as schema on schema.oid = relation.relnamespace
    where schema.nspname = 'public'
      and relation.relname = any(array[
        'profiles', 'workspaces', 'workspace_members', 'workspace_invites',
        'challenges', 'checkins', 'goals', 'tasks', 'goal_progress_history'
      ])
      and relation.relkind = 'r'
  ),
  'RLS is enabled on every application table'
);

select ok(
  not has_column_privilege('authenticated', 'public.workspace_invites', 'token_hash', 'SELECT'),
  'invite token hashes are not readable through the Data API'
);
select ok(
  not has_table_privilege('authenticated', 'public.goal_progress_history', 'INSERT'),
  'members cannot forge goal progress history records'
);
select has_index('public', 'challenges', 'challenges_created_by_idx', 'challenge creator foreign key is indexed');
select has_index('public', 'checkins', 'checkins_user_id_idx', 'check-in user foreign key is indexed');
select has_index('public', 'goal_progress_history', 'goal_progress_history_changed_by_idx', 'progress editor foreign key is indexed');
select has_index('public', 'goal_progress_history', 'goal_progress_history_workspace_time_idx', 'progress workspace history is indexed');
select has_index('public', 'goals', 'goals_challenge_workspace_idx', 'goal challenge foreign key is indexed');
select has_index('public', 'goals', 'goals_owner_id_idx', 'goal owner foreign key is indexed');
select has_index('public', 'tasks', 'tasks_challenge_workspace_idx', 'task challenge foreign key is indexed');
select has_index('public', 'tasks', 'tasks_owner_id_idx', 'task owner foreign key is indexed');
select has_index('public', 'workspace_invites', 'workspace_invites_created_by_idx', 'invite creator foreign key is indexed');
select has_index('public', 'workspaces', 'workspaces_created_by_idx', 'workspace creator foreign key is indexed');
select ok(
  has_column_privilege('authenticated', 'public.goals', 'progress_current', 'INSERT'),
  'members can initialize current goal progress'
);
select ok(
  has_column_privilege('authenticated', 'public.goals', 'progress_target', 'INSERT')
    and has_column_privilege('authenticated', 'public.goals', 'progress_unit', 'INSERT'),
  'members can initialize goal targets and units'
);
select ok(
  has_column_privilege('authenticated', 'public.goals', 'progress_current', 'UPDATE')
    and has_column_privilege('authenticated', 'public.goals', 'progress_target', 'UPDATE')
    and has_column_privilege('authenticated', 'public.goals', 'progress_unit', 'UPDATE'),
  'members can update goal progress fields'
);

insert into auth.users (
  instance_id, id, aud, role, email, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at, is_anonymous
) values
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'authenticated', 'authenticated', 'owner@example.test', now(), '{"provider":"email","providers":["email"]}', '{"display_name":"Rally Owner"}', now(), now(), false),
  ('00000000-0000-0000-0000-000000000000', '22222222-2222-2222-2222-222222222222', 'authenticated', 'authenticated', 'member@example.test', now(), '{"provider":"email","providers":["email"]}', '{"display_name":"Rally Member"}', now(), now(), false),
  ('00000000-0000-0000-0000-000000000000', '33333333-3333-3333-3333-333333333333', 'authenticated', 'authenticated', 'outsider@example.test', now(), '{"provider":"email","providers":["email"]}', '{"display_name":"Outside User"}', now(), now(), false),
  ('00000000-0000-0000-0000-000000000000', '44444444-4444-4444-4444-444444444444', 'authenticated', 'authenticated', 'invitee@example.test', now(), '{"provider":"email","providers":["email"]}', '{"display_name":"Invitee User"}', now(), now(), false)
on conflict (id) do nothing;

insert into public.workspaces (id, name, timezone, created_by) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Common Room', 'UTC', '11111111-1111-1111-1111-111111111111'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Private Room', 'UTC', '33333333-3333-3333-3333-333333333333');

insert into public.workspace_members (workspace_id, user_id, role) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'owner'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222', 'member'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '33333333-3333-3333-3333-333333333333', 'owner');

insert into public.challenges (id, workspace_id, title, start_date, end_date, timezone, created_by) values
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Steady Practice', current_date - 2, current_date + 60, 'UTC', '11111111-1111-1111-1111-111111111111'),
  ('00000000-0000-0000-0000-000000000002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Finished practice', current_date - 20, current_date - 10, 'UTC', '11111111-1111-1111-1111-111111111111');

insert into public.tasks (id, workspace_id, challenge_id, owner_id, title, status) values
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'cccccccc-cccc-cccc-cccc-cccccccccccc', '11111111-1111-1111-1111-111111111111', 'Owner task', 'todo');

insert into public.checkins (id, challenge_id, user_id, checkin_date, accomplishment, next_plan) values
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'cccccccc-cccc-cccc-cccc-cccccccccccc', '22222222-2222-2222-2222-222222222222', current_date - 1, 'Yesterday update', 'Today plan');

insert into public.workspace_invites (
  id, workspace_id, created_by, token_hash, expires_at, max_uses, use_count
) values (
  'ffffffff-ffff-ffff-ffff-ffffffffffff',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  '11111111-1111-1111-1111-111111111111',
  repeat('e', 64),
  now() - interval '1 minute',
  1,
  0
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);

select is((select count(*)::integer from public.profiles), 2, 'owner sees only profiles in shared workspaces');
select is((select count(*)::integer from public.workspaces), 1, 'owner sees the workspace they belong to');
with created as (
  insert into public.challenges (workspace_id, title, start_date, end_date, timezone)
  values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Next practice', current_date + 61, current_date + 120, 'UTC')
  returning created_by
)
select is(
  (select created_by from created),
  '11111111-1111-1111-1111-111111111111'::uuid,
  'challenge creator is assigned from the authenticated identity'
);
select is(
  (select status from public.challenge_status where title = 'Steady Practice'),
  'active',
  'challenge status recognizes an active challenge'
);
select throws_ok(
  $$update public.challenges set end_date = current_date + 40 where id = 'cccccccc-cccc-cccc-cccc-cccccccccccc'$$,
  '42501', null, 'started challenge dates cannot be changed after progress begins'
);
select is(
  (select status from public.challenge_status where title = 'Finished practice'),
  'completed',
  'challenge status recognizes a completed challenge'
);
select is(
  (select status from public.challenge_status where title = 'Next practice'),
  'upcoming',
  'challenge status recognizes an upcoming challenge'
);
select throws_ok(
  $$insert into public.checkins (challenge_id, accomplishment, next_plan) values ((select id from public.challenges where title = 'Next practice' and workspace_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'), 'Too early', 'Begin later')$$,
  '22023', null, 'future challenges cannot receive check-ins'
);
select throws_ok(
  $$insert into public.checkins (challenge_id, accomplishment, next_plan) values ('00000000-0000-0000-0000-000000000002', 'Too late', 'Already finished')$$,
  '22023', null, 'completed challenges cannot receive new check-ins'
);
select is(
  (select current_streak from public.get_challenge_progress('cccccccc-cccc-cccc-cccc-cccccccccccc') where user_id = '22222222-2222-2222-2222-222222222222'),
  1,
  'progress summary counts a check-in from yesterday in the current streak'
);
select is(
  (select longest_streak from public.get_challenge_progress('cccccccc-cccc-cccc-cccc-cccccccccccc') where user_id = '22222222-2222-2222-2222-222222222222'),
  1,
  'progress summary reports the longest consecutive run'
);
select is(
  (select completed_days from public.get_challenge_progress('cccccccc-cccc-cccc-cccc-cccccccccccc') where user_id = '22222222-2222-2222-2222-222222222222'),
  1,
  'progress summary reports completed check-in days'
);

select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', true);
update public.workspaces set name = 'Compromised' where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
select is((select name from public.workspaces where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'), 'Common Room', 'members cannot update owner-only workspace settings');
select throws_ok(
  $$select public.create_invite('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', repeat('a', 64), now() + interval '1 day', 1)$$,
  '42501', null, 'members cannot create invitations'
);
select throws_ok(
  $$insert into public.workspace_members (workspace_id, user_id, role) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '33333333-3333-3333-3333-333333333333', 'owner')$$,
  '42501', null, 'members cannot create memberships directly'
);
select throws_ok(
  $$update public.workspace_members set role = 'owner' where workspace_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' and user_id = '22222222-2222-2222-2222-222222222222'$$,
  '42501', null, 'members cannot escalate their role'
);
select is((select count(*)::integer from public.challenges), 3, 'members can read shared challenges');
with inserted as (
  insert into public.goals (workspace_id, challenge_id, title, description, status, progress_current, progress_target, progress_unit)
  values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'Member goal', '', 'active', 1, 5, 'sessions')
  returning owner_id, status, progress_current, progress_target, progress_unit
)
select is((select owner_id from inserted), '22222222-2222-2222-2222-222222222222'::uuid, 'a member can create an owned goal');
select is((select progress_current from public.goals where title = 'Member goal'), 1::numeric, 'a member can initialize goal progress');
select is((select progress_target from public.goals where title = 'Member goal'), 5::numeric, 'a member can initialize goal target');
select is((select progress_unit from public.goals where title = 'Member goal'), 'sessions', 'a member can initialize goal unit');
update public.goals set progress_current = 2, progress_target = 5, progress_unit = 'sessions' where title = 'Member goal';
select is((select count(*)::integer from public.goal_progress_history where goal_id = (select id from public.goals where title = 'Member goal')), 2, 'goal progress creates an immutable initial and updated history record');
update public.goals set deleted_at = now() where title = 'Member goal';
select is((select count(*)::integer from public.goals where title = 'Member goal'), 1, 'a creator can still recover their soft-deleted goal');
with inserted as (
  insert into public.tasks (workspace_id, challenge_id, title, description, due_date, status)
  values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'Member task', '', null, 'todo')
  returning owner_id, status
)
select is((select owner_id from inserted), '22222222-2222-2222-2222-222222222222'::uuid, 'a member can create an owned task');
update public.tasks set assignee_id = '11111111-1111-1111-1111-111111111111' where title = 'Member task';
select throws_ok(
  $$update public.tasks set assignee_id = '33333333-3333-3333-3333-333333333333' where title = 'Member task'$$,
  '22023', null, 'a task cannot be assigned to a non-member'
);
select throws_ok(
  $$insert into public.tasks (workspace_id, challenge_id, owner_id, title) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'cccccccc-cccc-cccc-cccc-cccccccccccc', '11111111-1111-1111-1111-111111111111', 'Forged owner')$$,
  '42501', null, 'members cannot assign a task to another user'
);
update public.tasks set title = 'Stolen task' where id = 'dddddddd-dddd-dddd-dddd-dddddddddddd';
select is((select title from public.tasks where id = 'dddddddd-dddd-dddd-dddd-dddddddddddd'), 'Owner task', 'members cannot modify another member task');

with inserted as (
  insert into public.checkins (challenge_id, accomplishment, next_plan)
  values ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'A real effort', 'Continue tomorrow')
  returning checkin_date
)
select is(
  (select checkin_date::text from inserted),
  (now() at time zone 'UTC')::date::text,
  'the database assigns the current challenge-local day'
);

select throws_ok(
  $$insert into public.checkins (challenge_id, accomplishment, next_plan) values ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Duplicate', 'Retry')$$,
  '23505', null, 'a second check-in for the same challenge day is rejected'
);
select throws_ok(
  $$insert into public.checkins (challenge_id, user_id, checkin_date, accomplishment) values ('cccccccc-cccc-cccc-cccc-cccccccccccc', '11111111-1111-1111-1111-111111111111', current_date, 'Forged')$$,
  '42501', null, 'clients cannot supply a check-in identity or date'
);

select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);
select is((select count(*)::integer from public.goals where title = 'Member goal'), 0, 'soft-deleted goals stay private to their creator');
select public.update_assigned_task_status((select id from public.tasks where title = 'Member task'), 'in_progress');
select is((select status::text from public.tasks where title = 'Member task'), 'in_progress', 'a task assignee can update only its status');
update public.tasks set status = 'completed' where title = 'Member task';
select is((select status::text from public.tasks where title = 'Member task'), 'in_progress', 'assignees must use the status-only operation');
update public.tasks set title = 'Assignee edited title' where title = 'Member task';
select is((select title from public.tasks where assignee_id = '11111111-1111-1111-1111-111111111111'), 'Member task', 'an assignee cannot edit task details');
insert into public.tasks (workspace_id, challenge_id, assignee_id, title)
values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'cccccccc-cccc-cccc-cccc-cccccccccccc', '22222222-2222-2222-2222-222222222222', 'Assignment cleanup task');
update public.checkins set accomplishment = 'Forged by owner' where id = (
  select id from public.checkins where user_id = '22222222-2222-2222-2222-222222222222'
    and checkin_date = (now() at time zone 'UTC')::date
);
select is(
  (select accomplishment from public.checkins where user_id = '22222222-2222-2222-2222-222222222222' and checkin_date = (now() at time zone 'UTC')::date),
  'A real effort',
  'owners cannot modify another member check-in'
);

select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', true);
select throws_ok(
  $$update public.profiles set tagline = repeat('x', 81) where id = '22222222-2222-2222-2222-222222222222'$$,
  '23514', null, 'profile taglines are limited to 80 characters'
);
update public.profiles set avatar_path = '22222222-2222-2222-2222-222222222222/avatar.webp'
where id = '11111111-1111-1111-1111-111111111111';
select is((select avatar_path from public.profiles where id = '11111111-1111-1111-1111-111111111111'), null::text, 'members cannot change another users avatar path');
select throws_ok(
  $$insert into storage.objects (bucket_id, name, owner_id) values ('avatars', '11111111-1111-1111-1111-111111111111/avatar.webp', '22222222-2222-2222-2222-222222222222')$$,
  '42501', null, 'members cannot write another users avatar object'
);
insert into storage.objects (bucket_id, name, owner_id)
values ('avatars', '22222222-2222-2222-2222-222222222222/avatar.webp', '22222222-2222-2222-2222-222222222222');
select is((select count(*)::integer from storage.objects where bucket_id = 'avatars' and name = '22222222-2222-2222-2222-222222222222/avatar.webp'), 1, 'members can create an avatar object in their own folder');
select throws_ok(
  $$update public.checkins set accomplishment = 'Backdated edit' where id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'$$,
  '42501', null, 'historical check-ins cannot be edited'
);
select is(
  (select checkin_count from public.get_challenge_calendar('cccccccc-cccc-cccc-cccc-cccccccccccc', 28, '22222222-2222-2222-2222-222222222222') where local_date = current_date - 1),
  1,
  'calendar aggregation returns a selected member day without an unbounded read'
);
select is(
  public.redeem_invite(repeat('e', 64)) ->> 'status',
  'unavailable',
  'expired invites return a generic unavailable result'
);
select is(
  public.save_checkin('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Updated through the safe action', 'Continue tomorrow', null) ->> 'status',
  'updated',
  'the atomic check-in action updates only the member current-day entry'
);

select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);
select throws_ok(
  $$insert into public.challenges (workspace_id, title, start_date, end_date, timezone) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Overlapping challenge', current_date, current_date + 1, 'UTC')$$,
  '23P01', null, 'overlapping challenge windows are rejected'
);
select throws_ok(
  $$delete from public.challenges where id = 'cccccccc-cccc-cccc-cccc-cccccccccccc'$$,
  '42501', null, 'historical challenges cannot be deleted'
);

select ok(
  public.create_invite('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', repeat('b', 64), now() + interval '1 day', 1) is not null,
  'owner can create a one-use invitation'
);
select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', true);
select is(public.redeem_invite(repeat('b', 64)) ->> 'status', 'already_member', 'an existing member can safely open an invitation without consuming it');
select set_config('request.jwt.claim.sub', '44444444-4444-4444-4444-444444444444', true);
select is(public.redeem_invite(repeat('b', 64)) ->> 'status', 'joined', 'a new user can redeem an invitation');
select is(public.redeem_invite(repeat('b', 64)) ->> 'status', 'unavailable', 'a one-use invitation cannot be replayed');
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);
select is(
  public.revoke_invite(public.create_invite('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', repeat('c', 64), now() + interval '1 day', 1)),
  true,
  'owner can revoke an invitation'
);
select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', true);
select is(public.redeem_invite(repeat('c', 64)) ->> 'status', 'unavailable', 'revoked invitations return a generic unavailable result');

select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);
select public.remove_workspace_member('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222');
select is((select assignee_id from public.tasks where title = 'Assignment cleanup task'), null::uuid, 'removing a member clears their task assignments');
select public.transfer_workspace_ownership('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '44444444-4444-4444-4444-444444444444');
select is((select role::text from public.workspace_members where workspace_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' and user_id = '11111111-1111-1111-1111-111111111111'), 'member', 'the previous owner becomes a member after handoff');
select is((select role::text from public.workspace_members where workspace_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' and user_id = '44444444-4444-4444-4444-444444444444'), 'owner', 'ownership is transferred to the selected member');
select throws_ok(
  $$select public.create_invite('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', repeat('d', 64), now() + interval '1 day', 1)$$,
  '42501', null, 'the former owner cannot create invitations after transfer'
);
select set_config('request.jwt.claim.sub', '44444444-4444-4444-4444-444444444444', true);
update public.workspaces set name = 'Owned by invitee' where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
select is((select name from public.workspaces where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'), 'Owned by invitee', 'the new owner can manage the workspace');

select set_config('request.jwt.claim.sub', '33333333-3333-3333-3333-333333333333', true);
select throws_ok(
  $$select * from public.get_challenge_calendar('cccccccc-cccc-cccc-cccc-cccccccccccc', 28, null)$$,
  '42501', null, 'outsiders cannot query the challenge calendar'
);
select throws_ok(
  $$select * from public.get_challenge_progress('cccccccc-cccc-cccc-cccc-cccccccccccc')$$,
  '42501', null, 'outsiders cannot query challenge progress'
);
select is((select count(*)::integer from public.workspaces), 1, 'outsider sees only their own workspace');
select is((select count(*)::integer from public.profiles), 1, 'outsiders cannot read profiles outside shared workspaces');
select is((select count(*)::integer from public.checkins), 0, 'outsider cannot read another workspace check-ins');
select throws_ok(
  $$insert into public.tasks (workspace_id, challenge_id, title) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'IDOR task')$$,
  '42501', null, 'outsider cannot create data in another workspace'
);

reset role;
select * from finish();
rollback;
