import { addCalendarDays } from "@/lib/domain/calendar";

export type CalendarDay = { local_date: string; checkin_count: number };

type CalendarCell = CalendarDay & { outsideRange: boolean };

function buildWeeks(days: CalendarDay[]): CalendarCell[][] {
  if (!days.length) return [];

  const counts = new Map(days.map((day) => [day.local_date, day.checkin_count]));
  const first = new Date(`${days[0].local_date}T00:00:00.000Z`);
  const last = new Date(`${days.at(-1)?.local_date}T00:00:00.000Z`);
  first.setUTCDate(first.getUTCDate() - ((first.getUTCDay() + 6) % 7));
  last.setUTCDate(last.getUTCDate() + ((7 - last.getUTCDay()) % 7));

  const weeks: CalendarCell[][] = [];
  for (let start = first.toISOString().slice(0, 10); start <= last.toISOString().slice(0, 10); ) {
    const week: CalendarCell[] = [];
    for (let offset = 0; offset < 7; offset += 1) {
      const localDate = addCalendarDays(start, offset);
      if (!localDate) continue;
      const exists = counts.has(localDate);
      week.push({ local_date: localDate, checkin_count: counts.get(localDate) ?? 0, outsideRange: !exists });
    }
    weeks.push(week);
    const next = addCalendarDays(start, 7);
    if (!next) break;
    start = next;
  }

  return weeks;
}

function monthForWeek(week: CalendarCell[], index: number, weeks: CalendarCell[][]): string {
  const firstInRange = week.find((day) => !day.outsideRange);
  const firstPreviousInRange = weeks[index - 1]?.find((day) => !day.outsideRange);
  if (!firstInRange) return "";
  if (firstPreviousInRange?.local_date.slice(5, 7) === firstInRange.local_date.slice(5, 7)) return "";
  return new Intl.DateTimeFormat("en", { month: "short", timeZone: "UTC" }).format(new Date(`${firstInRange.local_date}T00:00:00.000Z`));
}

function intensity(count: number): number {
  if (count <= 0) return 0;
  if (count === 1) return 1;
  if (count === 2) return 2;
  return 3;
}

function formatDate(date: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00.000Z`));
}

export function HistoryCalendar({ days, today }: { days: CalendarDay[]; today: string }) {
  const weeks = buildWeeks(days);
  const mostInDay = Math.max(0, ...days.map(({ checkin_count }) => checkin_count));

  if (weeks.length === 0) {
    return (
      <section className="history-panel history-calendar" aria-labelledby="history-calendar-heading">
        <div className="records-section-heading"><div><h2 id="history-calendar-heading">Check-in calendar</h2><p>No challenge days to display yet.</p></div></div>
      </section>
    );
  }

  return (
    <section className="history-panel history-calendar" aria-labelledby="history-calendar-heading">
      <div className="records-section-heading">
        <div><h2 id="history-calendar-heading">Check-in calendar</h2><p>Daily participation across the selected challenge.</p></div>
        <span className="calendar-range-label">{formatDate(days[0].local_date)} — {formatDate(days.at(-1)!.local_date)}</span>
      </div>
      <div className="history-calendar-scroll" role="region" tabIndex={0} aria-label="Scrollable calendar heatmap">
        <div className="history-heatmap">
          <div className="history-weekday-labels" aria-hidden="true"><span /><span>Mon</span><span /><span>Wed</span><span /><span>Fri</span><span /></div>
          <div className="history-heatmap-columns" role="group" aria-label="Daily check-in activity, one column per week">
            {weeks.map((week, index) => (
              <div className="history-heatmap-week" role="group" key={week[0].local_date} aria-label={`Week of ${week.find((day) => !day.outsideRange)?.local_date ?? week[0].local_date}`}>
                <span className="history-heatmap-month">{monthForWeek(week, index, weeks)}</span>
                {week.map((day) => {
                  const level = intensity(day.checkin_count);
                  const dayLabel = day.local_date > today
                    ? `${day.local_date}: challenge day has not started yet`
                    : `${day.local_date}: ${day.checkin_count} ${day.checkin_count === 1 ? "check-in" : "check-ins"}`;
                  return (
                    <span
                      className={`history-heatmap-cell history-heatmap-cell--${level}${day.outsideRange ? " is-outside" : ""}${day.local_date === today ? " is-today" : ""}`}
                      key={day.local_date}
                      role="img"
                      aria-label={dayLabel}
                      title={dayLabel}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="history-heatmap-legend" aria-label={`Check-in intensity: none, one, two, or three or more. Highest day has ${mostInDay} check-ins.`}>
        <span>Less</span><i className="history-heatmap-cell--0" aria-hidden="true" /><i className="history-heatmap-cell--1" aria-hidden="true" /><i className="history-heatmap-cell--2" aria-hidden="true" /><i className="history-heatmap-cell--3" aria-hidden="true" /><span>More</span>
      </div>
    </section>
  );
}
