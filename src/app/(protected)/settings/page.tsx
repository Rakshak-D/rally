import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ChallengeSettingsForm } from "@/components/settings/challenge-form";
import { CreateInviteForm, InviteList } from "@/components/settings/invite-forms";
import { CreateChallengeForm } from "@/components/workspace/create-challenge-form";
import { CreateWorkspaceForm } from "@/components/workspace/create-workspace-form";
import { MemberList } from "@/components/settings/member-actions";
import { OwnershipTransferForm } from "@/components/settings/ownership-transfer-form";
import { ProfileForm } from "@/components/settings/profile-form";
import { WorkspaceForm } from "@/components/settings/workspace-form";
import { requireUser } from "@/lib/auth/current-user";
import { getWorkspaceDashboard } from "@/lib/data/dashboard";
import { addCalendarDays, localDateAt } from "@/lib/domain/calendar";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ workspace?: string }>;
}) {
  const [user, params, supabase] = await Promise.all([requireUser(), searchParams, createSupabaseServerClient()]);
  const data = await getWorkspaceDashboard(user.id, params.workspace);
  if (data.invalidWorkspace) notFound();
  const profileName = data.profile?.display_name ?? user.email?.split("@")[0] ?? "Rally member";

  if (!data.selectedWorkspace) {
    return (
      <section className="empty-state settings-empty">
        <p className="eyebrow">ACCOUNT SETTINGS</p>
        <h2>Your profile, {profileName}.</h2>
        <p>Create or join a workspace to manage shared settings. Start a workspace from Today.</p>
      </section>
    );
  }

  const workspace = data.selectedWorkspace;
  const isOwner = workspace.role === "owner";
  const [challengeResult, inviteResult] = await Promise.all([
    supabase.from("challenge_status").select("*").eq("workspace_id", workspace.id).order("start_date", { ascending: false }),
    isOwner
      ? supabase.from("workspace_invites")
        .select("id, expires_at, revoked_at, max_uses, use_count, created_at")
        .eq("workspace_id", workspace.id)
        .order("created_at", { ascending: false })
        .limit(20)
      : Promise.resolve(null),
  ]);

  if (challengeResult.error) throw new Error("Challenges could not be loaded.");
  if (inviteResult?.error) throw new Error("Workspace invitations could not be loaded.");
  const challenges = challengeResult.data ?? [];
  const localToday = localDateAt(new Date(), workspace.timezone);
  const latestEnd = challenges.reduce((latest, challenge) => challenge.end_date > latest ? challenge.end_date : latest, localToday);
  const suggestedStart = latestEnd >= localToday ? addCalendarDays(latestEnd, 1) ?? localToday : localToday;

  return (
    <div className="page-wrap settings-page">
      <header className="page-heading">
        <p className="eyebrow">ACCOUNT & WORKSPACE</p>
        <h1>Settings.</h1>
        <p>Keep your profile, people, and challenge details current.</p>
      </header>

      <div className="settings-grid">
        <div className="settings-main-column">
          <section className="settings-panel" aria-labelledby="profile-settings-heading">
            <header className="settings-panel-header"><div><p className="eyebrow">01 · ACCOUNT</p><h2 id="profile-settings-heading">Your profile</h2></div></header>
            <ProfileForm displayName={profileName} email={user.email ?? ""} />
          </section>

          <section className="settings-panel" aria-labelledby="workspace-settings-heading">
            <header className="settings-panel-header"><div><p className="eyebrow">02 · WORKSPACE</p><h2 id="workspace-settings-heading">{workspace.name}</h2></div><span className="role-chip">{workspace.role}</span></header>
            {isOwner ? (
              <WorkspaceForm workspaceId={workspace.id} name={workspace.name} timezone={workspace.timezone} />
            ) : (
              <div className="workspace-readonly"><p><strong>Timezone</strong><span>{workspace.timezone}</span></p><p className="quiet-copy">Only the owner can change workspace details.</p></div>
            )}
          </section>

          <section className="settings-panel" aria-labelledby="challenge-settings-heading">
            <header className="settings-panel-header"><div><p className="eyebrow">03 · CHALLENGES</p><h2 id="challenge-settings-heading">Challenge history</h2></div><span className="team-count">{challenges.length}</span></header>
            {challenges.length === 0 && <p className="quiet-copy">No challenges have been created yet.</p>}
            <div className="challenge-settings-list">
              {challenges.map((challenge) => (
                <details className="challenge-settings-item" key={challenge.id}>
                  <summary>
                    <span><strong>{challenge.title}</strong><small>{challenge.start_date} — {challenge.end_date}</small></span>
                    <span className={`status-chip status-chip--${challenge.status}`}>{challenge.status === "completed" ? "Completed" : challenge.status === "upcoming" ? "Upcoming" : "Active"}</span>
                  </summary>
                  <ChallengeSettingsForm challenge={challenge} canEdit={isOwner} />
                </details>
              ))}
            </div>
            {isOwner && (
              <details className="challenge-create-details">
                <summary>Start another challenge <span aria-hidden="true">＋</span></summary>
                <div className="challenge-create-details-body"><CreateChallengeForm workspaceId={workspace.id} startDate={suggestedStart} /></div>
              </details>
            )}
          </section>
        </div>

        <aside className="settings-side-column">
          <section className="settings-panel" aria-labelledby="members-heading">
            <header className="settings-panel-header"><div><p className="eyebrow">04 · PEOPLE</p><h2 id="members-heading">Workspace members</h2></div><span className="team-count">{data.workspaceMembers.length}</span></header>
            <MemberList members={data.workspaceMembers} roles={data.memberRoles} currentUserId={user.id} workspaceId={workspace.id} isOwner={isOwner} />
            {isOwner && <div className="ownership-transfer"><h3>Change the owner</h3><OwnershipTransferForm workspaceId={workspace.id} currentUserId={user.id} members={data.workspaceMembers} /></div>}
          </section>

          {isOwner && (
            <section className="settings-panel" aria-labelledby="invites-heading">
              <header className="settings-panel-header"><div><p className="eyebrow">05 · INVITATIONS</p><h2 id="invites-heading">Bring someone in.</h2></div></header>
              <p className="quiet-copy invite-intro">Each link is private. Set how long it lasts and how many people can use it.</p>
              <CreateInviteForm workspaceId={workspace.id} />
              <div className="invite-history"><h3>Recent links</h3><InviteList invites={inviteResult?.data ?? []} now={new Date().toISOString()} /></div>
            </section>
          )}

          <section className="settings-panel" aria-labelledby="new-workspace-heading">
            <header className="settings-panel-header"><div><p className="eyebrow">06 · YOUR SPACES</p><h2 id="new-workspace-heading">Create another workspace.</h2></div></header>
            <details className="workspace-create-details">
              <summary>New workspace <span aria-hidden="true">＋</span></summary>
              <CreateWorkspaceForm />
            </details>
          </section>
        </aside>
      </div>
    </div>
  );
}
