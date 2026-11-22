import type { Metadata } from "next";

import { AuthCard } from "@/components/auth/auth-card";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export const metadata: Metadata = { title: "Recover your password" };

export default function ForgotPasswordPage() {
  return (
    <AuthCard
      eyebrow="ACCOUNT ACCESS"
      title="Get back in."
      description="We'll send a recovery link to the email address on your Rally account."
    >
      <ForgotPasswordForm />
    </AuthCard>
  );
}
