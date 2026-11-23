export type DailyCheckinCount = {
  local_date: string;
  checkin_count: number;
};

export type WeeklyCheckinCount = {
  weekStart: string;
  checkinCount: number;
};

export function aggregateWeeklyCheckins(days: DailyCheckinCount[]): WeeklyCheckinCount[] {
  const weeks = new Map<string, number>();

  for (const day of days) {
    const date = new Date(`${day.local_date}T00:00:00.000Z`);
    if (Number.isNaN(date.getTime())) continue;

    const daysSinceMonday = (date.getUTCDay() + 6) % 7;
    date.setUTCDate(date.getUTCDate() - daysSinceMonday);
    const weekStart = date.toISOString().slice(0, 10);
    weeks.set(weekStart, (weeks.get(weekStart) ?? 0) + Math.max(0, day.checkin_count));
  }

  return [...weeks]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([weekStart, checkinCount]) => ({ weekStart, checkinCount }));
}
