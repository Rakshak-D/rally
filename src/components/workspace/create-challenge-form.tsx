"use client";

import { useActionState } from "react";

import { addCalendarDays } from "@/lib/domain/calendar";
import { initialActionState } from "@/lib/forms/state";
import { createChallengeAction } from "@/lib/workspace/actions";

export function CreateChallengeForm({ workspaceId, startDate }: { workspaceId: string; startDate: string }) {
  const [state, formAction, pending] = useActionState(createChallengeAction, initialActionState);
  const suggestedEnd = addCalendarDays(startDate, 59) ?? startDate;

  return (
    <form action={formAction} className="form-stack challenge-form">
      <input type="hidden" name="workspaceId" value={workspaceId} />
      <label className="field-label" htmlFor="challenge-title">
        Challenge name
        <input className="field-input" id="challenge-title" name="title" type="text" maxLength={100} placeholder="Steady practice" required />
      </label>
      <label className="field-label" htmlFor="challenge-description">
        Description <span className="field-optional">OPTIONAL</span>
        <textarea className="field-textarea" id="challenge-description" name="description" maxLength={1200} rows={3} placeholder="What are we showing up for?" />
      </label>
      <div className="date-fields">
        <label className="field-label" htmlFor="challenge-start">
          Start date
          <input className="field-input" id="challenge-start" name="startDate" type="date" defaultValue={startDate} required />
        </label>
        <label className="field-label" htmlFor="challenge-end">
          End date <span className="field-hint">Inclusive</span>
          <input className="field-input" id="challenge-end" name="endDate" type="date" defaultValue={suggestedEnd} required />
        </label>
      </div>
      <p className="suggestion-note"><span className="suggestion-mark" aria-hidden="true">60</span> days is a starting suggestion. Choose any date range.</p>
      {state.kind === "error" && <p className="form-message form-message--error" role="alert">{state.message}</p>}
      <button className="button button--primary" type="submit" disabled={pending}>
        {pending ? "Starting…" : "Start challenge"}
        <span aria-hidden="true">↗</span>
      </button>
    </form>
  );
}
