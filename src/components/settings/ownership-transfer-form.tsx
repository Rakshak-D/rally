"use client";

import { useActionState } from "react";

import { initialActionState } from "@/lib/forms/state";
import { transferWorkspaceOwnershipAction } from "@/lib/workspace/actions";

export function OwnershipTransferForm({
  workspaceId,
  currentUserId,
  members,
}: {
  workspaceId: string;
  currentUserId: string;
  members: Array<{ id: string; display_name: string }>;
}) {
  const [state, formAction, pending] = useActionState(transferWorkspaceOwnershipAction, initialActionState);
  const candidates = members.filter((member) => member.id !== currentUserId);
  if (!candidates.length) return <p className="quiet-copy">Invite another member before handing over ownership.</p>;

  return (
    <form
      action={formAction}
      className="ownership-transfer-form"
      onSubmit={(event) => {
        if (!window.confirm("Transfer workspace ownership? You will become a member and the selected person will gain owner controls.")) event.preventDefault();
      }}
    >
      <input type="hidden" name="workspaceId" value={workspaceId} />
      <label className="field-label" htmlFor="new-workspace-owner">New owner
        <select className="field-select" id="new-workspace-owner" name="newOwnerId" defaultValue="">
          <option value="" disabled>Choose a member</option>
          {candidates.map((member) => <option key={member.id} value={member.id}>{member.display_name}</option>)}
        </select>
      </label>
      {state.fieldErrors?.newOwnerId && <span className="field-error">{state.fieldErrors.newOwnerId}</span>}
      {state.message && <p className={`form-message form-message--${state.kind}`} role={state.kind === "error" ? "alert" : "status"}>{state.message}</p>}
      <p className="quiet-copy">You will keep your membership. Ownership can be transferred again later.</p>
      <button className="button button--secondary" type="submit" disabled={pending}>{pending ? "Transferring…" : "Transfer ownership"}</button>
    </form>
  );
}
