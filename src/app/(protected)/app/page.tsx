import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";

import { ActivitySection } from "@/components/dashboard/activity-section";
import { CheckinSection } from "@/components/dashboard/checkin-section";
import { DashboardRail } from "@/components/dashboard/dashboard-rail";
import { FirstRunHelper } from "@/components/dashboard/first-run-helper";
import { StreakRing } from "@/components/dashboard/streak-ring";
import { TeamSection } from "@/components/dashboard/team-section";
import { CreateChallengeForm } from "@/components/workspace/create-challenge-form";
import { CreateWorkspaceForm } from "@/components/workspace/create-workspace-form";
import { requireUser } from "@/lib/auth/current-user";
import { getWorkspaceDashboard } from "@/lib/data/dashboard";
import { calendarDateOrdinal, inclusiveChallengeDay, localDateAt } from "@/lib/domain/calendar";
import { greetingForUser } from "@/lib/domain/today";

export const metadata: Metadata = { title: "Today" };

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ workspace?: string }>;
}) {
  const [user, params] = await Promise.all([requireUser(), searchParams]);
  const data = await getWorkspaceDashboard(user.id, params.workspace);
  if (data.invalidWorkspace) notFound();
  const now = new Date();
  const displayName = data.profile?.display_name || user.email?.split("@")[0] || "Rally member";

  if (data.workspaces.length === 0) {
    return (
      <section className="onboarding-wrap">
        <header className="page-heading">
          <h1>Start showing up together, {displayName.split(/\s+/)[0]}.</h1>
          <p>Create a workspace to track your daily progress with friends.</p>
        </header>
        <div className="onboarding-panel">
          <h2>Create your first workspace</h2>
          <CreateWorkspaceForm />
        </div>
        <p className="onboarding-note">Have an invitation? <Link className="text-link" href="/join">Paste your invite link</Link>. Workspace details stay private until you join.</p>
      </section>
    );
  }

  const workspace = data.selectedWorkspace;
  if (!workspace) notFound();
  const localToday = localDateAt(now, workspace.timezone);
  const greeting = greetingForUser(now, workspace.timezone, displayName);

  if (!data.challenge) {
    return (
      <div className="page-wrap">
        <header className="page-heading today-welcome">
          <h1>{greeting}</h1>
          <p>Your workspace is ready. Set a shared challenge to start tracking progress.</p>
        </header>
        {workspace.role === "owner" ? (
          <section className="onboarding-panel onboarding-panel--wide" aria-labelledby="challenge-create-heading">
            <h2 id="challenge-create-heading">Create your first challenge</h2>
            <p>Choose the dates that work for your group. A 60-day challenge is a useful place to start.</p>
            <CreateChallengeForm workspaceId={workspace.id} startDate={localToday} />
            <p className="onboarding-note">Friends can join before the challenge begins. <Link className="text-link" href={`/settings?workspace=${encodeURIComponent(workspace.id)}&tab=people#invites-heading`}>Invite people</Link></p>
          </section>
        ) : (
          <section className="empty-state" aria-labelledby="no-challenge-heading">
            <h2 id="no-challenge-heading">Your owner is setting up the first challenge.</h2>
            <p>Once it starts, you can check in here and follow each other&apos;s progress.</p>
          </section>
        )}
      </div>
    );
  }

  const challenge = data.challenge;
  const startOrdinal = calendarDateOrdinal(challenge.start_date);
  const endOrdinal = calendarDateOrdinal(challenge.end_date);
  const duration = startOrdinal !== null && endOrdinal !== null ? endOrdinal - startOrdinal + 1 : 0;
  const day = challenge.status === "completed"
    ? duration
    : challenge.status === "active"
      ? challenge.day_number ?? inclusiveChallengeDay(challenge.start_date, challenge.end_date, data.today ?? localToday) ?? 0
      : 0;
  const daysRemaining = challenge.status === "active"
    ? challenge.days_remaining ?? Math.max(0, duration - day)
    : challenge.status === "upcoming" ? duration : 0;
  const currentStreak = data.teamProgress.find((member) => member.userId === user.id)?.currentStreak ?? 0;
  const longestStreak = data.teamProgress.find((member) => member.userId === user.id)?.longestStreak ?? 0;
  const progressText = challenge.status === "upcoming"
    ? `Starts ${challenge.start_date} · ${duration} days`
    : challenge.status === "completed"
      ? `${duration} challenge days complete`
      : `Day ${day} of ${duration} · ${daysRemaining} ${daysRemaining === 1 ? "day" : "days"} left`;

  return (
    <div className="page-wrap today-page">
      <header className="today-hero">
        <div className="today-hero-copy">
          <h1>{greeting}</h1>
          <p className="today-challenge-title">{challenge.title}</p>
          {challenge.description && <p className="today-challenge-description">{challenge.description}</p>}
          <div className="challenge-progress-copy"><span>{progressText}</span><span>{challenge.status === "active" ? `${Math.round((day / Math.max(duration, 1)) * 100)}%` : ""}</span></div>
          <div className="challenge-progress-track" role="progressbar" aria-label="Challenge progress" aria-valuemin={0} aria-valuemax={Math.max(duration, 1)} aria-valuenow={Math.min(duration, day)} aria-valuetext={progressText}>
            <span style={{ width: `${Math.min(100, Math.max(0, (day / Math.max(duration, 1)) * 100))}%` }} />
          </div>
        </div>
        <StreakRing current={currentStreak} longest={longestStreak} />
      </header>

      {challenge.status === "completed" && (
        <section className="challenge-complete-note" aria-label="Challenge complete">
          <p>This challenge is complete. Check-ins, goals, and history remain available.</p>
          {workspace.role === "owner" ? <Link className="text-link" href={`/settings?workspace=${encodeURIComponent(workspace.id)}&tab=challenges#settings-panel-heading`}>Plan the next challenge</Link> : <p className="quiet-copy">A workspace owner can set up the next challenge.</p>}
        </section>
      )}

      {data.totalCheckins === 0 && challenge.status === "active" && <FirstRunHelper />}

      <div className="today-layout">
        <div className="today-main">
          <CheckinSection challenge={challenge} today={data.today ?? localToday} todayCheckin={data.todayCheckin} />
          <TeamSection progress={data.teamProgress} currentUserId={user.id} workspaceId={workspace.id} canInvite={workspace.role === "owner"} />
        </div>
        <DashboardRail data={data} workspaceId={workspace.id} />
      </div>

      <ActivitySection checkins={data.recentCheckins} currentUserId={user.id} workspaceId={workspace.id} now={now} />
    </div>
  );
}
