import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { MemberAvatar } from "@/components/dashboard/member-avatar";
import { CreateTaskForm, DeletedTaskList, EditTaskForm } from "@/components/product/goal-task-forms";
import { RecordDrawer } from "@/components/product/record-drawer";
import { RecordEmptyState } from "@/components/product/record-empty-state";
import { RecordStatusFilters } from "@/components/product/record-status-filters";
import { TaskStatusControl } from "@/components/product/task-status-control";
import { requireUser } from "@/lib/auth/current-user";
import { getWorkspaceDashboard } from "@/lib/data/dashboard";
import { addCalendarDays, localDateAt } from "@/lib/domain/calendar";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/supabase/database.types";

export const metadata: Metadata = { title: "Tasks" };

type Task = Tables<"tasks">;
const taskStatuses = ["todo", "in_progress", "completed"] as const satisfies readonly Task["status"][];

export default async function TasksPage({ searchParams }: { searchParams: Promise<{ workspace?: string; status?: string }> }) {
  const [user, params, supabase] = await Promise.all([requireUser(), searchParams, createSupabaseServerClient()]);
  const data = await getWorkspaceDashboard(user.id, params.workspace);
  if (data.invalidWorkspace) notFound();
  const workspace = data.selectedWorkspace;

  if (!workspace) {
    return <section className="empty-state"><h1>Tasks</h1><p>Create or join a workspace from Today to begin.</p></section>;
  }

  const selectedStatus: Task["status"] | "all" = taskStatuses.includes(params.status as Task["status"])
    ? params.status as Task["status"]
    : "all";
  let tasksQuery = supabase.from("tasks").select("*").eq("workspace_id", workspace.id).is("deleted_at", null)
    .order("due_date", { ascending: true, nullsFirst: false }).order("updated_at", { ascending: false }).limit(100);
  if (selectedStatus !== "all") tasksQuery = tasksQuery.eq("status", selectedStatus);

  const taskCountQuery = Promise.all(taskStatuses.map((status) => supabase.from("tasks")
    .select("id", { count: "exact", head: true }).eq("workspace_id", workspace.id).is("deleted_at", null).eq("status", status)));
  const [taskResult, deletedResult, challengeResult, taskCountResults] = await Promise.all([
    tasksQuery,
    supabase.from("tasks").select("*").eq("workspace_id", workspace.id).not("deleted_at", "is", null)
      .order("deleted_at", { ascending: false }).limit(50),
    supabase.from("challenge_status").select("id, title, status, start_date, end_date, timezone")
      .eq("workspace_id", workspace.id).order("start_date", { ascending: false }),
    taskCountQuery,
  ]);
  if (taskResult.error || deletedResult.error || challengeResult.error || taskCountResults.some(({ error }) => error)) {
    throw new Error("Tasks could not be loaded.");
  }

  const tasks = taskResult.data ?? [];
  const deletedTasks = deletedResult.data ?? [];
  const challenges = challengeResult.data ?? [];
  const writableChallenge = challenges.find((challenge) => challenge.status === "active") ?? challenges.find((challenge) => challenge.status === "upcoming");
  const members = new Map(data.workspaceMembers.map((member) => [member.id, member]));
  const challengeTimezones = new Map(challenges.map((challenge) => [challenge.id, challenge.timezone ?? workspace.timezone]));
  const counts = new Map(taskStatuses.map((status, index) => [status, taskCountResults[index].count ?? 0]));
  const totalTasks = taskStatuses.reduce((sum, status) => sum + (counts.get(status) ?? 0), 0);
  const newTaskDrawer = writableChallenge ? (
    <RecordDrawer actionLabel="New task" title="Add a task" description="Write down one useful next step for this challenge.">
      <CreateTaskForm workspaceId={workspace.id} challengeId={writableChallenge.id} members={data.workspaceMembers} />
    </RecordDrawer>
  ) : null;
  const emptyTitle = selectedStatus === "completed" ? "No finished tasks yet" : selectedStatus === "in_progress" ? "Nothing in progress" : selectedStatus === "todo" ? "No tasks to do" : "Make the next step concrete";

  return (
    <div className="page-wrap records-page tasks-page">
      <header className="page-heading page-heading--spread">
        <div><h1>Tasks</h1><p>Small, owned actions that keep a goal moving.</p></div>
        {tasks.length > 0 && newTaskDrawer}
      </header>

      <RecordStatusFilters
        route="/tasks"
        selected={selectedStatus}
        workspaceId={workspace.id}
        statuses={[
          { value: "all", label: "All tasks", count: totalTasks },
          { value: "todo", label: "To do", count: counts.get("todo") ?? 0 },
          { value: "in_progress", label: "In progress", count: counts.get("in_progress") ?? 0 },
          { value: "completed", label: "Done", count: counts.get("completed") ?? 0 },
        ]}
      />

      {!writableChallenge && <p className="record-context-note">Tasks can be added when a challenge is active or upcoming.</p>}

      {!tasks.length ? (
        <RecordEmptyState title={emptyTitle} description="Give your effort one clear next step." action={newTaskDrawer} />
      ) : (
        <ul className="records-list">
          {tasks.map((task) => {
            const owner = members.get(task.owner_id);
            const assignee = task.assignee_id ? members.get(task.assignee_id) : null;
            const challengeTimezone = challengeTimezones.get(task.challenge_id) ?? workspace.timezone;
            const challengeToday = localDateAt(new Date(), challengeTimezone);
            const dueSoonDate = addCalendarDays(challengeToday, 3) ?? challengeToday;
            const overdue = Boolean(task.due_date && task.status !== "completed" && task.due_date < challengeToday);
            const dueSoon = Boolean(task.due_date && task.status !== "completed" && !overdue && task.due_date <= dueSoonDate);
            const canUpdateStatus = task.owner_id === user.id || task.assignee_id === user.id;
            return (
              <li className={`record-card task-card${task.status === "completed" ? " record-card--complete" : ""}`} key={task.id}>
                <div className="task-card-top">
                  {canUpdateStatus ? <TaskStatusControl task={task} userId={user.id} /> : <span className={`status-chip status-chip--${task.status}`}>{task.status === "in_progress" ? "In progress" : task.status === "todo" ? "To do" : "Done"}</span>}
                  <span className="task-created-by">Added by {task.owner_id === user.id ? "you" : owner?.display_name ?? "Rally member"}</span>
                </div>
                <h2>{task.title}</h2>
                {task.description && <p className="record-description">{task.description}</p>}
                <div className="task-card-meta">
                  <div className="record-owner"><MemberAvatar name={assignee?.display_name ?? "Unassigned"} userId={task.assignee_id ?? undefined} src={assignee?.avatar_path} size="sm" /><span>{assignee ? `Assigned to ${assignee.display_name}` : "Unassigned"}</span></div>
                  {task.due_date && <time className={`record-due${overdue ? " is-overdue" : dueSoon ? " is-due-soon" : ""}`} dateTime={task.due_date}>{overdue ? "Overdue" : dueSoon ? "Due soon" : "Due"} · {task.due_date}</time>}
                </div>
                {task.owner_id === user.id && <EditTaskForm task={task} members={data.workspaceMembers} />}
              </li>
            );
          })}
        </ul>
      )}
      {tasks.length >= 100 && <p className="quiet-copy">Showing the 100 nearest or most recently updated tasks in this view.</p>}
      <DeletedTaskList tasks={deletedTasks} />
    </div>
  );
}
