"use client";

import { useActionState } from "react";

import { updatePasswordAction } from "@/lib/auth/actions";
import { initialActionState } from "@/lib/forms/state";

export function UpdatePasswordForm() {
  const [state, formAction, pending] = useActionState(updatePasswordAction, initialActionState);

  return (
    <form action={formAction} className="form-stack">
      <label className="field-label" htmlFor="password">
        New password
        <input className="field-input" id="password" name="password" type="password" autoComplete="new-password" minLength={12} maxLength={256} required />
      </label>
      <label className="field-label" htmlFor="confirmation">
        Confirm new password
        <input className="field-input" id="confirmation" name="confirmation" type="password" autoComplete="new-password" minLength={12} maxLength={256} required />
      </label>
      {state.message && <p className={`form-message form-message--${state.kind}`} role={state.kind === "error" ? "alert" : "status"}>{state.message}</p>}
      <button className="button button--primary button--full" type="submit" disabled={pending}>
        {pending ? "Updating…" : "Update password"}
      </button>
    </form>
  );
}
