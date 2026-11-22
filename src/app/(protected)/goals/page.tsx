import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CreateGoalForm, EditGoalForm } from "@/components/product/goal-task-forms";
import { requireUser } from "@/lib/auth/current-user";
import { getWorkspaceDashboard } from "@/lib/data/dashboard";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Goals" };

export default async function GoalsPage({ searchParams }: { searchParams: Promise<{ workspace?: string }> }) {
  const [user, params, supabase] = await Promise.all([requireUser(), searchParams, createSupabaseServerClient()]);
  const data = await getWorkspaceDashboard(user.id, params.workspace);
  if (data.invalidWorkspace) notFound();
  const workspace = data.selectedWorkspace;

  if (!workspace) {
    return <section className="empty-state"><p className="eyebrow">GOALS</p><h2>Make space for a shared aim.</h2><p>Create or join a workspace from Today to begin.</p></section>;
  }

  const [{ data: goals, error }, { data: challengeRows, error: challengeError }] = await Promise.all([
    supabase.from("goals").select("*").eq("workspace_id", workspace.id).order("updated_at", { ascending: false }).limit(100),
    supabase.from("challenge_status").select("id, title, status").eq("workspace_id", workspace.id).order("start_date", { ascending: false }),
  ]);
  if (error || challengeError) throw new Error("Goals could not be loaded.");

  const writableChallenge = challengeRows?.find((challenge) => challenge.status === "active") ?? challengeRows?.find((challenge) => challenge.status === "upcoming");
  const names = new Map(data.workspaceMembers.map((member) => [member.id, member.display_name]));

  return (
    <div className="page-wrap records-page">
      <header className="page-heading page-heading--spread">
        <div><p className="eyebrow">{workspace.name.toUpperCase()} · SHARED AIMS</p><h1>Goals.</h1><p>Keep the bigger intention clear, then return to it together.</p></div>
        <span className="record-total">{goals?.length ?? 0}<small>records</small></span>
      </header>

      {writableChallenge && (
        <details className="create-record-details">
          <summary>Set a goal <span aria-hidden="true">＋</span></summary>
          <div className="create-record-body"><CreateGoalForm workspaceId={workspace.id} challengeId={writableChallenge.id} /></div>
        </details>
      )}

      {!writableChallenge && <p className="form-message form-message--info">Goals can be added when a challenge is active or upcoming.</p>}

      {!goals?.length ? (
        <section className="empty-state record-empty"><span className="empty-state-mark" aria-hidden="true">↗</span><h2>No goals on the board yet.</h2><p>The first one can be small, specific, and yours.</p></section>
      ) : (
        <ul className="records-list">
          {goals.map((goal) => (
            <li className={`record-card${goal.status === "completed" ? " record-card--complete" : ""}`} key={goal.id}>
              <div className="record-card-heading"><span className={`status-chip status-chip--${goal.status}`}>{goal.status}</span><span className="record-owner">{goal.owner_id === user.id ? "You" : names.get(goal.owner_id) ?? "Rally member"}</span></div>
              <h2>{goal.title}</h2>
              {goal.description && <p>{goal.description}</p>}
              {goal.owner_id === user.id && <EditGoalForm goal={goal} />}
            </li>
          ))}
        </ul>
      )}
      {(goals?.length ?? 0) >= 100 && <p className="quiet-copy">Showing the 100 most recently updated goals.</p>}
    </div>
  );
}
