import Link from "next/link";

import type { WorkspaceDashboard } from "@/lib/data/dashboard";
import { goalProgressPercent } from "@/lib/domain/goal-progress";

export function ActiveGoalsSection({
  goals,
  memberProfiles,
  workspaceId,
}: {
  goals: WorkspaceDashboard["activeGoals"];
  memberProfiles: WorkspaceDashboard["workspaceMembers"];
  workspaceId: string;
}) {
  const memberNames = new Map(memberProfiles.map((member) => [member.id, member.display_name]));

  return (
    <section className="side-list-panel" aria-labelledby="goals-heading">
      <div className="side-list-heading">
        <div><p className="eyebrow">AIMING AT</p><h2 id="goals-heading">Active goals</h2></div>
        <Link className="text-link" href={`/goals?workspace=${encodeURIComponent(workspaceId)}`}>All</Link>
      </div>
      {goals.length === 0 ? (
        <p className="quiet-copy">No active goals for this challenge.</p>
      ) : (
        <ul className="goal-preview-list">
          {goals.slice(0, 4).map((goal) => (
            <li key={goal.id}>
              <span className="goal-mark" aria-hidden="true" />
              <span className="goal-preview-copy"><strong>{goal.title}</strong><small>{memberNames.get(goal.owner_id) ?? "Rally member"}</small>
                <span className="goal-preview-progress">{goal.progress_current}{goal.progress_unit ? ` ${goal.progress_unit}` : ""}{goal.progress_target !== null ? ` of ${goal.progress_target}${goal.progress_unit ? ` ${goal.progress_unit}` : ""}` : " · no target"}</span>
                {goal.progress_target !== null && <span className="goal-preview-track" role="progressbar" aria-label={`${goal.title} progress`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={goalProgressPercent(goal.progress_current, goal.progress_target) ?? 0} aria-valuetext={`${goal.progress_current} of ${goal.progress_target}${goal.progress_unit ? ` ${goal.progress_unit}` : ""}`}><span style={{ width: `${goalProgressPercent(goal.progress_current, goal.progress_target) ?? 0}%` }} /></span>}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
