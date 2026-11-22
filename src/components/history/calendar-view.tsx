export type CalendarDay = { local_date: string; checkin_count: number };

export function HistoryCalendar({ days }: { days: CalendarDay[] }) {
  if (days.length === 0) {
    return <section className="history-calendar"><p className="eyebrow">RECENT CALENDAR</p><p className="quiet-copy">Calendar activity will appear once the challenge begins.</p></section>;
  }

  const firstWeekday = new Date(`${days[0].local_date}T00:00:00.000Z`).getUTCDay();
  const padded = [...Array.from({ length: firstWeekday }, () => null), ...days];

  return (
    <section className="history-calendar" aria-labelledby="history-calendar-heading">
      <div className="section-heading section-heading--compact">
        <div><p className="eyebrow">RECENT CALENDAR</p><h2 id="history-calendar-heading">Last {days.length} challenge days.</h2></div>
        <span className="calendar-key"><i aria-hidden="true" /> checked in</span>
      </div>
      <div className="history-weekdays" aria-hidden="true"><span>Su</span><span>Mo</span><span>Tu</span><span>We</span><span>Th</span><span>Fr</span><span>Sa</span></div>
      <div className="history-calendar-grid" role="list" aria-label="Check-in counts by challenge-local date">
        {padded.map((day, index) => day ? (
          <span className={`history-calendar-day${day.checkin_count ? " history-calendar-day--complete" : ""}`} key={day.local_date} role="listitem" aria-label={`${day.local_date}: ${day.checkin_count} ${day.checkin_count === 1 ? "check-in" : "check-ins"}`}>
            <time dateTime={day.local_date}>{day.local_date.slice(-2).replace(/^0/, "")}</time>
            {day.checkin_count > 0 && <small>{day.checkin_count}</small>}
          </span>
        ) : <span className="history-calendar-day history-calendar-day--blank" key={`blank-${index}`} aria-hidden="true" />)}
      </div>
      <p className="calendar-range">{days[0].local_date} <span aria-hidden="true">—</span> {days.at(-1)?.local_date}</p>
    </section>
  );
}
