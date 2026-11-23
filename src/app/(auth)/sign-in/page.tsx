import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AuthCard } from "@/components/auth/auth-card";
import { SignInForm } from "@/components/auth/sign-in-form";
import { getCurrentUser } from "@/lib/auth/current-user";
import { safeInternalPath } from "@/lib/config";

export const metadata: Metadata = { title: "Sign in" };

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; status?: string }>;
}) {
  const [params, user] = await Promise.all([searchParams, getCurrentUser()]);
  const next = safeInternalPath(params.next ?? null);
  if (user) redirect(next);

  const notice = params.status === "link-expired"
    ? "That confirmation or recovery link has expired. Request a new one to continue."
    : params.status === "link-invalid"
      ? "That link is invalid. Sign in or request a fresh link."
      : undefined;

  return (
    <AuthCard
      eyebrow="Your circle, in motion"
      title="Pick up where you left off."
      description="Sign in to see today's progress and keep your plans moving."
    >
      <SignInForm next={next} notice={notice} />
    </AuthCard>
  );
}
