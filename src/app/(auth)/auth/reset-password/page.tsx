import type { Metadata } from "next";

import { AuthCard } from "@/components/auth/auth-card";
import { UpdatePasswordForm } from "@/components/auth/update-password-form";
import { requireUser } from "@/lib/auth/current-user";

export const metadata: Metadata = { title: "Set a new password" };

export default async function ResetPasswordPage() {
  await requireUser();

  return (
    <AuthCard
      eyebrow="Account access"
      title="Choose a new password."
      description="Make it long and unique. You can sign in with it right away."
    >
      <UpdatePasswordForm />
    </AuthCard>
  );
}
