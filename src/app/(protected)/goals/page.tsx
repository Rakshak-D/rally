import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { MemberAvatar } from "@/components/dashboard/member-avatar";
import { TiltCard } from "@/components/ui/tilt-card";
import { CreateGoalForm, DeletedGoalList, EditGoalForm } from "@/components/product/goal-task-forms";
import { RecordDrawer } from "@/components/product/record-drawer";
import { RecordEmptyState } from "@/components/product/record-empty-state";
import { RecordStatusFilters } from "@/components/product/record-status-filters";
import { GoalProgressView } from "@/components/product/goal-progress-view";
import { requireUser } from "@/lib/auth/current-user";
import { getWorkspaceDashboard } from "@/lib/data/dashboard";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/supabase/database.types";

export const metadata: Metadata = { title: "Goals" };

type Goal = Tables<"goals">;
const goalStatuses = ["active", "completed"] as const satisfies readonly Goal["status"][];

export default async function GoalsPage({ searchParams }: { searchParams: Promise<{ workspace?: string; status?: string }> }) {
  const [user, params, supabase] = await Promise.all([requireUser(), searchParams, createSupabaseServerClient()]);
  const data = await getWorkspaceDashboard(user.id, params.workspace);
  if (data.invalidWorkspace) notFound();
  const workspace = data.selectedWorkspace;

  if (!workspace) {
    return <section className="empty-state"><h1>Goals</h1><p>Create or join a workspace from Today to begin.</p></section>;
  }

  const selectedStatus: Goal["status"] | "all" = goalStatuses.includes(params.status as Goal["status"])
    ? params.status as Goal["status"]
    : "all";
  let goalsQuery = supabase.from("goals").select("*").eq("workspace_id", workspace.id).is("deleted_at", null)
    .order("updated_at", { ascending: false }).limit(100);
  if (selectedStatus !== "all") goalsQuery = goalsQuery.eq("status", selectedStatus);

  const goalCountQuery = Promise.all(goalStatuses.map((status) => supabase.from("goals")
    .select("id", { count: "exact", head: true }).eq("workspace_id", workspace.id).is("deleted_at", null).eq("status", status)));
  const [goalResult, deletedResult, challengeResult, goalCountResults] = await Promise.all([
    goalsQuery,
    supabase.from("goals").select("*").eq("workspace_id", workspace.id).not("deleted_at", "is", null)
      .order("deleted_at", { ascending: false }).limit(50),
    supabase.from("challenge_status").select("id, title, status").eq("workspace_id", workspace.id)
      .order("start_date", { ascending: false }),
    goalCountQuery,
  ]);
  if (goalResult.error || deletedResult.error || challengeResult.error || goalCountResults.some(({ error }) => error)) {
    throw new Error("Goals could not be loaded.");
  }
  const goals = goalResult.data ?? [];
  const deletedGoals = deletedResult.data ?? [];
  const challengeRows = challengeResult.data ?? [];

  const goalIds = goals.map((goal) => goal.id);
  const historyResult = goalIds.length
    ? await supabase.from("goal_progress_history").select("*").in("goal_id", goalIds).order("recorded_at", { ascending: false }).limit(300)
    : { data: [], error: null };
  if (historyResult.error) throw new Error("Goal progress history could not be loaded.");

  const writableChallenge = challengeRows.find((challenge) => challenge.status === "active") ?? challengeRows.find((challenge) => challenge.status === "upcoming");
  const members = new Map(data.workspaceMembers.map((member) => [member.id, member]));
  const historyByGoal = new Map<string, Tables<"goal_progress_history">[]>();
  for (const entry of historyResult.data ?? []) {
    const history = historyByGoal.get(entry.goal_id) ?? [];
    history.push(entry);
    historyByGoal.set(entry.goal_id, history);
  }
  const counts = new Map(goalStatuses.map((status, index) => [status, goalCountResults[index].count ?? 0]));
  const totalGoals = goalStatuses.reduce((sum, status) => sum + (counts.get(status) ?? 0), 0);
  const newGoalDrawer = writableChallenge ? (
    <RecordDrawer actionLabel="New goal" title="Set a goal" description="Choose an aim you can return to during this challenge.">
      <CreateGoalForm workspaceId={workspace.id} challengeId={writableChallenge.id} />
    </RecordDrawer>
  ) : null;
  const emptyTitle = selectedStatus === "completed" ? "No completed goals yet" : selectedStatus === "active" ? "No active goals here" : "Give your group a shared aim";

  return (
    <div className="page-wrap records-page">
      <header className="page-heading page-heading--spread">
        <div><h1>Goals</h1><p>Keep the bigger intention clear, then return to it together.</p></div>
        {goals.length > 0 && newGoalDrawer}
      </header>

      <RecordStatusFilters
        route="/goals"
        selected={selectedStatus}
        workspaceId={workspace.id}
        statuses={[
          { value: "all", label: "All goals", count: totalGoals },
          { value: "active", label: "Active", count: counts.get("active") ?? 0 },
          { value: "completed", label: "Completed", count: counts.get("completed") ?? 0 },
        ]}
      />

      {!writableChallenge && <p className="record-context-note">Goals can be added when a challenge is active or upcoming.</p>}

      {!goals.length ? (
        <RecordEmptyState title={emptyTitle} description="A clear aim gives your daily effort a direction." action={newGoalDrawer} />
      ) : (
        <ul className="records-list">
          {goals.map((goal) => {
            const owner = members.get(goal.owner_id);
            return (
              <TiltCard as="li" className={`record-card${goal.status === "completed" ? " record-card--complete" : ""}`} key={goal.id}>
                <div className="record-card-top">
                  <span className={`status-chip status-chip--${goal.status}`}>{goal.status === "active" ? "Active" : "Completed"}</span>
                  <div className="record-owner"><MemberAvatar name={owner?.display_name ?? "Rally member"} userId={goal.owner_id} src={owner?.avatar_path} size="sm" /><span>{goal.owner_id === user.id ? "You" : owner?.display_name ?? "Rally member"}</span></div>
                </div>
                <h2>{goal.title}</h2>
                {goal.description && <p className="record-description">{goal.description}</p>}
                <GoalProgressView
                  current={goal.progress_current}
                  target={goal.progress_target}
                  unit={goal.progress_unit}
                  timezone={workspace.timezone}
                  history={(historyByGoal.get(goal.id) ?? []).map((entry) => ({ ...entry, displayName: members.get(entry.changed_by ?? "")?.display_name ?? "Rally member" }))}
                />
                {goal.owner_id === user.id && <EditGoalForm goal={goal} />}
              </TiltCard>
            );
          })}
        </ul>
      )}
      {goals.length >= 100 && <p className="quiet-copy">Showing the 100 most recently updated goals in this view.</p>}
      <DeletedGoalList goals={deletedGoals} />
    </div>
  );
}
