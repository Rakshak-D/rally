"use client";

import { useActionState } from "react";

import type { WorkspaceDashboard } from "@/lib/data/dashboard";
import { initialActionState } from "@/lib/forms/state";
import { saveCheckinAction } from "@/lib/workspace/actions";

type TodayCheckin = WorkspaceDashboard["todayCheckin"];

export function CheckinEditor({ challengeId, checkin }: { challengeId: string; checkin: TodayCheckin }) {
  const [state, formAction, pending] = useActionState(saveCheckinAction, initialActionState);

  return (
    <form action={formAction} className="checkin-form">
      <input type="hidden" name="challengeId" value={challengeId} />
      <label className="field-label" htmlFor="accomplishment">
        What I accomplished
        <textarea className="field-textarea" id="accomplishment" name="accomplishment" maxLength={1200} rows={3} placeholder="A clear, honest note is enough." defaultValue={checkin?.accomplishment ?? ""} required />
      </label>
      <div className="checkin-form-bottom">
        <label className="field-label" htmlFor="next-plan">
          What I plan to do next
          <textarea className="field-textarea" id="next-plan" name="nextPlan" maxLength={1200} rows={2} placeholder="One next step." defaultValue={checkin?.next_plan ?? ""} required />
        </label>
        <label className="field-label" htmlFor="checkin-notes">
          Blockers or notes <span className="field-optional">OPTIONAL</span>
          <textarea className="field-textarea" id="checkin-notes" name="notes" maxLength={1200} rows={2} placeholder="Anything the group should know?" defaultValue={checkin?.notes ?? ""} />
        </label>
      </div>
      {state.message && <p className={`form-message form-message--${state.kind}`} role={state.kind === "error" ? "alert" : "status"}>{state.message}</p>}
      <div className="form-row checkin-submit-row">
        <span className="field-hint">Only you can edit today&apos;s entry. Past days lock at midnight.</span>
        <button className="button button--primary" type="submit" disabled={pending}>
          {pending ? "Saving…" : checkin ? "Update check-in" : "Save check-in"}
          <span aria-hidden="true">↗</span>
        </button>
      </div>
    </form>
  );
}
