"use client";

import Link from "next/link";
import { useActionState } from "react";

import { initialActionState } from "@/lib/forms/state";
import { signUpAction } from "@/lib/auth/actions";

export function SignUpForm({ next }: { next: string }) {
  const [state, formAction, pending] = useActionState(signUpAction, initialActionState);

  return (
    <form action={formAction} className="form-stack">
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
          required
        />
      </label>
      <label className="field-label" htmlFor="email">
        Email address
        <input
          className="field-input"
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          maxLength={254}
          required
        />
      </label>
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
          required
        />
        <span className="field-hint">Use 12 characters or more.</span>
      </label>
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
