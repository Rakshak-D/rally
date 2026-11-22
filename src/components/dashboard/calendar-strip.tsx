import { addCalendarDays, calendarDateOrdinal } from "@/lib/domain/calendar";

export function CalendarStrip({
  today,
  startDate,
  endDate,
  dates,
}: {
  today: string | null;
  startDate: string;
  endDate: string;
  dates: string[];
}) {
  if (!today || today < startDate) {
    return (
      <section className="calendar-panel" aria-labelledby="calendar-heading">
        <p className="eyebrow">RECENT HISTORY</p>
        <h2 id="calendar-heading">A record takes shape here.</h2>
        <p className="quiet-copy">The first check-in will open the challenge calendar.</p>
      </section>
    );
  }

  const throughDate = today < endDate ? today : endDate;
  const latestOrdinal = calendarDateOrdinal(throughDate);
  const startOrdinal = calendarDateOrdinal(startDate);
  if (latestOrdinal === null || startOrdinal === null) return null;

  const firstOrdinal = Math.max(startOrdinal, latestOrdinal - 27);
  const dayCount = latestOrdinal - firstOrdinal + 1;
  const checked = new Set(dates);
  const days = Array.from({ length: dayCount }, (_, index) => addCalendarDays(throughDate, index - dayCount + 1)).filter((date): date is string => date !== null);

  return (
    <section className="calendar-panel" aria-labelledby="calendar-heading">
      <div className="section-heading section-heading--compact">
        <div>
          <p className="eyebrow">RECENT HISTORY</p>
          <h2 id="calendar-heading">Your last {days.length} days.</h2>
        </div>
        <span className="calendar-key"><i aria-hidden="true" /> checked in</span>
      </div>
      <div className="calendar-days" role="list" aria-label="Recent challenge calendar">
        {days.map((date) => {
          const complete = checked.has(date);
          const dayLabel = date.slice(-2).replace(/^0/, "");
          return (
            <span className={`calendar-day${complete ? " calendar-day--complete" : ""}${date === today ? " calendar-day--today" : ""}`} key={date} role="listitem" aria-label={`${date}${complete ? ", checked in" : ", no check-in"}`}>
              {dayLabel}
            </span>
          );
        })}
      </div>
      <p className="calendar-range">{days[0]} <span aria-hidden="true">—</span> {days.at(-1)}</p>
    </section>
  );
}
