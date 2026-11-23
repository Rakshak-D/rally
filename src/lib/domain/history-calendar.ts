import { addCalendarDays, calendarDateOrdinal } from "./calendar";

export type HistoryCalendarDay = { local_date: string; checkin_count: number };
export type HistoryChallengeRange = { startDate: string; endDate: string; today: string };

const VISIBLE_CALENDAR_DAYS = 84;

export function buildHistoryCalendarDays(
  activity: HistoryCalendarDay[],
  challenge: HistoryChallengeRange,
): HistoryCalendarDay[] {
  const start = calendarDateOrdinal(challenge.startDate);
  const end = calendarDateOrdinal(challenge.endDate);
  const today = calendarDateOrdinal(challenge.today);
  if (start === null || end === null || today === null || end < start) return activity;

  const count = end - start + 1;
  const through = today < start ? Math.min(end, start + VISIBLE_CALENDAR_DAYS - 1) : Math.min(end, today);
  const visibleStart = count <= VISIBLE_CALENDAR_DAYS
    ? start
    : Math.max(start, through - VISIBLE_CALENDAR_DAYS + 1);
  const visibleEnd = count <= VISIBLE_CALENDAR_DAYS ? end : through;
  const checkins = new Map(activity.map(({ local_date, checkin_count }) => [local_date, Math.max(0, checkin_count)]));
  const days: HistoryCalendarDay[] = [];

  for (let ordinal = visibleStart; ordinal <= visibleEnd; ordinal += 1) {
    const date = addCalendarDays(challenge.startDate, ordinal - start);
    if (!date) return activity;
    days.push({ local_date: date, checkin_count: checkins.get(date) ?? 0 });
  }

  return days;
}
