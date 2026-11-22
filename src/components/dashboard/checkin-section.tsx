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
      <div className="section-heading section-heading--lined">
        <div>
          <p className="eyebrow">YOUR DAILY NOTE</p>
          <h2 id="checkin-heading">{todayCheckin ? "Today, recorded." : "What did you move forward?"}</h2>
        </div>
        <span className="checkin-date">{today ?? "—"}</span>
      </div>
      {canCheckin ? (
        <CheckinEditor challengeId={challenge.id} checkin={todayCheckin} />
      ) : (
        <div className="checkin-unavailable">
          <p>{challenge.status === "upcoming" ? `Check-ins open on ${challenge.start_date}.` : "This challenge is complete. Its check-ins remain in history."}</p>
        </div>
      )}
    </section>
  );
}
