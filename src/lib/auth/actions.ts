"use server";

import { redirect } from "next/navigation";

import { getSiteUrl, safeInternalPath } from "@/lib/config";
import { validationFailure, type ActionState } from "@/lib/forms/state";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { emailSchemaForRecovery, signInSchema, signUpSchema } from "@/lib/validation/auth";

function authCallbackUrl(next: string): string {
  const callback = new URL("/auth/callback", getSiteUrl());
  callback.searchParams.set("next", safeInternalPath(next));
  return callback.toString();
}

export async function signInAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return validationFailure("Review the email and password fields.", parsed.error.issues);

  const next = safeInternalPath(String(formData.get("next") ?? "/app"));
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    return {
      kind: "error",
      message: "That email and password combination could not be verified. If you still need a confirmation email, request one below.",
      email: parsed.data.email,
      nextPath: next,
    };
  }

  redirect(next);
}

export async function signUpAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = signUpSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    displayName: formData.get("displayName"),
  });
  if (!parsed.success) {
    return validationFailure("Review your name, email, and password.", parsed.error.issues);
  }

  const supabase = await createSupabaseServerClient();
  const next = safeInternalPath(String(formData.get("next") ?? "/app"));
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { display_name: parsed.data.displayName },
      emailRedirectTo: authCallbackUrl(next),
    },
  });

  if (error) {
    return { kind: "error", message: "Account creation is temporarily unavailable. Please try again." };
  }

  return {
    kind: "success",
    message: "Check your email for a confirmation link. If the address is registered, a link will arrive shortly.",
  };
}

export async function requestPasswordResetAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = emailSchemaForRecovery.safeParse({ email: formData.get("email") });
  if (!parsed.success) return validationFailure("Enter a valid email address.", parsed.error.issues);

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: authCallbackUrl("/auth/reset-password"),
  });

  if (error) {
    return { kind: "error", message: "We could not send a recovery link right now. Please try again." };
  }

  return {
    kind: "success",
    message: "If an account uses that address, a password recovery link will arrive shortly.",
  };
}

export async function resendSignupConfirmationAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = emailSchemaForRecovery.safeParse({ email: formData.get("email") });
  if (!parsed.success) return validationFailure("Enter a valid email address.", parsed.error.issues);

  const next = safeInternalPath(String(formData.get("next") ?? "/app"));
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email: parsed.data.email,
    options: { emailRedirectTo: authCallbackUrl(next) },
  });

  if (error?.status === 429) {
    return {
      kind: "error",
      message: "Please wait a few minutes before requesting another confirmation email.",
      email: parsed.data.email,
      nextPath: next,
    };
  }

  return {
    kind: "success",
    message: "If this address still needs signup confirmation, a new link will arrive shortly.",
    email: parsed.data.email,
    nextPath: next,
  };
}

export async function updatePasswordAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const password = formData.get("password");
  const confirmation = formData.get("confirmation");

  if (typeof password !== "string" || password.length < 12 || password.length > 256) {
    return { kind: "error", message: "Use a password between 12 and 256 characters." };
  }
  if (password !== confirmation) return { kind: "error", message: "The passwords do not match." };

  const supabase = await createSupabaseServerClient();
  const { data, error: userError } = await supabase.auth.getUser();
  if (userError || !data.user) return { kind: "error", message: "This recovery link is no longer valid. Request a new one." };

  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { kind: "error", message: "The password could not be updated. Request a new link and try again." };

  redirect("/app");
}

export async function signOutAction(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/sign-in");
}
