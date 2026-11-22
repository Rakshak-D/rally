"use client";

import Link from "next/link";
import type { FormEvent } from "react";
import { useActionState, useState } from "react";

import { initialActionState } from "@/lib/forms/state";
import { signUpAction } from "@/lib/auth/actions";

export function SignUpForm({ next }: { next: string }) {
  const [state, formAction, pending] = useActionState(signUpAction, initialActionState);
  const [localErrors, setLocalErrors] = useState<Record<string, string>>({});
  const errors = { ...state.fieldErrors, ...localErrors };

  function validate(event: FormEvent<HTMLFormElement>) {
    const form = event.currentTarget;
    const name = form.elements.namedItem("displayName");
    const email = form.elements.namedItem("email");
    const password = form.elements.namedItem("password");
    if (!(name instanceof HTMLInputElement) || !(email instanceof HTMLInputElement) || !(password instanceof HTMLInputElement)) return;
    const nextErrors: Record<string, string> = {};
    if (!name.value.trim()) nextErrors.displayName = "Enter your name.";
    else if (name.value.trim().length > 80) nextErrors.displayName = "Keep your name to 80 characters or fewer.";
    if (!email.value.trim()) nextErrors.email = "Enter your email address.";
    else if (email.validity.typeMismatch) nextErrors.email = "Enter a valid email address.";
    if (password.value.length < 12) nextErrors.password = "Use at least 12 characters.";
    else if (password.value.length > 256) nextErrors.password = "Keep the password to 256 characters or fewer.";
    setLocalErrors(nextErrors);
    const firstInvalid = nextErrors.displayName ? name : nextErrors.email ? email : nextErrors.password ? password : null;
    if (firstInvalid) {
      event.preventDefault();
      firstInvalid.focus();
    }
  }

  return (
    <form action={formAction} className="form-stack" noValidate onSubmit={validate}>
      <input type="hidden" name="next" value={next} />
      <label className="field-label" htmlFor="displayName">
        Your name
        <input
          className="field-input"
          id="displayName"
          name="displayName"
          type="text"
          autoComplete="name"
          minLength={1}
          maxLength={80}
          aria-required="true"
          aria-invalid={errors.displayName ? "true" : undefined}
          aria-describedby={errors.displayName ? "sign-up-name-error" : undefined}
          onChange={() => setLocalErrors((current) => ({ ...current, displayName: "" }))}
        />
      </label>
      {errors.displayName && <span className="field-error" id="sign-up-name-error">{errors.displayName}</span>}
      <label className="field-label" htmlFor="email">
        Email address
        <input
          className="field-input"
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          maxLength={254}
          aria-required="true"
          aria-invalid={errors.email ? "true" : undefined}
          aria-describedby={errors.email ? "sign-up-email-error" : undefined}
          onChange={() => setLocalErrors((current) => ({ ...current, email: "" }))}
        />
      </label>
      {errors.email && <span className="field-error" id="sign-up-email-error">{errors.email}</span>}
      <label className="field-label" htmlFor="password">
        Password
        <input
          className="field-input"
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={12}
          maxLength={256}
          aria-required="true"
          aria-invalid={errors.password ? "true" : undefined}
          aria-describedby={errors.password ? "sign-up-password-error" : undefined}
          onChange={() => setLocalErrors((current) => ({ ...current, password: "" }))}
        />
        <span className="field-hint">Use 12 characters or more.</span>
      </label>
      {errors.password && <span className="field-error" id="sign-up-password-error">{errors.password}</span>}
      {state.message && (
        <p className={`form-message form-message--${state.kind}`} role={state.kind === "error" ? "alert" : "status"}>
          {state.message}
        </p>
      )}
      <button className="button button--primary button--full" type="submit" disabled={pending}>
        {pending ? "Creating account…" : "Create account"}
        <span aria-hidden="true">↗</span>
      </button>
      <p className="form-switch">
        Already have an account? <Link className="text-link" href={`/sign-in?next=${encodeURIComponent(next)}`}>Sign in</Link>
      </p>
    </form>
  );
}
