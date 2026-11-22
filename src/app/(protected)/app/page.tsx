import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ActivitySection } from "@/components/dashboard/activity-section";
import { Logo } from "@/components/brand/logo";
import { CalendarStrip } from "@/components/dashboard/calendar-strip";
import { CheckinSection } from "@/components/dashboard/checkin-section";
import { StreakSection } from "@/components/dashboard/streak-section";
import { TeamSection } from "@/components/dashboard/team-section";
import { ActiveGoalsSection } from "@/components/dashboard/active-goals-section";
import { OpenTasksSection } from "@/components/dashboard/open-tasks-section";
import { CreateChallengeForm } from "@/components/workspace/create-challenge-form";
import { CreateWorkspaceForm } from "@/components/workspace/create-workspace-form";
import { requireUser } from "@/lib/auth/current-user";
import { getWorkspaceDashboard } from "@/lib/data/dashboard";
import { localDateAt } from "@/lib/domain/calendar";

export const metadata: Metadata = { title: "Today" };

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ workspace?: string }>;
}) {
  const [user, params] = await Promise.all([requireUser(), searchParams]);
  const data = await getWorkspaceDashboard(user.id, params.workspace);
  if (data.invalidWorkspace) notFound();

  if (data.workspaces.length === 0) {
    return (
      <section className="onboarding-wrap">
        <header className="page-heading">
          <p className="eyebrow">FIRST, FIND YOUR PEOPLE</p>
          <h1>Start a workspace.</h1>
          <p>A shared space for the people who keep showing up.</p>
        </header>
        <div className="onboarding-panel">
          <div className="panel-index">01 <span>YOUR CIRCLE</span></div>
          <CreateWorkspaceForm />
        </div>
        <p className="onboarding-note">Have an invitation? Open the private link sent by its owner. Workspace details stay private until you join.</p>
      </section>
    );
  }

  const workspace = data.selectedWorkspace;
  if (!workspace) notFound();

  if (!data.challenge) {
    const localToday = localDateAt(new Date(), workspace.timezone);
    return (
      <div className="page-wrap">
        <header className="page-heading page-heading--spread">
          <div>
            <p className="eyebrow">{workspace.name.toUpperCase()} · YOUR FIRST CHALLENGE</p>
            <h1>Choose a stretch worth sharing.</h1>
            <p>Give the group a clear start and finish. The suggested length is 60 days.</p>
          </div>
          <span className="date-stamp">{localToday}</span>
        </header>
        {workspace.role === "owner" ? (
          <section className="onboarding-panel onboarding-panel--wide">
            <div className="panel-index">01 <span>SET THE DATES</span></div>
            <CreateChallengeForm workspaceId={workspace.id} startDate={localToday} />
          </section>
        ) : (
          <section className="empty-state">
          <span className="empty-state-mark" aria-hidden="true"><Logo href="" compact /></span>
            <h2>No challenge has started yet.</h2>
            <p>A workspace owner can set the dates and invite everyone in.</p>
          </section>
        )}
      </div>
    );
  }

  return (
    <div className="page-wrap">
      <header className="page-heading page-heading--spread">
        <div>
          <p className="eyebrow">{workspace.name.toUpperCase()} · {data.challenge.status?.toUpperCase()}</p>
          <h1>Today, together.</h1>
          <p>{data.challenge.title}{data.challenge.description ? ` · ${data.challenge.description}` : ""}</p>
        </div>
        <div className="challenge-day-stamp">
          <span className="mono-label">{data.challenge.status === "active" ? "CHALLENGE DAY" : data.challenge.status === "upcoming" ? "STARTS" : "ENDED"}</span>
          <strong>{data.challenge.status === "active" ? data.challenge.day_number : data.challenge.status === "upcoming" ? data.challenge.start_date : data.challenge.end_date}</strong>
          {data.challenge.status === "active" && <span className="mono-label">{data.challenge.days_remaining} DAYS LEFT</span>}
        </div>
      </header>

      <div className="dashboard-grid">
        <section className="dashboard-primary">
          <CheckinSection challenge={data.challenge} today={data.today} todayCheckin={data.todayCheckin} />
          <TeamSection progress={data.teamProgress} currentUserId={user.id} />
        </section>
        <aside className="dashboard-side">
          <StreakSection data={data} currentUserId={user.id} />
          <CalendarStrip today={data.today} startDate={data.challenge.start_date} endDate={data.challenge.end_date} dates={data.calendarDates} />
          <OpenTasksSection tasks={data.openTasks} memberProfiles={data.workspaceMembers} />
          <ActiveGoalsSection goals={data.activeGoals} memberProfiles={data.workspaceMembers} />
        </aside>
      </div>

      <ActivitySection checkins={data.recentCheckins} currentUserId={user.id} />
    </div>
  );
}
