import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AssignedTaskStatusForm, CreateTaskForm, DeletedTaskList, EditTaskForm } from "@/components/product/goal-task-forms";
import { requireUser } from "@/lib/auth/current-user";
import { getWorkspaceDashboard } from "@/lib/data/dashboard";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Tasks" };

export default async function TasksPage({ searchParams }: { searchParams: Promise<{ workspace?: string }> }) {
  const [user, params, supabase] = await Promise.all([requireUser(), searchParams, createSupabaseServerClient()]);
  const data = await getWorkspaceDashboard(user.id, params.workspace);
  if (data.invalidWorkspace) notFound();
  const workspace = data.selectedWorkspace;

  if (!workspace) {
    return <section className="empty-state"><p className="eyebrow">TASKS</p><h2>Give the next step a place.</h2><p>Create or join a workspace from Today to begin.</p></section>;
  }

  const [{ data: tasks, error }, { data: deletedTasks, error: deletedError }, { data: challengeRows, error: challengeError }] = await Promise.all([
    supabase.from("tasks").select("*").eq("workspace_id", workspace.id).is("deleted_at", null).order("due_date", { ascending: true, nullsFirst: false }).order("updated_at", { ascending: false }).limit(100),
    supabase.from("tasks").select("*").eq("workspace_id", workspace.id).not("deleted_at", "is", null).order("deleted_at", { ascending: false }).limit(50),
    supabase.from("challenge_status").select("id, title, status").eq("workspace_id", workspace.id).order("start_date", { ascending: false }),
  ]);
  if (error || deletedError || challengeError) throw new Error("Tasks could not be loaded.");

  const writableChallenge = challengeRows?.find((challenge) => challenge.status === "active") ?? challengeRows?.find((challenge) => challenge.status === "upcoming");
  const names = new Map(data.workspaceMembers.map((member) => [member.id, member.display_name]));

  return (
    <div className="page-wrap records-page">
      <header className="page-heading page-heading--spread">
        <div><p className="eyebrow">{workspace.name.toUpperCase()} · NEXT STEPS</p><h1>Tasks.</h1><p>Small, owned actions that keep a goal moving.</p></div>
        <span className="record-total">{tasks?.filter((task) => task.status !== "completed").length ?? 0}<small>open</small></span>
      </header>

      {writableChallenge && (
        <details className="create-record-details">
          <summary>Add a task <span aria-hidden="true">＋</span></summary>
          <div className="create-record-body"><CreateTaskForm workspaceId={workspace.id} challengeId={writableChallenge.id} members={data.workspaceMembers} /></div>
        </details>
      )}
      {!writableChallenge && <p className="form-message form-message--info">Tasks can be added when a challenge is active or upcoming.</p>}

      {!tasks?.length ? (
        <section className="empty-state record-empty"><span className="empty-state-mark" aria-hidden="true">01</span><h2>No tasks here yet.</h2><p>Add a next step when you&apos;re ready to make it concrete.</p></section>
      ) : (
        <ul className="records-list">
          {tasks.map((task) => (
            <li className={`record-card${task.status === "completed" ? " record-card--complete" : ""}`} key={task.id}>
              <div className="record-card-heading"><span className={`status-chip status-chip--${task.status}`}>{task.status === "in_progress" ? "In progress" : task.status === "todo" ? "To do" : "Completed"}</span><span className="record-owner">{task.owner_id === user.id ? "Created by you" : `Created by ${names.get(task.owner_id) ?? "Rally member"}`}</span></div>
              <h2>{task.title}</h2>
              {task.description && <p>{task.description}</p>}
              <p className="task-assignee">{task.assignee_id ? `Assigned to ${names.get(task.assignee_id) ?? "Rally member"}` : "Unassigned"}</p>
              {task.due_date && <time className="record-due" dateTime={task.due_date}>DUE · {task.due_date}</time>}
              {task.owner_id === user.id && <EditTaskForm task={task} members={data.workspaceMembers} />}
              {task.assignee_id === user.id && task.owner_id !== user.id && <AssignedTaskStatusForm task={task} />}
            </li>
          ))}
        </ul>
      )}
      {(tasks?.length ?? 0) >= 100 && <p className="quiet-copy">Showing the 100 nearest or most recently updated tasks.</p>}
      <DeletedTaskList tasks={deletedTasks ?? []} />
    </div>
  );
}
