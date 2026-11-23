"use client";

import { useActionState, useEffect, useRef, useState, type FormEvent } from "react";

import { NoteCallout } from "@/components/dashboard/note-callout";
import { Icon } from "@/components/ui/icons";
import { showToast } from "@/components/ui/toast";
import type { WorkspaceDashboard } from "@/lib/data/dashboard";
import { initialActionState, type ActionState } from "@/lib/forms/state";
import { parseCheckinNote, serializeCheckinNote } from "@/lib/domain/checkin-note";
import { saveCheckinAction, undoCheckinAction } from "@/lib/workspace/actions";

type TodayCheckin = WorkspaceDashboard["todayCheckin"];
type CheckinSummary = Pick<NonNullable<TodayCheckin>, "accomplishment" | "next_plan" | "notes">;

export function CheckinEditor({ challengeId, checkin }: { challengeId: string; checkin: TodayCheckin }) {
  const [state, formAction, pending] = useActionState(saveCheckinAction, initialActionState);
  const pendingSummary = useRef<CheckinSummary | null>(null);
  const [saved, setSaved] = useState<CheckinSummary | null>(checkin ?? null);
  const [undoCheckinId, setUndoCheckinId] = useState<string | null>(null);
  const [editing, setEditing] = useState(!checkin);
  const [noteText, setNoteText] = useState(() => parseCheckinNote(checkin?.notes).text);
  const [isBlocker, setIsBlocker] = useState(() => parseCheckinNote(checkin?.notes).isBlocker);
  const [noteOpen, setNoteOpen] = useState(Boolean(checkin?.notes));
  const [undoState, undoAction, undoPending] = useActionState(async (previousState: ActionState, formData: FormData): Promise<ActionState> => {
    const result = await undoCheckinAction(previousState, formData);
    if (result.kind === "success") {
      setSaved(null);
      setEditing(true);
      setUndoCheckinId(null);
      setNoteText("");
      setIsBlocker(false);
      setNoteOpen(false);
      showToast(result.message);
      window.dispatchEvent(new Event("rally:checkin-undone"));
    }
    return result;
  }, initialActionState);

  useEffect(() => {
    if (state.kind === "success") {
      if (pendingSummary.current) setSaved(pendingSummary.current);
      pendingSummary.current = null;
      setEditing(false);
      setUndoCheckinId(state.checkinCreated && state.checkinId ? state.checkinId : null);
      showToast(state.message);
      window.dispatchEvent(new Event("rally:checkin-saved"));
    } else if (state.kind === "error") {
      pendingSummary.current = null;
    }
  }, [state]);

  useEffect(() => {
    if (!undoCheckinId) return;
    const timeout = window.setTimeout(() => setUndoCheckinId(null), 6000);
    return () => window.clearTimeout(timeout);
  }, [undoCheckinId]);

  const showingSavedResponse = state.kind === "success" && !saved && undoState.kind !== "success";

  function captureSubmission(event: FormEvent<HTMLFormElement>) {
    const form = new FormData(event.currentTarget);
    pendingSummary.current = {
      accomplishment: String(form.get("accomplishment") ?? ""),
      next_plan: String(form.get("nextPlan") ?? ""),
      notes: serializeCheckinNote(noteText, isBlocker),
    };
  }

  function cancelEditing() {
    const parsed = parseCheckinNote(saved?.notes);
    setNoteText(parsed.text);
    setIsBlocker(parsed.isBlocker);
    setNoteOpen(Boolean(parsed.text));
    setEditing(false);
  }

  if (saved && !editing) {
    return (
      <section className="checkin-done-summary">
        <div className="checkin-done-heading"><Icon name="check" size={20} /><strong>Done for today</strong>
          {undoCheckinId && <form action={undoAction} className="checkin-undo-form"><input type="hidden" name="checkinId" value={undoCheckinId} /><button className="button button--quiet" type="submit" disabled={undoPending}>Undo</button></form>}
          <button className="button button--quiet" type="button" onClick={() => setEditing(true)}>Edit</button>
        </div>
        {undoState.kind === "error" && undoState.message && <p className="form-message form-message--error" role="alert">{undoState.message}</p>}
        <div className="checkin-done-copy"><span>What moved forward</span><p>{saved.accomplishment}</p></div>
        <div className="checkin-done-copy"><span>What&apos;s next</span><p>{saved.next_plan}</p></div>
        {saved.notes && <NoteCallout note={saved.notes} />}
        {state.kind === "error" && state.message && <p className="form-message form-message--error" role="alert">{state.message}</p>}
      </section>
    );
  }

  return (
    <form action={formAction} className={`checkin-form${showingSavedResponse ? " is-saved" : ""}`} onSubmit={captureSubmission}>
      <input type="hidden" name="challengeId" value={challengeId} />
      <label className="field-label" htmlFor="accomplishment">
        What did you move forward today?
        <textarea className="field-textarea" id="accomplishment" name="accomplishment" maxLength={1200} rows={3} placeholder="A clear, honest note is enough." defaultValue={saved?.accomplishment ?? ""} required />
      </label>
      <label className="field-label" htmlFor="next-plan">
        What&apos;s next?
        <textarea className="field-textarea" id="next-plan" name="nextPlan" maxLength={1200} rows={2} placeholder="One next step." defaultValue={saved?.next_plan ?? ""} required />
      </label>
      <input type="hidden" name="notes" value={serializeCheckinNote(noteText, isBlocker)} />
      {!noteOpen ? (
        <button className="checkin-note-pill" type="button" onClick={() => setNoteOpen(true)}>
          <Icon name="plus" size={16} /> Add a note or blocker
        </button>
      ) : (
        <div className="checkin-note-editor">
          <label className="field-label" htmlFor="checkin-note-text">Note for the group
            <textarea className="field-textarea" id="checkin-note-text" maxLength={1191} rows={2} placeholder="Anything the group should know?" value={noteText} onChange={(event) => setNoteText(event.target.value)} />
          </label>
          <div className="checkin-note-tools">
            <button className={`chip-toggle${isBlocker ? " is-selected" : ""}`} type="button" aria-pressed={isBlocker} onClick={() => setIsBlocker((value) => !value)}>
              <Icon name="warning" size={15} /> Blocker
            </button>
            <button className="button button--quiet" type="button" onClick={() => { setNoteText(""); setIsBlocker(false); setNoteOpen(false); }}>Remove note</button>
          </div>
        </div>
      )}
      {state.kind === "error" && state.message && <p className="form-message form-message--error" role="alert">{state.message}</p>}
      <div className="checkin-submit-row">
        {saved && <button className="button button--quiet" type="button" onClick={cancelEditing}>Cancel</button>}
        <button className={`button button--primary${state.kind === "success" && !saved ? " button--success" : ""}`} type="submit" disabled={pending}>
          {pending ? "Saving…" : saved ? "Update check-in" : showingSavedResponse ? "Saved for today" : "Save check-in"}
          <Icon name={showingSavedResponse ? "check" : "arrow"} size={17} />
        </button>
      </div>
    </form>
  );
}
