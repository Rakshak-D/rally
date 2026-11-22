"use client";

import Link from "next/link";
import type { FormEvent } from "react";
import { useActionState, useState } from "react";

import { requestPasswordResetAction } from "@/lib/auth/actions";
import { initialActionState } from "@/lib/forms/state";

export function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState(requestPasswordResetAction, initialActionState);
  const [localError, setLocalError] = useState<string | null>(null);

  function validate(event: FormEvent<HTMLFormElement>) {
    const email = event.currentTarget.elements.namedItem("email");
    if (!(email instanceof HTMLInputElement)) return;
    const message = !email.value.trim() ? "Enter your email address." : email.validity.typeMismatch ? "Enter a valid email address." : "";
    setLocalError(message);
    if (message) {
      event.preventDefault();
      email.focus();
    }
  }
  const emailError = localError ?? state.fieldErrors?.email;

  return (
    <form action={formAction} className="form-stack" noValidate onSubmit={validate}>
      <label className="field-label" htmlFor="email">
        Email address
        <input className="field-input" id="email" name="email" type="email" autoComplete="email" maxLength={254} aria-required="true" aria-invalid={emailError ? "true" : undefined} aria-describedby={emailError ? "recovery-email-error" : undefined} onChange={() => setLocalError("")} />
      </label>
      {emailError && <span className="field-error" id="recovery-email-error">{emailError}</span>}
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
