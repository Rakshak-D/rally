"use client";

import Link from "next/link";
import { useActionState } from "react";

import { requestPasswordResetAction } from "@/lib/auth/actions";
import { initialActionState } from "@/lib/forms/state";

export function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState(requestPasswordResetAction, initialActionState);

  return (
    <form action={formAction} className="form-stack">
      <label className="field-label" htmlFor="email">
        Email address
        <input className="field-input" id="email" name="email" type="email" autoComplete="email" maxLength={254} required />
      </label>
      {state.message && (
        <p className={`form-message form-message--${state.kind}`} role={state.kind === "error" ? "alert" : "status"}>
          {state.message}
        </p>
      )}
      <button className="button button--primary button--full" type="submit" disabled={pending}>
        {pending ? "Sending…" : "Send recovery link"}
      </button>
      <p className="form-switch"><Link className="text-link" href="/sign-in">Back to sign in</Link></p>
    </form>
  );
}
