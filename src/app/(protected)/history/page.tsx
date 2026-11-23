import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { HistoryFilters } from "@/components/history/history-filters";
import { MemberAvatar } from "@/components/dashboard/member-avatar";
import { NoteCallout } from "@/components/dashboard/note-callout";
import { StampLanes } from "@/components/product/stamp-lanes";
import { requireUser } from "@/lib/auth/current-user";
import { getLaneCheckins, getWorkspaceDashboard } from "@/lib/data/dashboard";
import { addCalendarDays, formatCalendarDate, localDateAt } from "@/lib/domain/calendar";
import { buildStampDays } from "@/lib/domain/stamp-lanes";
import { relativeTimeLabel } from "@/lib/domain/today";
import { aggregateWeeklyCheckins } from "@/lib/domain/weekly-checkins";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "History" };

const PAGE_SIZE = 25;

type SearchParams = { workspace?: string; member?: string; challenge?: string; page?: string };

function pageNumber(value?: string): number {
  const parsed = Number.parseInt(value ?? "1", 10);
  return Number.isInteger(parsed) ? Math.max(1, Math.min(parsed, 1000)) : 1;
}

function pageHref(search: SearchParams, page: number): string {
  const params = new URLSearchParams();
  if (search.workspace) params.set("workspace", search.workspace);
  if (search.member) params.set("member", search.member);
  if (search.challenge) params.set("challenge", search.challenge);
  if (page > 1) params.set("page", String(page));
  return `/history?${params.toString()}`;
}

function dateHeading(date: string, today: string): string {
  if (date === today) return "Today";
  if (date === addCalendarDays(today, -1)) return "Yesterday";
  return formatCalendarDate(date);
}

