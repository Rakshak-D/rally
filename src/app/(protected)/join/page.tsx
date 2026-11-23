import type { Metadata } from "next";

import { InviteLinkEntry } from "@/components/workspace/invite-link-entry";

export const metadata: Metadata = { title: "Join a workspace", robots: { index: false, follow: false } };

export default function JoinWorkspacePage() {
  return (
    <div className="page-wrap join-workspace-page">
      <header className="page-heading">
        <h1>Join a workspace</h1>
        <p>Paste a private invite link from someone in your circle to join their Rally workspace.</p>
      </header>
      <section className="join-workspace-panel" aria-labelledby="join-workspace-title">
        <h2 id="join-workspace-title">Bring your progress together</h2>
        <p>Workspace details stay private until you accept a valid invitation.</p>
        <InviteLinkEntry />
      </section>
    </div>
  );
}
