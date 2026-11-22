"use client";

import { useActionState, useRef, useState } from "react";

import { createInviteAction, revokeInviteAction } from "@/lib/workspace/actions";
import { initialActionState } from "@/lib/forms/state";
import type { Tables } from "@/lib/supabase/database.types";

type Invite = Pick<Tables<"workspace_invites">, "id" | "expires_at" | "revoked_at" | "max_uses" | "use_count" | "created_at">;

export function CreateInviteForm({ workspaceId }: { workspaceId: string }) {
  const [state, formAction, pending] = useActionState(createInviteAction, initialActionState);

  return (
    <form action={formAction} className="settings-form">
      <input type="hidden" name="workspaceId" value={workspaceId} />
      <div className="date-fields">
        <label className="field-label" htmlFor="invite-expiry">Expires in
          <select className="field-select" id="invite-expiry" name="expiresInDays" defaultValue="7">
            <option value="1">1 day</option><option value="7">7 days</option><option value="14">14 days</option><option value="30">30 days</option>
          </select>
        </label>
        <label className="field-label" htmlFor="invite-use-limit">Maximum uses
          <select className="field-select" id="invite-use-limit" name="maxUses" defaultValue="1">
            <option value="1">One person</option><option value="5">5 people</option><option value="10">10 people</option><option value="25">25 people</option>
          </select>
        </label>
      </div>
      {state.message && <p className={`form-message form-message--${state.kind}`} role={state.kind === "error" ? "alert" : "status"}>{state.message}</p>}
      {state.link && <CopyInviteLink link={state.link} />}
      <button className="button button--primary" type="submit" disabled={pending}>{pending ? "Creating…" : "Create invite link"}</button>
    </form>
  );
}

function CopyInviteLink({ link }: { link: string }) {
  const [status, setStatus] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(link);
      setStatus("Copied to clipboard.");
    } catch {
      setStatus("Select the link and copy it.");
      inputRef.current?.select();
    }
  }

  return (
    <div className="invite-link-result">
      <label className="field-label" htmlFor="created-invite-link">Private invite link
        <input ref={inputRef} className="field-input" id="created-invite-link" type="text" value={link} readOnly onFocus={(event) => event.currentTarget.select()} />
      </label>
      <button className="button button--secondary" type="button" onClick={copyLink}>Copy link</button>
      <span className="field-hint" role="status">{status}</span>
    </div>
  );
}

export function InviteList({ invites, now }: { invites: Invite[]; now: string }) {
  if (invites.length === 0) return <p className="quiet-copy">No invitation links yet. Create one when you are ready to invite someone.</p>;

  return (
    <ul className="invite-list">
      {invites.map((invite) => <InviteItem invite={invite} now={now} key={invite.id} />)}
    </ul>
  );
}

function InviteItem({ invite, now }: { invite: Invite; now: string }) {
  const [state, formAction, pending] = useActionState(revokeInviteAction, initialActionState);
  const expired = Date.parse(invite.expires_at) <= Date.parse(now);
  const usedUp = invite.use_count >= invite.max_uses;
  const status = invite.revoked_at ? "Revoked" : expired ? "Expired" : usedUp ? "Used up" : "Available";
  const active = status === "Available";

  return (
    <li className="invite-row">
      <div>
        <strong>{status}</strong>
        <span>{invite.use_count} of {invite.max_uses} uses · created {formatInviteExpiry(invite.created_at)} · expires {formatInviteExpiry(invite.expires_at)}</span>
        {state.message && <small className="invite-state" role={state.kind === "error" ? "alert" : "status"}>{state.message}</small>}
      </div>
      {active && (
        <form action={formAction} onSubmit={(event) => { if (!window.confirm("Revoke this invitation? Anyone who has the link will no longer be able to join.")) event.preventDefault(); }}>
          <input type="hidden" name="inviteId" value={invite.id} />
          <button className="button button--quiet" type="submit" disabled={pending}>{pending ? "Revoking…" : "Revoke"}</button>
        </form>
      )}
    </li>
  );
}

function formatInviteExpiry(value: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value));
}
