"use client";

import Link from "next/link";
import { useActionState } from "react";

import { initialActionState } from "@/lib/forms/state";
import { signInAction } from "@/lib/auth/actions";

export function SignInForm({ next, notice }: { next: string; notice?: string }) {
  const [state, formAction, pending] = useActionState(signInAction, initialActionState);

  return (
    <form action={formAction} className="form-stack">
      {notice && <p className="form-message form-message--info" role="status">{notice}</p>}
      <input type="hidden" name="next" value={next} />
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
          autoComplete="current-password"
          maxLength={256}
          required
        />
      </label>
      <div className="form-row form-row--right">
        <Link className="text-link" href="/forgot-password">
          Forgot password?
        </Link>
      </div>
      {state.kind === "error" && <p className="form-message form-message--error" role="alert">{state.message}</p>}
      <button className="button button--primary button--full" type="submit" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
        <span aria-hidden="true">↗</span>
      </button>
      <p className="form-switch">
        New to Rally? <Link className="text-link" href={`/sign-up?next=${encodeURIComponent(next)}`}>Create an account</Link>
      </p>
    </form>
  );
}
