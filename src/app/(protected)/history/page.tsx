import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { HistoryCalendar } from "@/components/history/calendar-view";
import { requireUser } from "@/lib/auth/current-user";
import { getWorkspaceDashboard } from "@/lib/data/dashboard";
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

export default async function HistoryPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const [user, params, supabase] = await Promise.all([requireUser(), searchParams, createSupabaseServerClient()]);
  const data = await getWorkspaceDashboard(user.id, params.workspace);
  if (data.invalidWorkspace) notFound();
  const workspace = data.selectedWorkspace;

  if (!workspace) {
    return <section className="empty-state"><p className="eyebrow">HISTORY</p><h2>Every day starts somewhere.</h2><p>Create or join a workspace from Today to begin a shared record.</p></section>;
  }

  const { data: challenges, error: challengeError } = await supabase
    .from("challenge_status").select("id, title, start_date, end_date, status")
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

  const calendarResult = calendarChallenge
    ? await supabase.rpc("get_challenge_calendar", {
        p_challenge_id: calendarChallenge.id,
        p_days: 28,
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
  const profileNames = new Map(data.workspaceMembers.map((profile) => [profile.id, profile.display_name]));
  const challengeNames = new Map((challenges ?? []).map((challenge) => [challenge.id, challenge.title]));

  return (
    <div className="page-wrap history-page">
      <header className="page-heading">
        <p className="eyebrow">{workspace.name.toUpperCase()} · THE RECORD</p>
        <h1>History.</h1>
        <p>Past updates stay in order, day by challenge-local day.</p>
      </header>

      <div className="history-filter-row">
        <form className="history-filters" method="get" action="/history">
          <input type="hidden" name="workspace" value={workspace.id} />
          <label className="field-label" htmlFor="history-challenge">Challenge
            <select className="field-select" id="history-challenge" name="challenge" defaultValue={selectedChallenge?.id ?? "all"}>
              <option value="all">All challenges</option>
              {(challenges ?? []).map((challenge) => <option key={challenge.id} value={challenge.id}>{challenge.title} · {challenge.status}</option>)}
            </select>
          </label>
          <label className="field-label" htmlFor="history-member">Member
            <select className="field-select" id="history-member" name="member" defaultValue={selectedMember?.id ?? ""}>
              <option value="">Everyone</option>
              {data.workspaceMembers.map((member) => <option key={member.id} value={member.id}>{member.display_name}</option>)}
            </select>
          </label>
          <button className="button button--secondary" type="submit">Apply filters</button>
        </form>
        <span className="history-date-range">{selectedChallenge ? `${selectedChallenge.start_date} — ${selectedChallenge.end_date}` : `All challenges · calendar: ${calendarChallenge?.title ?? "no challenge"}`}</span>
      </div>

      <HistoryCalendar days={calendarResult.data ?? []} />

      <section className="history-feed" aria-labelledby="history-feed-heading">
        <div className="section-heading section-heading--lined">
          <div><p className="eyebrow">CHRONOLOGICAL</p><h2 id="history-feed-heading">Previous updates.</h2></div>
          <span className="team-count">{PAGE_SIZE} per page</span>
        </div>
        {visibleRows.length === 0 ? (
          <div className="activity-empty"><p>No check-ins in this view.</p><span>Try another member or challenge filter.</span></div>
        ) : (
          <ol className="history-record-list">
            {visibleRows.map((checkin) => (
              <li key={checkin.id}>
                <time className="history-record-date" dateTime={checkin.checkin_date}>{checkin.checkin_date}</time>
                <div className="history-record-copy">
                  <div className="activity-meta"><strong>{profileNames.get(checkin.user_id) ?? "Former member"}</strong><span>{challengeNames.get(checkin.challenge_id) ?? "Challenge"}</span></div>
                  <p>{checkin.accomplishment}</p>
                  <div className="history-next"><span>NEXT</span><p>{checkin.next_plan}</p></div>
                  {checkin.notes && <details className="history-note"><summary>Blocker or note</summary><p>{checkin.notes}</p></details>}
                </div>
              </li>
            ))}
          </ol>
        )}
        <nav className="history-pagination" aria-label="History pages">
          {page > 1 ? <Link className="button button--secondary" href={pageHref(params, page - 1)}>← Newer</Link> : <span />}
          <span>Page {page}</span>
          {hasNextPage ? <Link className="button button--secondary" href={pageHref(params, page + 1)}>Older →</Link> : <span />}
        </nav>
      </section>
    </div>
  );
}
