import { addCalendarDays, calendarDateOrdinal } from "@/lib/domain/calendar";

export function ConsistencyHeatmap({
  today,
  startDate,
  endDate,
  checkinDates,
}: {
  today: string | null;
  startDate: string;
  endDate: string;
  checkinDates: string[];
}) {
  const startOrdinal = calendarDateOrdinal(startDate);
  const endOrdinal = calendarDateOrdinal(endDate);
  const checkedDates = new Set(checkinDates);
  const dates = today
    ? Array.from({ length: 28 }, (_, index) => addCalendarDays(today, index - 27)).filter((date): date is string => date !== null)
    : [];

  return (
    <section className="consistency-heatmap" aria-labelledby="consistency-heading">
      <div className="section-heading section-heading--compact">
        <div><h2 id="consistency-heading">Your last 28 days</h2><p>Each square is one challenge day.</p></div>
      </div>
      <div className="heatmap-grid" role="list" aria-label="Your check-in activity over the last 28 days">
        {dates.map((date, index) => {
          const ordinal = calendarDateOrdinal(date);
          const inChallenge = ordinal !== null && startOrdinal !== null && endOrdinal !== null && ordinal >= startOrdinal && ordinal <= endOrdinal;
          const complete = inChallenge && checkedDates.has(date);
          const current = date === today;
          const label = !inChallenge
            ? `${date}, outside the challenge`
            : `${date}, ${complete ? "checked in" : "no check-in"}${current ? ", today" : ""}`;
          return (
            <span
              key={date}
              className={`heatmap-day${complete ? " is-complete" : ""}${current ? " is-today" : ""}${!inChallenge ? " is-outside" : ""}`}
              role="listitem"
              aria-label={label}
              title={label}
              style={{ animationDelay: `${(dates.length - 1 - index) * 18}ms` }}
            />
          );
        })}
      </div>
      <div className="heatmap-legend"><span>No check-in</span><i aria-hidden="true" /><strong>Checked in</strong></div>
    </section>
  );
}
