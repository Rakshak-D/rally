import { CheckinEditor } from "./checkin-editor";

export function CheckinSection({
  challenge,
  today,
  todayCheckin,
}: {
  challenge: NonNullable<import("@/lib/data/dashboard").WorkspaceDashboard["challenge"]>;
  today: string | null;
  todayCheckin: import("@/lib/data/dashboard").WorkspaceDashboard["todayCheckin"];
}) {
  const canCheckin = challenge.status === "active";

  return (
    <section className="checkin-panel" aria-labelledby="checkin-heading">
      <header className="checkin-heading">
        <div>
          <span className="section-kicker">Today&apos;s check-in</span>
          <h2 id="checkin-heading">One honest update is enough.</h2>
        </div>
        {today && <time dateTime={today}>{today}</time>}
      </header>
      {canCheckin ? (
        <CheckinEditor key={challenge.id} challengeId={challenge.id} checkin={todayCheckin} />
      ) : (
        <div className="checkin-unavailable">
          <p>{challenge.status === "upcoming" ? `Check-ins open on ${challenge.start_date}.` : "This challenge is complete. Its check-ins remain in history."}</p>
        </div>
      )}
    </section>
  );
}
