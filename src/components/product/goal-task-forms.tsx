"use client";

import type { FormEvent } from "react";
import { useActionState, useCallback, useEffect, useRef, useState } from "react";

import { Icon } from "@/components/ui/icons";
import { showToast, useActionToast } from "@/components/ui/toast";
import {
  createGoalAction,
  createTaskAction,
  deleteGoalAction,
  deleteTaskAction,
  restoreGoalAction,
  restoreTaskAction,
  updateAssignedTaskStatusAction,
  updateGoalAction,
  updateTaskAction,
} from "@/lib/workspace/actions";
import { initialActionState, type ActionState } from "@/lib/forms/state";
import type { Tables } from "@/lib/supabase/database.types";

type Goal = Tables<"goals">;
type Task = Tables<"tasks">;
type Member = Pick<Tables<"profiles">, "id" | "display_name">;

function titleErrorOnSubmit(event: FormEvent<HTMLFormElement>, limit: number, setError: (message: string) => void) {
  const input = event.currentTarget.elements.namedItem("title");
  if (!(input instanceof HTMLInputElement)) return;
  const value = input.value.trim();
  const message = value.length === 0
    ? "Enter a title."
    : value.length > limit
      ? `Keep the title to ${limit} characters or fewer.`
      : "";
  setError(message);
  if (message) {
    event.preventDefault();
    input.focus();
  }
}

function FieldError({ id, message }: { id: string; message?: string }) {
  return message ? <span className="field-error" id={id}>{message}</span> : null;
}

function ActionMessage({ state }: { state: ActionState }) {
  if (state.kind !== "error" || !state.message) return null;
  return <p className="form-message form-message--error" role="alert">{state.message}</p>;
}

export function CreateGoalForm({ workspaceId, challengeId }: { workspaceId: string; challengeId: string }) {
  const actionWithToast = useCallback(async (previous: ActionState, formData: FormData): Promise<ActionState> => {
    const result = await createGoalAction(previous, formData);
    if (result.kind === "success") {
      showToast(result.message);
      window.dispatchEvent(new Event("rally:record-created"));
    }
    return result;
  }, []);
  const [state, formAction, pending] = useActionState(actionWithToast, initialActionState);
  const [titleOverride, setTitleOverride] = useState<string | null>(null);
  const titleError = titleOverride ?? state.fieldErrors?.title;
  const progressError = state.fieldErrors?.progressCurrent ?? state.fieldErrors?.progressTarget;

  return (
    <form action={formAction} className="record-form" noValidate onSubmit={(event) => titleErrorOnSubmit(event, 100, setTitleOverride)}>
      <input type="hidden" name="workspaceId" value={workspaceId} /><input type="hidden" name="challengeId" value={challengeId} />
      <label className="field-label">Goal title<input className="field-input" name="title" type="text" maxLength={100} placeholder="Read more consistently" aria-required="true" aria-invalid={titleError ? "true" : undefined} aria-describedby={titleError ? "new-goal-title-error" : undefined} onChange={() => setTitleOverride("")} /></label>
      <FieldError id="new-goal-title-error" message={titleError} />
      <label className="field-label">Description <span className="field-optional">Optional</span><textarea className="field-textarea" name="description" rows={2} maxLength={1200} placeholder="A sentence to make the goal clear." /></label>
      <div className="goal-progress-fields">
        <label className="field-label">Progress<input className="field-input" name="progressCurrent" type="number" min="0" max="1000000000" step="any" defaultValue="0" aria-invalid={progressError ? "true" : undefined} aria-describedby={progressError ? "new-goal-progress-error" : undefined} /></label>
        <label className="field-label">Target <span className="field-optional">Optional</span><input className="field-input" name="progressTarget" type="number" min="0.01" max="1000000000" step="any" placeholder="e.g. 20" aria-invalid={progressError ? "true" : undefined} aria-describedby={progressError ? "new-goal-progress-error" : undefined} /></label>
        <label className="field-label">Unit <span className="field-optional">Optional</span><input className="field-input" name="progressUnit" type="text" maxLength={24} placeholder="sessions" /></label>
      </div>
      <FieldError id="new-goal-progress-error" message={progressError} />
      <ActionMessage state={state} />
      <button className="button button--primary" type="submit" disabled={pending}>{pending ? "Adding…" : "Add goal"}</button>
    </form>
  );
}

