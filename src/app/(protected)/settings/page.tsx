import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ThemeSelector } from "@/components/app/theme-selector";
import { ChallengeSettingsForm } from "@/components/settings/challenge-form";
import { CreateInviteForm, InviteList } from "@/components/settings/invite-forms";
import { MemberList } from "@/components/settings/member-actions";
import { OwnershipTransferForm } from "@/components/settings/ownership-transfer-form";
import { ProfileForm } from "@/components/settings/profile-form";
import { WorkspaceForm } from "@/components/settings/workspace-form";
import { CreateChallengeForm } from "@/components/workspace/create-challenge-form";
import { CreateWorkspaceForm } from "@/components/workspace/create-workspace-form";
import { signOutAction } from "@/lib/auth/actions";
import { requireUser } from "@/lib/auth/current-user";
import { getWorkspaceDashboard } from "@/lib/data/dashboard";
import { addCalendarDays, formatCalendarDate, localDateAt } from "@/lib/domain/calendar";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Settings" };

const settingsTabs = [
  { id: "profile", label: "Profile" },
  { id: "workspace", label: "Workspace" },
  { id: "people", label: "People" },
  { id: "challenges", label: "Challenges" },
  { id: "account", label: "Account" },
] as const;

type SettingsTab = (typeof settingsTabs)[number]["id"];

function parseTab(value: string | undefined): SettingsTab {
  return settingsTabs.some((tab) => tab.id === value) ? (value as SettingsTab) : "profile";
}

