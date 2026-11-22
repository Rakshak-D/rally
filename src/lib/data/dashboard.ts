import "server-only";

import { addCalendarDays, localDateAt } from "@/lib/domain/calendar";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Enums, Tables } from "@/lib/supabase/database.types";

type WorkspaceRow = Tables<"workspaces">;
type MembershipRow = Pick<Tables<"workspace_members">, "workspace_id" | "role" | "created_at">;
type ChallengeRow = Tables<"challenge_status">;
type ProfileRow = Pick<Tables<"profiles">, "id" | "display_name">;
type TaskRow = Pick<Tables<"tasks">, "id" | "title" | "description" | "status" | "due_date" | "owner_id" | "assignee_id" | "deleted_at">;
type GoalRow = Pick<Tables<"goals">, "id" | "title" | "description" | "status" | "owner_id" | "progress_current" | "progress_target" | "progress_unit" | "deleted_at">;
type CheckinRow = Pick<Tables<"checkins">, "id" | "user_id" | "checkin_date" | "accomplishment" | "next_plan" | "notes" | "created_at">;

export type WorkspaceOption = WorkspaceRow & { role: Enums<"workspace_role"> };
export type TeamProgress = {
  userId: string;
  displayName: string;
  role: Enums<"workspace_role">;
  currentStreak: number;
  longestStreak: number;
  completedDays: number;
  elapsedDays: number;
  lastCheckin: string | null;
  checkedInToday: boolean;
};
export type RecentCheckin = CheckinRow & { displayName: string };

export type WorkspaceDashboard = {
  workspaces: WorkspaceOption[];
  selectedWorkspace: WorkspaceOption | null;
  workspaceMembers: ProfileRow[];
  memberRoles: Map<string, Enums<"workspace_role">>;
  challenge: ChallengeRow | null;
  today: string | null;
  todayCheckin: CheckinRow | null;
  calendarDates: string[];
  teamProgress: TeamProgress[];
  recentCheckins: RecentCheckin[];
  openTasks: TaskRow[];
  activeGoals: GoalRow[];
  profile: ProfileRow | null;
  invalidWorkspace: boolean;
};

export async function getWorkspaceOptions(userId: string): Promise<WorkspaceOption[]> {
  const supabase = await createSupabaseServerClient();
  const membershipResult = await supabase
    .from("workspace_members")
    .select("workspace_id, role, created_at")
    .eq("user_id", userId)
    .order("created_at");
  failOnError(membershipResult.error, "Workspace memberships");

  const memberships: MembershipRow[] = membershipResult.data ?? [];
  const workspaceIds = memberships.map(({ workspace_id }) => workspace_id);
  if (workspaceIds.length === 0) return [];

  const workspaceResult = await supabase
    .from("workspaces")
    .select("id, name, timezone, created_by, created_at, updated_at")
    .in("id", workspaceIds)
    .order("created_at");
  failOnError(workspaceResult.error, "Workspaces");

  const roleByWorkspace = new Map(memberships.map((membership) => [membership.workspace_id, membership.role]));
  return (workspaceResult.data ?? []).map((workspace) => ({
    ...workspace,
    role: roleByWorkspace.get(workspace.id) ?? "member",
  }));
}

function failOnError(error: { message: string } | null, section: string): void {
  if (error) throw new Error(`${section} could not be loaded.`);
}

