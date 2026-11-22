import Link from "next/link";

import type { WorkspaceDashboard } from "@/lib/data/dashboard";

export function ActiveGoalsSection({
  goals,
  memberProfiles,
}: {
  goals: WorkspaceDashboard["activeGoals"];
  memberProfiles: WorkspaceDashboard["workspaceMembers"];
}) {
  const memberNames = new Map(memberProfiles.map((member) => [member.id, member.display_name]));

  return (
    <section className="side-list-panel" aria-labelledby="goals-heading">
      <div className="side-list-heading">
        <div><p className="eyebrow">AIMING AT</p><h2 id="goals-heading">Active goals</h2></div>
        <Link className="text-link" href="/goals">All</Link>
      </div>
      {goals.length === 0 ? (
        <p className="quiet-copy">No active goals for this challenge.</p>
      ) : (
        <ul className="goal-preview-list">
          {goals.slice(0, 4).map((goal) => (
            <li key={goal.id}><span className="goal-mark" aria-hidden="true" /><span><strong>{goal.title}</strong><small>{memberNames.get(goal.owner_id) ?? "Rally member"}</small></span></li>
          ))}
        </ul>
      )}
    </section>
  );
}
