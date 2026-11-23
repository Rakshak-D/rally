"use client";

import { useActionState } from "react";

import { useActionToast } from "@/components/ui/toast";
import { initialActionState } from "@/lib/forms/state";
import { updateProfileAction } from "@/lib/workspace/actions";

export function ProfileForm({ displayName, email, tagline }: { displayName: string; email: string; tagline: string }) {
  const [state, formAction, pending] = useActionState(updateProfileAction, initialActionState);
  useActionToast(state);

  return (
    <form action={formAction} className="settings-form">
      <label className="field-label" htmlFor="profile-display-name">
        Display name
        <input className="field-input" id="profile-display-name" name="displayName" type="text" autoComplete="name" maxLength={80} defaultValue={displayName} required />
      </label>
      <label className="field-label" htmlFor="profile-tagline">
        Short tagline <span className="field-hint-inline">Optional, up to 80 characters</span>
        <textarea className="field-textarea" id="profile-tagline" name="tagline" maxLength={80} rows={3} defaultValue={tagline} />
      </label>
      <label className="field-label" htmlFor="profile-email">
        Email address
        <input className="field-input field-input--readonly" id="profile-email" value={email} type="email" readOnly aria-describedby="email-note" />
        <span id="email-note" className="field-hint">Email changes are managed by your authentication provider.</span>
      </label>
      {state.kind === "error" && state.message && <p className="form-message form-message--error" role="alert">{state.message}</p>}
      <button className="button button--secondary" type="submit" disabled={pending}>{pending ? "Saving…" : "Save profile"}</button>
    </form>
  );
}
