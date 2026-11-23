import type { Metadata } from "next";
import Link from "next/link";

import { Icon } from "@/components/ui/icons";
import { AuthCard } from "@/components/auth/auth-card";
import { RedeemInviteButton } from "@/components/workspace/redeem-invite-button";
import { getCurrentUser } from "@/lib/auth/current-user";
import { inviteTokenSchema } from "@/lib/validation/workspace";

export const metadata: Metadata = {
  title: "Workspace invitation",
  robots: { index: false, follow: false, noarchive: true },
  referrer: "no-referrer",
};

export default async function JoinInvitePage({ params }: { params: Promise<{ token: string }> }) {
  const [{ token }, user] = await Promise.all([params, getCurrentUser()]);
  const validToken = inviteTokenSchema.safeParse(token.toLowerCase()).success;

  if (!validToken) {
    return (
      <AuthCard eyebrow="Private invitation" title="This link is unavailable." description="Ask the workspace owner to share a fresh invitation link.">
        <p className="form-message form-message--info">Rally keeps workspace details private until an invitation is accepted.</p>
      </AuthCard>
    );
  }

  if (!user) {
    const next = `/join/${encodeURIComponent(token)}`;
    return (
      <AuthCard eyebrow="Private invitation" title="You have a Rally invite." description="Sign in or create an account to accept it. The workspace stays private until you join.">
        <div className="auth-link-list">
          <Link className="button button--primary" href={`/sign-in?next=${encodeURIComponent(next)}`}>Sign in <Icon name="arrow" size={18} /></Link>
          <Link className="button button--secondary" href={`/sign-up?next=${encodeURIComponent(next)}`}>Create account</Link>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard eyebrow="Private invitation" title="Ready to join?" description="Accept the invitation to add this workspace to your Rally account.">
      <RedeemInviteButton token={token.toLowerCase()} />
      <p className="field-hint invite-private-note">Workspace details stay private until the invitation is accepted.</p>
    </AuthCard>
  );
}
