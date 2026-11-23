"use client";

import { useActionState } from "react";

import { useActionToast } from "@/components/ui/toast";
import { initialActionState } from "@/lib/forms/state";
import { reorderTaskAction } from "@/lib/workspace/actions";

export function TaskOrderControls({
  taskId,
  title,
  previousTaskId,
  taskAfterNextId,
  canMoveDown,
}: {
  taskId: string;
  title: string;
  previousTaskId: string | null;
  taskAfterNextId: string | null;
  canMoveDown: boolean;
}) {
  const [state, action, pending] = useActionState(reorderTaskAction, initialActionState);
  useActionToast(state);

  return (
    <div className="task-order-controls" aria-label={`Order controls for ${title}`}>
      <form action={action}>
        <input type="hidden" name="taskId" value={taskId} />
        <button className="button button--quiet task-order-button" name="beforeTaskId" value={previousTaskId ?? ""} type="submit" disabled={pending || !previousTaskId}>
          Move up
        </button>
        <button className="button button--quiet task-order-button" name="beforeTaskId" value={taskAfterNextId ?? ""} type="submit" disabled={pending || !canMoveDown}>
          Move down
        </button>
      </form>
      {state.kind === "error" && <span className="task-order-error" role="alert">{state.message}</span>}
    </div>
  );
}
