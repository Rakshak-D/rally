create index challenges_created_by_idx on public.challenges(created_by);
create index checkins_user_id_idx on public.checkins(user_id);
create index goal_progress_history_changed_by_idx on public.goal_progress_history(changed_by);
create index goal_progress_history_workspace_time_idx
  on public.goal_progress_history(workspace_id, recorded_at desc, id desc);
create index goals_challenge_workspace_idx on public.goals(challenge_id, workspace_id);
create index goals_owner_id_idx on public.goals(owner_id);
create index tasks_challenge_workspace_idx on public.tasks(challenge_id, workspace_id);
create index tasks_owner_id_idx on public.tasks(owner_id);
create index workspace_invites_created_by_idx on public.workspace_invites(created_by);
create index workspaces_created_by_idx on public.workspaces(created_by);
