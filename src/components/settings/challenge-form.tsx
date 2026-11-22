"use client";

import { useActionState, useId } from "react";

import { initialActionState } from "@/lib/forms/state";
import { updateChallengeAction } from "@/lib/workspace/actions";
import type { WorkspaceDashboard } from "@/lib/data/dashboard";

type Challenge = NonNullable<WorkspaceDashboard["challenge"]>;

export function ChallengeSettingsForm({ challenge, canEdit }: { challenge: Challenge; canEdit: boolean }) {
  const [state, formAction, pending] = useActionState(updateChallengeAction, initialActionState);
  const id = useId();
  const titleId = `${id}-title`;
  const descriptionId = `${id}-description`;
  const startId = `${id}-start`;
  const endId = `${id}-end`;
  const datesLocked = challenge.status !== "upcoming";

  return (
    <form action={formAction} className="settings-form">
      <input type="hidden" name="challengeId" value={challenge.id} />
      <input type="hidden" name="workspaceId" value={challenge.workspace_id} />
      <label className="field-label" htmlFor={titleId}>
        Challenge name
        <input className="field-input" id={titleId} name="title" type="text" maxLength={100} defaultValue={challenge.title} required disabled={!canEdit} />
      </label>
      <label className="field-label" htmlFor={descriptionId}>
        Description
        <textarea className="field-textarea" id={descriptionId} name="description" maxLength={1200} rows={3} defaultValue={challenge.description} disabled={!canEdit} />
      </label>
      {datesLocked ? (
        <div className="settings-date-note">
          <input type="hidden" name="startDate" value={challenge.start_date} />
          <input type="hidden" name="endDate" value={challenge.end_date} />
          <span className="field-hint">DATES · {challenge.start_date} — {challenge.end_date}</span>
          <span className="field-hint">Challenge dates and timezone lock once the challenge begins.</span>
        </div>
      ) : (
        <div className="date-fields">
          <label className="field-label" htmlFor={startId}>Start date<input className="field-input" id={startId} name="startDate" type="date" defaultValue={challenge.start_date} required disabled={!canEdit} /></label>
          <label className="field-label" htmlFor={endId}>End date · inclusive<input className="field-input" id={endId} name="endDate" type="date" defaultValue={challenge.end_date} required disabled={!canEdit} /></label>
        </div>
      )}
      {!canEdit && <p className="quiet-copy">Only a workspace owner can edit this challenge.</p>}
      {state.message && <p className={`form-message form-message--${state.kind}`} role={state.kind === "error" ? "alert" : "status"}>{state.message}</p>}
      {canEdit && <button className="button button--secondary" type="submit" disabled={pending}>{pending ? "Saving…" : "Save challenge"}</button>}
    </form>
  );
}
