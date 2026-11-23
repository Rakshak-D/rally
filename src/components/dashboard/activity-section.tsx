import Link from "next/link";

import { MemberAvatar } from "@/components/dashboard/member-avatar";
import { NoteCallout } from "@/components/dashboard/note-callout";
import type { RecentCheckin } from "@/lib/data/dashboard";
import { relativeTimeLabel } from "@/lib/domain/today";

export function ActivitySection({ checkins, currentUserId, workspaceId, now = new Date() }: {
  checkins: RecentCheckin[];
  currentUserId: string;
  workspaceId: string;
  now?: Date;
}) {
  return (
    <section className="activity-panel" aria-labelledby="activity-heading">
      <header className="activity-heading">
        <div><h2 id="activity-heading">Recent activity</h2><p>The latest check-ins from your circle.</p></div>
        <Link className="text-link" href={`/history?workspace=${encodeURIComponent(workspaceId)}`}>View history <span aria-hidden="true">→</span></Link>
      </header>
      {checkins.length === 0 ? (
        <div className="activity-empty"><p>Updates will appear here.</p><span>Share your first check-in to start the conversation.</span></div>
      ) : (
        <ol className="activity-list">
          {checkins.map((checkin) => (
            <li className="activity-row" key={checkin.id}>
              <MemberAvatar name={checkin.displayName} userId={checkin.user_id} src={checkin.avatarPath} isSelf={checkin.user_id === currentUserId} size="md" />
              <div className="activity-copy">
                <div className="activity-meta">
                  <strong>{checkin.displayName}</strong>
                  <time dateTime={checkin.created_at} title={checkin.checkin_date}>{relativeTimeLabel(checkin.created_at, now)}</time>
                </div>
                <p>{checkin.accomplishment}</p>
                <p className="activity-next"><span>Next:</span> {checkin.next_plan}</p>
                {checkin.notes && <NoteCallout note={checkin.notes} />}
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
