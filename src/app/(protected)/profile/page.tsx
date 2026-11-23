import Link from "next/link";
import type { Metadata } from "next";

import { AvatarUploader } from "@/components/profile/avatar-uploader";
import { requireUser } from "@/lib/auth/current-user";
import { getWorkspaceDashboard } from "@/lib/data/dashboard";
import { formatCalendarDate, localDateAt } from "@/lib/domain/calendar";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Profile" };

export default async function ProfilePage() {
  const user = await requireUser();
  const [data, supabase] = await Promise.all([
    getWorkspaceDashboard(user.id),
    createSupabaseServerClient(),
  ]);
  const [checkinsResult, workspacesResult] = await Promise.all([
    supabase.from("checkins").select("id", { count: "exact", head: true }).eq("user_id", user.id),
    supabase.from("workspace_members").select("workspace_id", { count: "exact", head: true }).eq("user_id", user.id),
  ]);
  if (checkinsResult.error || workspacesResult.error) {
    throw new Error("Your profile summary could not be loaded.");
  }

  const profile = data.profile;
  const displayName = profile?.display_name ?? user.email?.split("@")[0] ?? "Rally member";
  const progress = data.teamProgress.find((member) => member.userId === user.id);
  const memberSince = profile?.created_at
    ? formatCalendarDate(localDateAt(new Date(profile.created_at), "UTC"))
    : "Recently";

  return (
    <div className="page-wrap profile-page">
      <header className="page-heading">
        <h1>Your profile</h1>
        <p>Your face and focus, across every Rally workspace.</p>
      </header>

      <section className="profile-card" aria-labelledby="profile-name">
        <AvatarUploader userId={user.id} displayName={displayName} avatarPath={profile?.avatar_path ?? null} />
        <div className="profile-card-copy">
          <h2 id="profile-name">{displayName}</h2>
          {profile?.tagline && <p className="profile-tagline">{profile.tagline}</p>}
          <p className="profile-email">{user.email}</p>
          <p className="profile-since">Member since {memberSince}</p>
          <Link className="text-link" href="/settings?tab=profile">Edit name or tagline</Link>
        </div>
      </section>

      <dl className="profile-stats" aria-label="Your Rally progress">
        <div><dt>Current streak</dt><dd>{progress?.currentStreak ?? 0}<span>{progress?.currentStreak === 1 ? " day" : " days"}</span></dd></div>
        <div><dt>Longest streak</dt><dd>{progress?.longestStreak ?? 0}<span>{progress?.longestStreak === 1 ? " day" : " days"}</span></dd></div>
        <div><dt>Total check-ins</dt><dd>{checkinsResult.count ?? 0}</dd></div>
        <div><dt>Workspaces joined</dt><dd>{workspacesResult.count ?? 0}</dd></div>
      </dl>

      <footer className="profile-settings-footer">
        <span>Theme and password options live in Account settings.</span>
        <Link className="button button--secondary" href="/settings?tab=account">Account settings</Link>
      </footer>
    </div>
  );
}