export default async function HistoryPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const [user, params, supabase] = await Promise.all([requireUser(), searchParams, createSupabaseServerClient()]);
  const data = await getWorkspaceDashboard(user.id, params.workspace);
  if (data.invalidWorkspace) notFound();
  const workspace = data.selectedWorkspace;

  if (!workspace) {
    return <section className="empty-state"><h1>History</h1><p>Create or join a workspace from Today to begin a shared record.</p></section>;
  }

  const { data: challenges, error: challengeError } = await supabase
    .from("challenge_status").select("id, title, start_date, end_date, status, timezone")
    .eq("workspace_id", workspace.id).order("start_date", { ascending: false });
  if (challengeError) throw new Error("Challenge history could not be loaded.");

  const challengeIds = (challenges ?? []).map(({ id }) => id);
  const selectedChallenge = params.challenge && params.challenge !== "all"
    ? challenges?.find(({ id }) => id === params.challenge) ?? null
    : null;
  const calendarChallenge = selectedChallenge ?? challenges?.find(({ status }) => status === "active") ??
    challenges?.find(({ status }) => status === "completed") ?? challenges?.find(({ status }) => status === "upcoming") ?? null;
  const selectedMember = data.workspaceMembers.find(({ id }) => id === params.member) ?? null;
  const page = pageNumber(params.page);
  const now = new Date();
  const today = localDateAt(now, calendarChallenge?.timezone ?? workspace.timezone);

  const calendarResult = calendarChallenge
    ? await supabase.rpc("get_challenge_calendar", {
        p_challenge_id: calendarChallenge.id,
        p_days: 84,
        ...(selectedMember ? { p_member_id: selectedMember.id } : {}),
      })
    : { data: [], error: null };
  if (calendarResult.error) throw new Error("The check-in calendar could not be loaded.");

  let historyQuery = challengeIds.length > 0
    ? supabase.from("checkins")
        .select("id, challenge_id, user_id, checkin_date, accomplishment, next_plan, notes, created_at")
        .in("challenge_id", selectedChallenge ? [selectedChallenge.id] : challengeIds)
        .order("checkin_date", { ascending: false })
        .order("created_at", { ascending: false })
    : null;
  if (historyQuery && selectedMember) historyQuery = historyQuery.eq("user_id", selectedMember.id);
  if (historyQuery) historyQuery = historyQuery.range((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const { data: rows, error } = historyQuery ? await historyQuery : { data: [], error: null };
  if (error) throw new Error("Check-in history could not be loaded.");

  const hasNextPage = (rows?.length ?? 0) > PAGE_SIZE;
  const visibleRows = (rows ?? []).slice(0, PAGE_SIZE);
  const profiles = new Map(data.workspaceMembers.map((profile) => [profile.id, profile]));
  const challengeNames = new Map((challenges ?? []).map((challenge) => [challenge.id, challenge.title]));
  const challengeTimezones = new Map((challenges ?? []).map((challenge) => [challenge.id, challenge.timezone ?? workspace.timezone]));
  const calendarDays = calendarResult.data ?? [];
  const laneDays = calendarChallenge
    ? buildStampDays(calendarChallenge.start_date, calendarChallenge.end_date, today, 84)
    : [];
  const laneMembers = (selectedMember ? [selectedMember] : data.workspaceMembers).map((member) => ({
    id: member.id,
    name: member.display_name,
    avatarPath: member.avatar_path,
    isSelf: member.id === user.id,
  }));
  const laneCheckins = calendarChallenge && laneDays.length
    ? await getLaneCheckins(calendarChallenge.id, laneDays[0]!.date, laneDays.at(-1)!.date, laneMembers.map(({ id }) => id))
    : [];
  const weeklyTotals = aggregateWeeklyCheckins(calendarDays).slice(-7);
  const calendarScope = selectedMember ? `Showing ${selectedMember.display_name} on ${calendarChallenge?.title ?? "this challenge"}` : calendarChallenge?.title ?? "No challenge yet";

  return (
    <div className="page-wrap history-page">
      <header className="page-heading page-heading--spread">
        <div><h1>History</h1><p>Every check-in, in the order it happened.</p></div>
        <span className="history-record-count">{visibleRows.length}{hasNextPage ? "+" : ""}<small>updates</small></span>
      </header>

      <section className="history-panel history-controls" aria-label="History filters">
        <HistoryFilters
          workspaceId={workspace.id}
          challenges={(challenges ?? []).map(({ id, title, status }) => ({ id, title, status }))}
          members={data.workspaceMembers}
          selectedChallenge={selectedChallenge?.id ?? "all"}
          selectedMember={selectedMember?.id ?? ""}
        />
        <p className="history-scope">Calendar: <strong>{calendarScope}</strong></p>
      </section>

      <div className="history-visualizations">
        <section className="history-panel history-lanes-panel" aria-labelledby="history-lanes-heading">
          <div className="records-section-heading"><div><h2 id="history-lanes-heading">Group progress</h2><p>{calendarScope}</p></div></div>
          <StampLanes members={laneMembers} days={laneDays} checkins={laneCheckins} windowSize={14} allowExpand />
        </section>
        <section className="history-panel history-week-summary" aria-labelledby="weekly-totals-heading">
          <div className="records-section-heading"><div><h2 id="weekly-totals-heading">Weekly totals</h2><p>Check-ins across the group</p></div></div>
          {weeklyTotals.length ? <ol>{weeklyTotals.map(({ weekStart, checkinCount }) => <li key={weekStart}><span>Week of {formatCalendarDate(weekStart)}</span><strong>{checkinCount}</strong></li>)}</ol> : <p className="quiet-copy">Weekly totals appear after the first check-in.</p>}
        </section>
      </div>

      <section className="history-panel history-feed" aria-labelledby="history-feed-heading">
        <div className="records-section-heading"><div><h2 id="history-feed-heading">Previous updates</h2><p>Most recent first · {PAGE_SIZE} updates per page</p></div></div>
        {visibleRows.length === 0 ? (
          <div className="records-empty records-empty--compact">
            <svg viewBox="0 0 72 56" aria-hidden="true"><path d="M9 43h54M16 36l12-12 9 8 18-20" /><circle cx="55" cy="12" r="4" /></svg>
            <h3>No check-ins in this view yet</h3><p>Choose a different member or challenge to explore the group&apos;s history.</p>
          </div>
        ) : (
          <ol className="history-record-list">
            {visibleRows.map((checkin, index) => {
              const checkinToday = localDateAt(now, challengeTimezones.get(checkin.challenge_id) ?? workspace.timezone);
              const dayLabel = dateHeading(checkin.checkin_date, checkinToday);
              const startsDay = index === 0 || visibleRows[index - 1]?.checkin_date !== checkin.checkin_date;
              const profile = profiles.get(checkin.user_id);
              return (
                <li className="history-record-group" key={checkin.id}>
                  {startsDay && <h3 className="history-day-heading">{dayLabel}</h3>}
                  <article className="history-record">
                    <MemberAvatar name={profile?.display_name ?? "Rally member"} userId={checkin.user_id} src={profile?.avatar_path} size="md" />
                    <div className="history-record-copy">
                      <div className="history-record-meta">
                        <strong>{profile?.display_name ?? "Former member"}</strong>
                        <span>{challengeNames.get(checkin.challenge_id) ?? "Challenge"}</span>
                        <time dateTime={checkin.created_at}>{relativeTimeLabel(checkin.created_at)}</time>
                      </div>
                      <p className="history-accomplishment">{checkin.accomplishment}</p>
                      <p className="history-next"><span>Next</span>{checkin.next_plan}</p>
                      {checkin.notes && <NoteCallout note={checkin.notes} />}
                    </div>
                  </article>
                </li>
              );
            })}
          </ol>
        )}
        <nav className="history-pagination" aria-label="History pages">
          {page > 1 ? <Link className="button button--secondary" href={pageHref(params, page - 1)}>Newer updates</Link> : <span className="pagination-placeholder" aria-hidden="true" />}
          <span>Page {page}</span>
          {hasNextPage ? <Link className="button button--secondary" href={pageHref(params, page + 1)}>Load older updates</Link> : <span className="pagination-placeholder">You&apos;re all caught up</span>}
        </nav>
      </section>
    </div>
  );
}
