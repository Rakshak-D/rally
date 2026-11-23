"use client";

import Link from "next/link";

type ChallengeOption = { id: string; title: string; status: string | null };
type MemberOption = { id: string; display_name: string };

export function HistoryFilters({
  workspaceId,
  challenges,
  members,
  selectedChallenge,
  selectedMember,
}: {
  workspaceId: string;
  challenges: ChallengeOption[];
  members: MemberOption[];
  selectedChallenge: string;
  selectedMember: string;
}) {
  function submitOnChange(event: React.ChangeEvent<HTMLSelectElement>) {
    event.currentTarget.form?.requestSubmit();
  }

  return (
    <form className="history-filters" method="get" action="/history">
      <input type="hidden" name="workspace" value={workspaceId} />
      <label className="field-label" htmlFor="history-challenge">Challenge
        <select className="field-select" id="history-challenge" name="challenge" value={selectedChallenge} onChange={submitOnChange}>
          <option value="all">All challenges</option>
          {challenges.map((challenge) => <option key={challenge.id} value={challenge.id}>{challenge.title} · {challenge.status ?? "Challenge"}</option>)}
        </select>
      </label>
      <label className="field-label" htmlFor="history-member">Member
        <select className="field-select" id="history-member" name="member" value={selectedMember} onChange={submitOnChange}>
          <option value="">Everyone</option>
          {members.map((member) => <option key={member.id} value={member.id}>{member.display_name}</option>)}
        </select>
      </label>
      <Link className="button button--quiet history-clear" href={`/history?workspace=${encodeURIComponent(workspaceId)}`}>Clear filters</Link>
      <noscript><button className="button button--secondary" type="submit">Apply filters</button></noscript>
    </form>
  );
}
