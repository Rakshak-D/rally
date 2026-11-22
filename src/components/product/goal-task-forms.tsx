"use client";

import { useActionState } from "react";

import { createGoalAction, createTaskAction, deleteGoalAction, deleteTaskAction, updateGoalAction, updateTaskAction } from "@/lib/workspace/actions";
import { initialActionState } from "@/lib/forms/state";
import type { Tables } from "@/lib/supabase/database.types";

type Goal = Tables<"goals">;
type Task = Tables<"tasks">;

export function CreateGoalForm({ workspaceId, challengeId }: { workspaceId: string; challengeId: string }) {
  const [state, formAction, pending] = useActionState(createGoalAction, initialActionState);
  return (
    <form action={formAction} className="record-form">
      <input type="hidden" name="workspaceId" value={workspaceId} /><input type="hidden" name="challengeId" value={challengeId} />
      <label className="field-label">Goal title<input className="field-input" name="title" type="text" maxLength={100} placeholder="Read more consistently" required /></label>
      <label className="field-label">Description <span className="field-optional">OPTIONAL</span><textarea className="field-textarea" name="description" rows={2} maxLength={1200} placeholder="A sentence to make the goal clear." /></label>
      {state.message && <p className={`form-message form-message--${state.kind}`} role={state.kind === "error" ? "alert" : "status"}>{state.message}</p>}
      <button className="button button--primary" type="submit" disabled={pending}>{pending ? "Adding…" : "Add goal"}</button>
    </form>
  );
}

export function CreateTaskForm({ workspaceId, challengeId }: { workspaceId: string; challengeId: string }) {
  const [state, formAction, pending] = useActionState(createTaskAction, initialActionState);
  return (
    <form action={formAction} className="record-form">
      <input type="hidden" name="workspaceId" value={workspaceId} /><input type="hidden" name="challengeId" value={challengeId} />
      <label className="field-label">Task title<input className="field-input" name="title" type="text" maxLength={120} placeholder="Book the studio" required /></label>
      <label className="field-label">Description <span className="field-optional">OPTIONAL</span><textarea className="field-textarea" name="description" rows={2} maxLength={1200} placeholder="Add a little context." /></label>
      <label className="field-label">Due date <span className="field-optional">OPTIONAL</span><input className="field-input" name="dueDate" type="date" /></label>
      {state.message && <p className={`form-message form-message--${state.kind}`} role={state.kind === "error" ? "alert" : "status"}>{state.message}</p>}
      <button className="button button--primary" type="submit" disabled={pending}>{pending ? "Adding…" : "Add task"}</button>
    </form>
  );
}

export function EditGoalForm({ goal }: { goal: Goal }) {
  const [state, formAction, pending] = useActionState(updateGoalAction, initialActionState);
  return (
    <details className="record-edit-details">
      <summary>Edit</summary>
      <form action={formAction} className="record-form">
        <input type="hidden" name="goalId" value={goal.id} />
        <label className="field-label">Title<input className="field-input" name="title" type="text" defaultValue={goal.title} maxLength={100} required /></label>
        <label className="field-label">Description<textarea className="field-textarea" name="description" rows={2} defaultValue={goal.description} maxLength={1200} /></label>
        <label className="field-label">Status<select className="field-select" name="status" defaultValue={goal.status}><option value="active">Active</option><option value="completed">Completed</option></select></label>
        {state.message && <p className={`form-message form-message--${state.kind}`} role={state.kind === "error" ? "alert" : "status"}>{state.message}</p>}
        <div className="record-form-actions">
          <button className="button button--secondary" type="submit" disabled={pending}>{pending ? "Saving…" : "Save changes"}</button>
        </div>
      </form>
      <DeleteGoalButton goalId={goal.id} />
    </details>
  );
}

export function EditTaskForm({ task }: { task: Task }) {
  const [state, formAction, pending] = useActionState(updateTaskAction, initialActionState);
  return (
    <details className="record-edit-details">
      <summary>Edit</summary>
      <form action={formAction} className="record-form">
        <input type="hidden" name="taskId" value={task.id} />
        <label className="field-label">Title<input className="field-input" name="title" type="text" defaultValue={task.title} maxLength={120} required /></label>
        <label className="field-label">Description<textarea className="field-textarea" name="description" rows={2} defaultValue={task.description} maxLength={1200} /></label>
        <label className="field-label">Status<select className="field-select" name="status" defaultValue={task.status}><option value="todo">To do</option><option value="in_progress">In progress</option><option value="completed">Completed</option></select></label>
        <label className="field-label">Due date<input className="field-input" name="dueDate" type="date" defaultValue={task.due_date ?? ""} /></label>
        {state.message && <p className={`form-message form-message--${state.kind}`} role={state.kind === "error" ? "alert" : "status"}>{state.message}</p>}
        <div className="record-form-actions">
          <button className="button button--secondary" type="submit" disabled={pending}>{pending ? "Saving…" : "Save changes"}</button>
        </div>
      </form>
      <DeleteTaskButton taskId={task.id} />
    </details>
  );
}

function DeleteGoalButton({ goalId }: { goalId: string }) {
  const [state, formAction, pending] = useActionState(deleteGoalAction, initialActionState);
  return (
    <form action={formAction}>
      <input type="hidden" name="goalId" value={goalId} />
      <button className="button button--quiet button--danger" type="submit" disabled={pending}>{pending ? "Deleting…" : "Delete goal"}</button>
      {state.message && <span className={`record-action-message record-action-message--${state.kind}`} role={state.kind === "error" ? "alert" : "status"}>{state.message}</span>}
    </form>
  );
}

function DeleteTaskButton({ taskId }: { taskId: string }) {
  const [state, formAction, pending] = useActionState(deleteTaskAction, initialActionState);
  return (
    <form action={formAction}>
      <input type="hidden" name="taskId" value={taskId} />
      <button className="button button--quiet button--danger" type="submit" disabled={pending}>{pending ? "Deleting…" : "Delete task"}</button>
      {state.message && <span className={`record-action-message record-action-message--${state.kind}`} role={state.kind === "error" ? "alert" : "status"}>{state.message}</span>}
    </form>
  );
}
