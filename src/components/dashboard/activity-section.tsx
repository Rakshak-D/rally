import Link from "next/link";

import type { RecentCheckin } from "@/lib/data/dashboard";

import { MemberAvatar } from "./member-avatar";

export function ActivitySection({ checkins, currentUserId }: { checkins: RecentCheckin[]; currentUserId: string }) {
  return (
    <section className="activity-panel" aria-labelledby="activity-heading">
      <div className="section-heading section-heading--lined">
        <div>
          <p className="eyebrow">SHARED ACTIVITY</p>
          <h2 id="activity-heading">Recent check-ins.</h2>
        </div>
        <Link className="text-link" href="/history">View history <span aria-hidden="true">↗</span></Link>
      </div>
      {checkins.length === 0 ? (
        <div className="activity-empty"><p>No updates yet.</p><span>When someone checks in, their note will appear here.</span></div>
      ) : (
        <ol className="activity-list">
          {checkins.map((checkin) => (
            <li className="activity-row" key={checkin.id}>
              <MemberAvatar name={checkin.displayName} isSelf={checkin.user_id === currentUserId} size="small" />
              <div className="activity-copy">
                <div className="activity-meta"><strong>{checkin.displayName}</strong><time dateTime={checkin.checkin_date}>{checkin.checkin_date}</time></div>
                <p>{checkin.accomplishment}</p>
                <span className="activity-next">NEXT <span>{checkin.next_plan}</span></span>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
