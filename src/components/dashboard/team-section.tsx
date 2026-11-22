import Link from "next/link";

import type { TeamProgress } from "@/lib/data/dashboard";

import { MemberAvatar } from "./member-avatar";

export function TeamSection({ progress, currentUserId, workspaceId, canInvite }: { progress: TeamProgress[]; currentUserId: string; workspaceId: string; canInvite: boolean }) {
  return (
    <section className="team-panel" aria-labelledby="team-heading">
      <div className="section-heading section-heading--lined">
        <div>
          <p className="eyebrow">THE GROUP</p>
          <h2 id="team-heading">Showing up, side by side.</h2>
        </div>
        <div className="team-heading-tools">
          <span className="team-count">{progress.length} {progress.length === 1 ? "member" : "members"}</span>
          {canInvite && (
            <Link className="text-link" href={`/settings?workspace=${encodeURIComponent(workspaceId)}#invites-heading`}>
              Invite people <span aria-hidden="true">↗</span>
            </Link>
          )}
        </div>
      </div>
      {progress.length === 0 ? (
        <p className="quiet-copy">Progress will appear here when members begin checking in.</p>
      ) : (
        <ul className="team-list">
          {progress.map((member) => {
            const consistency = member.elapsedDays > 0 ? Math.min(100, Math.round((member.completedDays / member.elapsedDays) * 100)) : 0;
            const checkedIn = member.checkedInToday;
            return (
              <li className="team-row" key={member.userId}>
                <MemberAvatar name={member.displayName} isSelf={member.userId === currentUserId} />
                <div className="team-member-copy">
                  <div className="team-member-name">
                    <strong>{member.displayName}{member.userId === currentUserId ? <span className="self-label">YOU</span> : null}</strong>
                    <span className={`presence${checkedIn ? " presence--done" : ""}`}><i aria-hidden="true" />{checkedIn ? "Checked in" : "Not yet today"}</span>
                  </div>
                  <div className="consistency-line">
                    <span className="consistency-track"><span style={{ width: `${consistency}%` }} /></span>
                    <span className="mono-value">{consistency}%</span>
                    <span className="consistency-copy">{member.completedDays} of {member.elapsedDays} days</span>
                  </div>
                </div>
                <div className="team-streak"><strong>{member.currentStreak}</strong><span>day streak</span></div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
