"use client";

import { useActionState } from "react";

import { useActionToast } from "@/components/ui/toast";
import { TimezoneSelect } from "@/components/workspace/create-workspace-form";
import { initialActionState } from "@/lib/forms/state";
import { updateWorkspaceAction } from "@/lib/workspace/actions";

export function WorkspaceForm({ workspaceId, name, timezone }: { workspaceId: string; name: string; timezone: string }) {
  const [state, formAction, pending] = useActionState(updateWorkspaceAction, initialActionState);
  useActionToast(state);

  return (
    <form action={formAction} className="settings-form">
      <input type="hidden" name="workspaceId" value={workspaceId} />
      <label className="field-label" htmlFor="workspace-name-setting">
        Workspace name
        <input className="field-input" id="workspace-name-setting" name="name" type="text" maxLength={80} defaultValue={name} required />
      </label>
      <label className="field-label" htmlFor="workspace-timezone-setting">
        Workspace timezone
        <TimezoneSelect id="workspace-timezone-setting" name="timezone" value={timezone} />
        <span className="field-hint">Existing challenges keep the timezone they started with.</span>
      </label>
      {state.kind === "error" && state.message && <p className="form-message form-message--error" role="alert">{state.message}</p>}
      <button className="button button--secondary" type="submit" disabled={pending}>{pending ? "Saving…" : "Save workspace"}</button>
    </form>
  );
}
