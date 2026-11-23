import Link from "next/link";

import { MemberAvatar } from "@/components/dashboard/member-avatar";
import { Icon } from "@/components/ui/icons";
import type { TeamProgress } from "@/lib/data/dashboard";

export function TeamSection({ progress, currentUserId, workspaceId, canInvite }: { progress: TeamProgress[]; currentUserId: string; workspaceId: string; canInvite: boolean }) {
  const ordered = [...progress].sort((left, right) => {
    const selfFirst = Number(right.userId === currentUserId) - Number(left.userId === currentUserId);
    if (selfFirst) return selfFirst;
    const checkedInFirst = Number(right.checkedInToday) - Number(left.checkedInToday);
    return checkedInFirst || left.displayName.localeCompare(right.displayName);
  });

  return (
    <section className="team-panel" aria-labelledby="team-heading">
      <header className="team-heading">
        <div><h2 id="team-heading">Team</h2><p>How everyone is moving through the challenge.</p></div>
        <div className="team-heading-tools">
          <span className="team-count">{ordered.length} {ordered.length === 1 ? "member" : "members"}</span>
          {canInvite && <Link className="text-link" href={`/settings?workspace=${encodeURIComponent(workspaceId)}&tab=people#invites-heading`}>Invite people <Icon name="arrow" size={16} /></Link>}
        </div>
      </header>
      {ordered.length === 0 ? (
        <div className="team-empty"><p>Your progress circle will appear here.</p><span>Invite people to share the challenge.</span></div>
      ) : (
        <ul className="team-list">
          {ordered.map((member, index) => {
            const consistency = member.elapsedDays > 0 ? Math.min(100, Math.round((member.completedDays / member.elapsedDays) * 100)) : 0;
            const self = member.userId === currentUserId;
            return (
              <li className="team-row" key={member.userId} style={{ animationDelay: `${index * 40}ms` }}>
                <MemberAvatar name={member.displayName} userId={member.userId} src={member.avatarPath} isSelf={self} size="md" ring={member.checkedInToday} />
                <div className="team-member-copy">
                  <div className="team-member-name">
                    <strong>{member.displayName}{self && <span className="self-label">You</span>}</strong>
                    <span className={`team-status${member.checkedInToday ? " is-checked-in" : ""}`}>{member.checkedInToday ? "Checked in" : "Not yet today"}</span>
                  </div>
                  <div className="consistency-line">
                    <span className="consistency-track" role="progressbar" aria-label={`${member.displayName} consistency`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={consistency}>
                      <span style={{ width: `${consistency}%` }} />
                    </span>
                    <span className="consistency-copy">{member.completedDays} of {member.elapsedDays} {member.elapsedDays === 1 ? "day" : "days"}</span>
                  </div>
                </div>
                <span className="team-streak"><Icon name="flame" size={16} /> <strong>{member.currentStreak}</strong> <span>day streak</span></span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
