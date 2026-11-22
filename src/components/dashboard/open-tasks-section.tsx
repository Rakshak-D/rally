import Link from "next/link";

import type { WorkspaceDashboard } from "@/lib/data/dashboard";

export function OpenTasksSection({
  tasks,
  memberProfiles,
}: {
  tasks: WorkspaceDashboard["openTasks"];
  memberProfiles: WorkspaceDashboard["workspaceMembers"];
}) {
  const memberNames = new Map(memberProfiles.map((member) => [member.id, member.display_name]));

  return (
    <section className="side-list-panel" aria-labelledby="tasks-heading">
      <div className="side-list-heading">
        <div><p className="eyebrow">IN MOTION</p><h2 id="tasks-heading">Open tasks</h2></div>
        <Link className="text-link" href="/tasks">All</Link>
      </div>
      {tasks.length === 0 ? (
        <p className="quiet-copy">No open tasks for this challenge.</p>
      ) : (
        <ul className="compact-record-list">
          {tasks.slice(0, 5).map((task) => (
            <li key={task.id}>
              <span className={`task-status-mark task-status-mark--${task.status}`} aria-hidden="true" />
              <span className="compact-record-copy"><strong>{task.title}</strong><span>{memberNames.get(task.owner_id) ?? "Rally member"}</span></span>
              <time>{task.due_date ?? "—"}</time>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