function tabHref(tab: SettingsTab, workspaceId: string | undefined): string {
  const params = new URLSearchParams({ tab });
  if (workspaceId) params.set("workspace", workspaceId);
  return `/settings?${params.toString()}`;
}

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ workspace?: string; tab?: string }>;
}) {
  const [user, params, supabase] = await Promise.all([
    requireUser(),
    searchParams,
    createSupabaseServerClient(),
  ]);
  const data = await getWorkspaceDashboard(user.id, params.workspace);
  if (data.invalidWorkspace) notFound();

  const activeTab = parseTab(params.tab);
  const workspace = data.selectedWorkspace;
  const isOwner = workspace?.role === "owner";
  const profileName = data.profile?.display_name ?? user.email?.split("@")[0] ?? "Rally member";
  const [challengeResult, inviteResult] = await Promise.all([
    workspace && activeTab === "challenges"
      ? supabase.from("challenge_status").select("*").eq("workspace_id", workspace.id).order("start_date", { ascending: false })
      : Promise.resolve({ data: null, error: null }),
    workspace && activeTab === "people" && isOwner
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
  const localToday = workspace ? localDateAt(new Date(), workspace.timezone) : null;
  const latestEnd = localToday
    ? challenges.reduce((latest, challenge) => challenge.end_date > latest ? challenge.end_date : latest, localToday)
    : null;
  const suggestedStart = latestEnd && localToday
    ? latestEnd >= localToday ? addCalendarDays(latestEnd, 1) ?? localToday : localToday
    : localToday ?? "";

  return (
    <div className="page-wrap settings-page settings-page--redesigned">
      <header className="page-heading settings-heading">
        <div>
          <h1>Settings</h1>
          <p>Manage your Rally profile and the spaces you share.</p>
        </div>
      </header>

      <nav className="settings-tabs" aria-label="Settings sections">
        {settingsTabs.map((tab) => (
          <Link
            key={tab.id}
            href={tabHref(tab.id, workspace?.id)}
            aria-current={activeTab === tab.id ? "page" : undefined}
            className={activeTab === tab.id ? "is-active" : undefined}
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      <section className="settings-tab-panel" aria-labelledby="settings-panel-heading">
        {activeTab === "profile" && (
          <>
            <header className="settings-panel-header">
              <div><h2 id="settings-panel-heading">Your profile</h2><p>How your teammates see you across Rally.</p></div>
            </header>
            <ProfileForm displayName={profileName} email={user.email ?? ""} tagline={data.profile?.tagline ?? ""} />
            <Link className="button button--secondary profile-settings-link" href="/profile">Manage your photo and profile</Link>
          </>
        )}

        {activeTab === "workspace" && (
          <>
            <header className="settings-panel-header">
              <div><h2 id="settings-panel-heading">Workspace</h2><p>Set the name and shared time zone for this group.</p></div>
              {workspace && <span className="role-chip">{workspace.role === "owner" ? "Owner" : "Member"}</span>}
            </header>
            {workspace ? isOwner ? (
              <WorkspaceForm workspaceId={workspace.id} name={workspace.name} timezone={workspace.timezone} />
            ) : (
              <div className="workspace-readonly">
                <p><strong>{workspace.name}</strong><span>{workspace.timezone}</span></p>
                <p className="quiet-copy">Only the workspace owner can change these details.</p>
              </div>
            ) : (
              <p className="quiet-copy settings-no-workspace">Choose a workspace or start your first one below.</p>
            )}
            <details className="workspace-create-details" id="new-workspace-heading">
              <summary>{workspace ? "Create another workspace" : "Create a workspace"}<span aria-hidden="true">＋</span></summary>
              <CreateWorkspaceForm />
            </details>
          </>
        )}

        {activeTab === "people" && (
          <>
            <header className="settings-panel-header">
              <div><h2 id="settings-panel-heading">People</h2><p>Manage membership and invite links for {workspace?.name ?? "your workspace"}.</p></div>
              {workspace && <span className="team-count">{data.workspaceMembers.length} members</span>}
            </header>
            {workspace ? (
              <>
                <section className="settings-subsection" aria-labelledby="members-heading">
                  <h3 id="members-heading">Workspace members</h3>
                  <MemberList members={data.workspaceMembers} roles={data.memberRoles} currentUserId={user.id} workspaceId={workspace.id} isOwner={isOwner} />
                  {isOwner && <div className="ownership-transfer"><h3>Change the owner</h3><OwnershipTransferForm workspaceId={workspace.id} currentUserId={user.id} members={data.workspaceMembers} /></div>}
                </section>
                {isOwner ? (
                  <section className="settings-subsection" aria-labelledby="invites-heading">
                    <h3 id="invites-heading">Invite people</h3>
                    <p className="quiet-copy invite-intro">Each link is private. Set how long it lasts and how many people can use it.</p>
                    <CreateInviteForm workspaceId={workspace.id} />
                    <div className="invite-history"><h3>Recent links</h3><InviteList invites={inviteResult?.data ?? []} now={new Date().toISOString()} /></div>
                  </section>
                ) : <p className="quiet-copy">Only the workspace owner can create or revoke invitations.</p>}
              </>
            ) : <p className="quiet-copy settings-no-workspace">Create or join a workspace to invite and manage people.</p>}
          </>
        )}

        {activeTab === "challenges" && (
          <>
            <header className="settings-panel-header">
              <div><h2 id="settings-panel-heading">Challenges</h2><p>Past, current, and upcoming commitments for {workspace?.name ?? "your workspace"}.</p></div>
              {workspace && <span className="team-count">{challenges.length}</span>}
            </header>
            {workspace ? (
              <>
                {challenges.length === 0 && <p className="quiet-copy">No challenges have been created yet.</p>}
                <div className="challenge-settings-list">
                  {challenges.map((challenge) => (
                    <details className="challenge-settings-item" key={challenge.id}>
                      <summary>
                        <span><strong>{challenge.title}</strong><small>{formatCalendarDate(challenge.start_date)} — {formatCalendarDate(challenge.end_date)}</small></span>
                        <span className={"status-chip status-chip--" + challenge.status}>{challenge.status === "completed" ? "Completed" : challenge.status === "upcoming" ? "Upcoming" : "Active"}</span>
                      </summary>
                      <ChallengeSettingsForm challenge={challenge} canEdit={isOwner} />
                    </details>
                  ))}
                </div>
                {isOwner && <details className="challenge-create-details"><summary>Start another challenge <span aria-hidden="true">＋</span></summary><div className="challenge-create-details-body"><CreateChallengeForm workspaceId={workspace.id} startDate={suggestedStart} /></div></details>}
              </>
            ) : <p className="quiet-copy settings-no-workspace">Create or join a workspace before starting a challenge.</p>}
          </>
        )}

        {activeTab === "account" && (
          <>
            <header className="settings-panel-header">
              <div><h2 id="settings-panel-heading">Account</h2><p>Choose how Rally looks and manage account access.</p></div>
            </header>
            <ThemeSelector />
            <div className="account-actions">
              <div><strong>Password</strong><span>Reset your password using your verified email address.</span></div>
              <Link className="button button--secondary" href="/forgot-password">Reset password</Link>
            </div>
            <form action={signOutAction} className="account-signout">
              <div><strong>Sign out</strong><span>End this session on this device.</span></div>
              <button className="button button--danger" type="submit">Sign out</button>
            </form>
          </>
        )}
      </section>
    </div>
  );
}