export function CreateTaskForm({ workspaceId, challengeId, members }: { workspaceId: string; challengeId: string; members: Member[] }) {
  const actionWithToast = useCallback(async (previous: ActionState, formData: FormData): Promise<ActionState> => {
    const result = await createTaskAction(previous, formData);
    if (result.kind === "success") {
      showToast(result.message);
      window.dispatchEvent(new Event("rally:record-created"));
    }
    return result;
  }, []);
  const [state, formAction, pending] = useActionState(actionWithToast, initialActionState);
  const [titleOverride, setTitleOverride] = useState<string | null>(null);
  const titleError = titleOverride ?? state.fieldErrors?.title;

  return (
    <form action={formAction} className="record-form" noValidate onSubmit={(event) => titleErrorOnSubmit(event, 120, setTitleOverride)}>
      <input type="hidden" name="workspaceId" value={workspaceId} /><input type="hidden" name="challengeId" value={challengeId} />
      <label className="field-label">Task title<input className="field-input" name="title" type="text" maxLength={120} placeholder="Book the studio" aria-required="true" aria-invalid={titleError ? "true" : undefined} aria-describedby={titleError ? "new-task-title-error" : undefined} onChange={() => setTitleOverride("")} /></label>
      <FieldError id="new-task-title-error" message={titleError} />
      <label className="field-label">Description <span className="field-optional">Optional</span><textarea className="field-textarea" name="description" rows={2} maxLength={1200} placeholder="Add a little context." /></label>
      <label className="field-label">Assign to
        <select className="field-select" name="assigneeId" defaultValue="">
          <option value="">Unassigned</option>
          {members.map((member) => <option value={member.id} key={member.id}>{member.display_name}</option>)}
        </select>
      </label>
      <label className="field-label">Due date <span className="field-optional">Optional</span><input className="field-input" name="dueDate" type="date" aria-invalid={state.fieldErrors?.dueDate ? "true" : undefined} aria-describedby={state.fieldErrors?.dueDate ? "new-task-date-error" : undefined} /></label>
      <FieldError id="new-task-date-error" message={state.fieldErrors?.dueDate} />
      <ActionMessage state={state} />
      <button className="button button--primary" type="submit" disabled={pending}>{pending ? "Adding…" : "Add task"}</button>
    </form>
  );
}

export function EditGoalForm({ goal }: { goal: Goal }) {
  const [state, formAction, pending] = useActionState(updateGoalAction, initialActionState);
  useActionToast(state);
  const [titleOverride, setTitleOverride] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [focusProgress, setFocusProgress] = useState(false);
  const menuRef = useRef<HTMLDetailsElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const progressRef = useRef<HTMLInputElement>(null);
  const titleError = titleOverride ?? state.fieldErrors?.title;
  const progressError = state.fieldErrors?.progressCurrent ?? state.fieldErrors?.progressTarget;

  useEffect(() => {
    if (editing) (focusProgress ? progressRef.current : titleRef.current)?.focus();
  }, [editing, focusProgress]);

  function openEditor(progress = false) {
    setFocusProgress(progress);
    setEditing(true);
    if (menuRef.current) menuRef.current.open = false;
  }

  return (
    <>
      <div className="record-card-actions">
        <button className="button button--quiet" type="button" onClick={() => openEditor(true)}>Log progress</button>
        <details className="record-overflow" ref={menuRef}>
          <summary aria-label={`More actions for ${goal.title}`}><Icon name="more" /></summary>
          <div className="record-overflow-menu" aria-label={`Actions for ${goal.title}`}>
            <button type="button" onClick={() => openEditor(false)}>Edit goal</button>
            <DeleteGoalButton goalId={goal.id} />
          </div>
        </details>
      </div>
      {editing && (
        <section className="record-edit-panel" aria-labelledby={`goal-edit-heading-${goal.id}`}>
          <header><h3 id={`goal-edit-heading-${goal.id}`}>Edit goal</h3><button className="icon-button" type="button" aria-label="Close goal editor" onClick={() => setEditing(false)}><Icon name="close" /></button></header>
          <form action={formAction} className="record-form" noValidate onSubmit={(event) => titleErrorOnSubmit(event, 100, setTitleOverride)}>
            <input type="hidden" name="goalId" value={goal.id} />
            <label className="field-label">Title<input ref={titleRef} className="field-input" name="title" type="text" defaultValue={goal.title} maxLength={100} aria-required="true" aria-invalid={titleError ? "true" : undefined} aria-describedby={titleError ? `goal-title-error-${goal.id}` : undefined} onChange={() => setTitleOverride("")} /></label>
            <FieldError id={`goal-title-error-${goal.id}`} message={titleError} />
            <label className="field-label">Description<textarea className="field-textarea" name="description" rows={2} defaultValue={goal.description} maxLength={1200} /></label>
            <div className="goal-progress-fields">
              <label className="field-label">Progress<input ref={progressRef} className="field-input" name="progressCurrent" type="number" min="0" max="1000000000" step="any" defaultValue={goal.progress_current} aria-invalid={progressError ? "true" : undefined} aria-describedby={progressError ? `goal-progress-error-${goal.id}` : undefined} /></label>
              <label className="field-label">Target <span className="field-optional">Optional</span><input className="field-input" name="progressTarget" type="number" min="0.01" max="1000000000" step="any" defaultValue={goal.progress_target ?? ""} aria-invalid={progressError ? "true" : undefined} aria-describedby={progressError ? `goal-progress-error-${goal.id}` : undefined} /></label>
              <label className="field-label">Unit <span className="field-optional">Optional</span><input className="field-input" name="progressUnit" type="text" defaultValue={goal.progress_unit ?? ""} maxLength={24} /></label>
            </div>
            <FieldError id={`goal-progress-error-${goal.id}`} message={progressError} />
            <label className="field-label">Status<select className="field-select" name="status" defaultValue={goal.status}><option value="active">Active</option><option value="completed">Completed</option></select></label>
            <ActionMessage state={state} />
            <div className="record-form-actions"><button className="button button--secondary" type="submit" disabled={pending}>{pending ? "Saving…" : "Save changes"}</button></div>
          </form>
        </section>
      )}
    </>
  );
}