export async function getWorkspaceDashboard(
  userId: string,
  requestedWorkspaceId?: string,
): Promise<WorkspaceDashboard> {
  const supabase = await createSupabaseServerClient();
  const [membershipResult, profileResult] = await Promise.all([
    supabase.from("workspace_members").select("workspace_id, role, created_at").eq("user_id", userId).order("created_at"),
    supabase.from("profiles").select("id, display_name").eq("id", userId).maybeSingle(),
  ]);
  failOnError(membershipResult.error, "Workspace memberships");
  failOnError(profileResult.error, "Profile");

  const memberships: MembershipRow[] = membershipResult.data ?? [];
  const workspaceIds = memberships.map(({ workspace_id }) => workspace_id);
  if (workspaceIds.length === 0) {
    return {
      workspaces: [],
      selectedWorkspace: null,
      workspaceMembers: [],
      memberRoles: new Map(),
      challenge: null,
      today: null,
      todayCheckin: null,
      calendarDates: [],
      teamProgress: [],
      recentCheckins: [],
      openTasks: [],
      activeGoals: [],
      profile: profileResult.data,
      invalidWorkspace: Boolean(requestedWorkspaceId),
    };
  }

  const workspaceResult = await supabase
    .from("workspaces")
    .select("id, name, timezone, created_by, created_at, updated_at")
    .in("id", workspaceIds)
    .order("created_at");
  failOnError(workspaceResult.error, "Workspaces");
  const roleByWorkspace = new Map(memberships.map((membership) => [membership.workspace_id, membership.role]));
  const workspaces = (workspaceResult.data ?? []).map((workspace) => ({
    ...workspace,
    role: roleByWorkspace.get(workspace.id) ?? "member",
  }));

  const selectedWorkspace = requestedWorkspaceId
    ? workspaces.find((workspace) => workspace.id === requestedWorkspaceId) ?? null
    : workspaces[0] ?? null;
  if (!selectedWorkspace) {
    return {
      workspaces,
      selectedWorkspace: null,
      workspaceMembers: [],
      memberRoles: new Map(),
      challenge: null,
      today: null,
      todayCheckin: null,
      calendarDates: [],
      teamProgress: [],
      recentCheckins: [],
      openTasks: [],
      activeGoals: [],
      profile: profileResult.data,
      invalidWorkspace: Boolean(requestedWorkspaceId),
    };
  }

  const [memberResult, challengeResult] = await Promise.all([
    supabase.from("workspace_members").select("user_id, role").eq("workspace_id", selectedWorkspace.id),
    supabase.from("challenge_status").select("*").eq("workspace_id", selectedWorkspace.id).order("start_date", { ascending: true }),
  ]);
  failOnError(memberResult.error, "Workspace members");
  failOnError(challengeResult.error, "Challenges");

  const memberIds = (memberResult.data ?? []).map(({ user_id }) => user_id);
  const profileRowsResult = memberIds.length
    ? await supabase.from("profiles").select("id, display_name").in("id", memberIds).order("display_name")
    : { data: [], error: null };
  failOnError(profileRowsResult.error, "Member profiles");

  const memberRoles = new Map((memberResult.data ?? []).map((membership) => [membership.user_id, membership.role]));
  const challenges = (challengeResult.data ?? []) as ChallengeRow[];
  const challenge =
    challenges.find((candidate) => candidate.status === "active") ??
    challenges.find((candidate) => candidate.status === "upcoming") ??
    [...challenges].reverse().find((candidate) => candidate.status === "completed") ??
    null;

  if (!challenge) {
    return {
      workspaces,
      selectedWorkspace,
      workspaceMembers: profileRowsResult.data ?? [],
      memberRoles,
      challenge: null,
      today: null,
      todayCheckin: null,
      calendarDates: [],
      teamProgress: [],
      recentCheckins: [],
      openTasks: [],
      activeGoals: [],
      profile: profileResult.data,
      invalidWorkspace: false,
    };
  }

  const today = localDateAt(new Date(), challenge.timezone);
  const windowStart = addCalendarDays(today, -34) ?? challenge.start_date;
  const [progressResult, checkinResult, recentResult, calendarResult, taskResult, goalResult] = await Promise.all([
    supabase.rpc("get_challenge_progress", { p_challenge_id: challenge.id }),
    supabase.from("checkins").select("id, user_id, checkin_date, accomplishment, next_plan, notes, created_at")
      .eq("challenge_id", challenge.id).eq("user_id", userId).eq("checkin_date", today).maybeSingle(),
    supabase.from("checkins").select("id, user_id, checkin_date, accomplishment, next_plan, notes, created_at")
      .eq("challenge_id", challenge.id).order("checkin_date", { ascending: false }).order("created_at", { ascending: false }).limit(8),
    supabase.from("checkins").select("checkin_date")
      .eq("challenge_id", challenge.id).eq("user_id", userId).gte("checkin_date", windowStart).lte("checkin_date", today).order("checkin_date", { ascending: true }).limit(35),
    supabase.from("tasks").select("id, title, description, status, due_date, owner_id, assignee_id, deleted_at")
      .eq("workspace_id", selectedWorkspace.id).eq("challenge_id", challenge.id).neq("status", "completed")
      .is("deleted_at", null)
      .order("due_date", { ascending: true, nullsFirst: false }).limit(8),
    supabase.from("goals").select("id, title, description, status, owner_id, progress_current, progress_target, progress_unit, deleted_at")
      .eq("workspace_id", selectedWorkspace.id).eq("challenge_id", challenge.id).eq("status", "active").is("deleted_at", null)
      .order("updated_at", { ascending: false }).limit(6),
  ]);
  failOnError(progressResult.error, "Team progress");
  failOnError(checkinResult.error, "Today's check-in");
  failOnError(recentResult.error, "Recent check-ins");
  failOnError(calendarResult.error, "Recent calendar");
  failOnError(taskResult.error, "Tasks");
  failOnError(goalResult.error, "Goals");

  const displayNames = new Map((profileRowsResult.data ?? []).map((profile) => [profile.id, profile.display_name]));
  const roles = memberRoles;
  const teamProgress = (progressResult.data ?? []).map((member) => ({
    userId: member.user_id,
    displayName: member.display_name,
    role: roles.get(member.user_id) ?? "member",
    currentStreak: member.current_streak,
    longestStreak: member.longest_streak,
    completedDays: member.completed_days,
    elapsedDays: member.elapsed_days,
    lastCheckin: member.last_checkin,
    checkedInToday: member.checked_in_today,
  }));
  const recentCheckins = ((recentResult.data ?? []) as CheckinRow[]).map((checkin) => ({
    ...checkin,
    displayName: displayNames.get(checkin.user_id) ?? "Rally member",
  }));

  return {
    workspaces,
    selectedWorkspace,
    workspaceMembers: profileRowsResult.data ?? [],
    memberRoles,
    challenge,
    today,
    todayCheckin: checkinResult.data,
    calendarDates: (calendarResult.data ?? []).map(({ checkin_date }) => checkin_date),
    teamProgress,
    recentCheckins,
    openTasks: (taskResult.data ?? []) as TaskRow[],
    activeGoals: (goalResult.data ?? []) as GoalRow[],
    profile: profileResult.data,
    invalidWorkspace: false,
  };
}
