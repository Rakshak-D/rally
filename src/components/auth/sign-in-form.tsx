"use client";

import Link from "next/link";
import type { FormEvent } from "react";
import { useActionState, useState } from "react";

import { Icon } from "@/components/ui/icons";
import { initialActionState } from "@/lib/forms/state";
import { resendSignupConfirmationAction, signInAction } from "@/lib/auth/actions";

export function SignInForm({ next, notice }: { next: string; notice?: string }) {
  const [state, formAction, pending] = useActionState(signInAction, initialActionState);
  const [localErrors, setLocalErrors] = useState<Record<string, string>>({});
  const errors = { ...state.fieldErrors, ...localErrors };

  function validate(event: FormEvent<HTMLFormElement>) {
    const form = event.currentTarget;
    const email = form.elements.namedItem("email");
    const password = form.elements.namedItem("password");
    if (!(email instanceof HTMLInputElement) || !(password instanceof HTMLInputElement)) return;
    const nextErrors: Record<string, string> = {};
    if (!email.value.trim()) nextErrors.email = "Enter your email address.";
    else if (email.validity.typeMismatch) nextErrors.email = "Enter a valid email address.";
    if (!password.value) nextErrors.password = "Enter your password.";
    setLocalErrors(nextErrors);
    const firstInvalid = nextErrors.email ? email : nextErrors.password ? password : null;
    if (firstInvalid) {
      event.preventDefault();
      firstInvalid.focus();
    }
  }

  return (
    <>
      <form action={formAction} className="form-stack" noValidate onSubmit={validate}>
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
          aria-required="true"
          aria-invalid={errors.email ? "true" : undefined}
          aria-describedby={errors.email ? "sign-in-email-error" : undefined}
          onChange={() => setLocalErrors((current) => ({ ...current, email: "" }))}
        />
      </label>
      {errors.email && <span className="field-error" id="sign-in-email-error">{errors.email}</span>}
      <label className="field-label" htmlFor="password">
        Password
        <input
          className="field-input"
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          maxLength={256}
          aria-required="true"
          aria-invalid={errors.password ? "true" : undefined}
          aria-describedby={errors.password ? "sign-in-password-error" : undefined}
          onChange={() => setLocalErrors((current) => ({ ...current, password: "" }))}
        />
      </label>
      {errors.password && <span className="field-error" id="sign-in-password-error">{errors.password}</span>}
      <div className="form-row form-row--right">
        <Link className="text-link" href="/forgot-password">
          Forgot password?
        </Link>
      </div>
      {state.message && <p className={`form-message form-message--${state.kind}`} role={state.kind === "error" ? "alert" : "status"}>{state.message}</p>}
      <button className="button button--primary button--full" type="submit" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
        <Icon name="arrow" size={18} />
      </button>
      <p className="form-switch">
        New to Rally? <Link className="text-link" href={`/sign-up?next=${encodeURIComponent(next)}`}>Create an account</Link>
      </p>
      </form>
      {state.email && <ResendConfirmationForm email={state.email} next={state.nextPath ?? next} />}
    </>
  );
}

function ResendConfirmationForm({ email, next }: { email: string; next: string }) {
  const [state, formAction, pending] = useActionState(resendSignupConfirmationAction, initialActionState);

  return (
    <form action={formAction} className="resend-confirmation-form">
      <input type="hidden" name="email" value={email} />
      <input type="hidden" name="next" value={next} />
      {state.message && <p className={`form-message form-message--${state.kind}`} role={state.kind === "error" ? "alert" : "status"}>{state.message}</p>}
      <button className="button button--secondary" type="submit" disabled={pending}>
        {pending ? "Requesting…" : "Resend confirmation email"}
      </button>
    </form>
  );
}