export function EditTaskForm({ task, members }: { task: Task; members: Member[] }) {
  const [state, formAction, pending] = useActionState(updateTaskAction, initialActionState);
  useActionToast(state);
  const [titleOverride, setTitleOverride] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const menuRef = useRef<HTMLDetailsElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const titleError = titleOverride ?? state.fieldErrors?.title;

  useEffect(() => {
    if (editing) titleRef.current?.focus();
  }, [editing]);

  return (
    <>
      <div className="record-card-actions record-card-actions--task">
        <details className="record-overflow" ref={menuRef}>
          <summary aria-label={`More actions for ${task.title}`}><Icon name="more" /></summary>
          <div className="record-overflow-menu" aria-label={`Actions for ${task.title}`}>
            <button type="button" onClick={() => { setEditing(true); if (menuRef.current) menuRef.current.open = false; }}>Edit task</button>
            <DeleteTaskButton taskId={task.id} />
          </div>
        </details>
      </div>
      {editing && (
        <section className="record-edit-panel" aria-labelledby={`task-edit-heading-${task.id}`}>
          <header><h3 id={`task-edit-heading-${task.id}`}>Edit task</h3><button className="icon-button" type="button" aria-label="Close task editor" onClick={() => setEditing(false)}><Icon name="close" /></button></header>
          <form action={formAction} className="record-form" noValidate onSubmit={(event) => titleErrorOnSubmit(event, 120, setTitleOverride)}>
            <input type="hidden" name="taskId" value={task.id} />
            <label className="field-label">Title<input ref={titleRef} className="field-input" name="title" type="text" defaultValue={task.title} maxLength={120} aria-required="true" aria-invalid={titleError ? "true" : undefined} aria-describedby={titleError ? `task-title-error-${task.id}` : undefined} onChange={() => setTitleOverride("")} /></label>
            <FieldError id={`task-title-error-${task.id}`} message={titleError} />
            <label className="field-label">Description<textarea className="field-textarea" name="description" rows={2} defaultValue={task.description} maxLength={1200} /></label>
            <label className="field-label">Status<select className="field-select" name="status" defaultValue={task.status}><option value="todo">To do</option><option value="in_progress">In progress</option><option value="completed">Completed</option></select></label>
            <label className="field-label">Assign to
              <select className="field-select" name="assigneeId" defaultValue={task.assignee_id ?? ""}>
                <option value="">Unassigned</option>
                {members.map((member) => <option value={member.id} key={member.id}>{member.display_name}</option>)}
              </select>
            </label>
            <label className="field-label">Due date<input className="field-input" name="dueDate" type="date" defaultValue={task.due_date ?? ""} aria-invalid={state.fieldErrors?.dueDate ? "true" : undefined} aria-describedby={state.fieldErrors?.dueDate ? `task-date-error-${task.id}` : undefined} /></label>
            <FieldError id={`task-date-error-${task.id}`} message={state.fieldErrors?.dueDate} />
            <ActionMessage state={state} />
            <div className="record-form-actions"><button className="button button--secondary" type="submit" disabled={pending}>{pending ? "Saving…" : "Save changes"}</button></div>
          </form>
        </section>
      )}
    </>
  );
}

export function AssignedTaskStatusForm({ task }: { task: Task }) {
  const [state, formAction, pending] = useActionState(updateAssignedTaskStatusAction, initialActionState);
  useActionToast(state);
  return (
    <form action={formAction} className="assigned-task-status-form">
      <input type="hidden" name="taskId" value={task.id} />
      <label className="field-label">Your status<select className="field-select" name="status" defaultValue={task.status}><option value="todo">To do</option><option value="in_progress">In progress</option><option value="completed">Completed</option></select></label>
      <button className="button button--secondary" type="submit" disabled={pending}>{pending ? "Saving…" : "Update status"}</button>
      <ActionMessage state={state} />
    </form>
  );
}

