import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AuthCard } from "@/components/auth/auth-card";
import { SignUpForm } from "@/components/auth/sign-up-form";
import { getCurrentUser } from "@/lib/auth/current-user";
import { safeInternalPath } from "@/lib/config";

export const metadata: Metadata = { title: "Create your account" };

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const [params, user] = await Promise.all([searchParams, getCurrentUser()]);
  const next = safeInternalPath(params.next ?? null);
  if (user) redirect(next);

  return (
    <AuthCard
      eyebrow="A GOOD PLACE TO BEGIN"
      title="Make progress visible."
      description="Start your account, find your people, and build a record of showing up."
    >
      <SignUpForm next={next} />
    </AuthCard>
  );
}
