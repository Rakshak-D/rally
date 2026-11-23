"use client";

import { useActionState, useOptimistic, useTransition } from "react";

import { Icon } from "@/components/ui/icons";
import { useActionToast } from "@/components/ui/toast";
import { initialActionState } from "@/lib/forms/state";
import { updateAssignedTaskStatusAction, updateTaskAction } from "@/lib/workspace/actions";
import type { Tables } from "@/lib/supabase/database.types";

type Task = Tables<"tasks">;
type TaskStatus = Task["status"];

const nextStatus: Record<TaskStatus, TaskStatus> = {
  todo: "in_progress",
  in_progress: "completed",
  completed: "todo",
};

const statusLabel: Record<TaskStatus, string> = {
  todo: "to do",
  in_progress: "in progress",
  completed: "done",
};

export function TaskStatusControl({ task, userId }: { task: Task; userId: string }) {
  const isAssigneeOnly = task.assignee_id === userId && task.owner_id !== userId;
  const action = isAssigneeOnly ? updateAssignedTaskStatusAction : updateTaskAction;
  const [state, submitAction, pending] = useActionState(action, initialActionState);
  useActionToast(state);
  const [status, setStatus] = useOptimistic<TaskStatus>(task.status);
  const [, startTransition] = useTransition();
  const targetStatus = nextStatus[status];

  function advanceStatus() {
    const formData = new FormData();
    formData.set("taskId", task.id);
    formData.set("status", targetStatus);
    if (!isAssigneeOnly) {
      formData.set("title", task.title);
      formData.set("description", task.description);
      formData.set("dueDate", task.due_date ?? "");
      formData.set("assigneeId", task.assignee_id ?? "");
    }
    startTransition(() => {
      setStatus(targetStatus);
      submitAction(formData);
    });
  }

  return (
    <div className="task-status-control-wrap">
      <div className="task-status-control-row">
        <button
          className={`task-status-control task-status-control--${status}`}
          type="button"
          disabled={pending}
          aria-label={`Mark ${task.title} ${statusLabel[targetStatus]}`}
          onClick={advanceStatus}
        >
          {status === "completed" && <Icon name="check" size={16} />}
        </button>
        <span className="task-status-control-label">{status === "in_progress" ? "In progress" : status === "completed" ? "Done" : "To do"}</span>
      </div>
      {state.kind === "error" && <p className="task-status-error" role="alert">{state.message}</p>}
    </div>
  );
}