export function DeletedGoalList({ goals }: { goals: Goal[] }) {
  if (!goals.length) return null;
  return (
    <details className="deleted-records">
      <summary>Recently deleted goals <span>{goals.length}</span></summary>
      <p className="quiet-copy">Removed goals stay in your account until you restore them. Progress history is retained.</p>
      <ul>{goals.map((goal) => <li key={goal.id}><span><strong>{goal.title}</strong><small>Removed {goal.deleted_at ? new Date(goal.deleted_at).toLocaleDateString("en-GB", { timeZone: "UTC" }) : ""}</small></span><RestoreGoalButton goalId={goal.id} /></li>)}</ul>
    </details>
  );
}

export function DeletedTaskList({ tasks }: { tasks: Task[] }) {
  if (!tasks.length) return null;
  return (
    <details className="deleted-records">
      <summary>Recently deleted tasks <span>{tasks.length}</span></summary>
      <p className="quiet-copy">Removed tasks stay in your account until you restore them.</p>
      <ul>{tasks.map((task) => <li key={task.id}><span><strong>{task.title}</strong><small>Removed {task.deleted_at ? new Date(task.deleted_at).toLocaleDateString("en-GB", { timeZone: "UTC" }) : ""}</small></span><RestoreTaskButton taskId={task.id} /></li>)}</ul>
    </details>
  );
}

function DeleteGoalButton({ goalId }: { goalId: string }) {
  const undo = useCallback(async (): Promise<string> => {
    const formData = new FormData();
    formData.set("goalId", goalId);
    const result = await restoreGoalAction(initialActionState, formData);
    if (result.kind === "error") throw new Error(result.message);
    return result.message;
  }, [goalId]);
  const deleteWithToast = useCallback(async (previous: ActionState, formData: FormData): Promise<ActionState> => {
    const result = await deleteGoalAction(previous, formData);
    if (result.kind === "success") showToast(result.message, { label: "Undo", run: undo });
    return result;
  }, [undo]);
  const [state, formAction, pending] = useActionState(deleteWithToast, initialActionState);

  return (
    <form action={formAction} onSubmit={(event) => { if (!window.confirm("Move this goal to recently deleted? You can restore it later.")) event.preventDefault(); }}>
      <input type="hidden" name="goalId" value={goalId} />
      <button className="button button--quiet button--danger" type="submit" disabled={pending}>{pending ? "Removing…" : "Move to deleted items"}</button>
      {state.kind === "error" && <ActionMessage state={state} />}
    </form>
  );
}

function DeleteTaskButton({ taskId }: { taskId: string }) {
  const undo = useCallback(async (): Promise<string> => {
    const formData = new FormData();
    formData.set("taskId", taskId);
    const result = await restoreTaskAction(initialActionState, formData);
    if (result.kind === "error") throw new Error(result.message);
    return result.message;
  }, [taskId]);
  const deleteWithToast = useCallback(async (previous: ActionState, formData: FormData): Promise<ActionState> => {
    const result = await deleteTaskAction(previous, formData);
    if (result.kind === "success") showToast(result.message, { label: "Undo", run: undo });
    return result;
  }, [undo]);
  const [state, formAction, pending] = useActionState(deleteWithToast, initialActionState);

  return (
    <form action={formAction} onSubmit={(event) => { if (!window.confirm("Move this task to recently deleted? You can restore it later.")) event.preventDefault(); }}>
      <input type="hidden" name="taskId" value={taskId} />
      <button className="button button--quiet button--danger" type="submit" disabled={pending}>{pending ? "Removing…" : "Move to deleted items"}</button>
      {state.kind === "error" && <ActionMessage state={state} />}
    </form>
  );
}

function RestoreGoalButton({ goalId }: { goalId: string }) {
  const [state, formAction, pending] = useActionState(restoreGoalAction, initialActionState);
  useActionToast(state);
  return <form action={formAction}><input type="hidden" name="goalId" value={goalId} /><button className="button button--secondary" type="submit" disabled={pending}>{pending ? "Restoring…" : "Restore"}</button><ActionMessage state={state} /></form>;
}

function RestoreTaskButton({ taskId }: { taskId: string }) {
  const [state, formAction, pending] = useActionState(restoreTaskAction, initialActionState);
  useActionToast(state);
  return <form action={formAction}><input type="hidden" name="taskId" value={taskId} /><button className="button button--secondary" type="submit" disabled={pending}>{pending ? "Restoring…" : "Restore"}</button><ActionMessage state={state} /></form>;
}
