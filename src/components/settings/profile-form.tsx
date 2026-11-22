"use client";

import { useActionState } from "react";

import { initialActionState } from "@/lib/forms/state";
import { updateProfileAction } from "@/lib/workspace/actions";

export function ProfileForm({ displayName, email }: { displayName: string; email: string }) {
  const [state, formAction, pending] = useActionState(updateProfileAction, initialActionState);

  return (
    <form action={formAction} className="settings-form">
      <label className="field-label" htmlFor="profile-display-name">
        Display name
        <input className="field-input" id="profile-display-name" name="displayName" type="text" autoComplete="name" maxLength={80} defaultValue={displayName} required />
      </label>
      <label className="field-label" htmlFor="profile-email">
        Email address
        <input className="field-input field-input--readonly" id="profile-email" value={email} type="email" readOnly aria-describedby="email-note" />
        <span id="email-note" className="field-hint">Email changes are managed by your authentication provider.</span>
      </label>
      {state.message && <p className={`form-message form-message--${state.kind}`} role={state.kind === "error" ? "alert" : "status"}>{state.message}</p>}
      <button className="button button--secondary" type="submit" disabled={pending}>{pending ? "Saving…" : "Save profile"}</button>
    </form>
  );
}
