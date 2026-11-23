import { addCalendarDays, calendarDateOrdinal } from "./calendar";

export type StampMilestone = 3 | 7 | 14 | 30;
export type StampDayState = "past" | "today" | "future";
export type StampDay = {
  date: string;
  dayNumber: number;
  state: StampDayState;
  milestone: StampMilestone | null;
};

export const MAX_LANE_RANGE_DAYS = 90;
const milestoneDays = new Set<number>([3, 7, 14, 30]);

export function assertLaneRange(startDate: string, endDate: string): void {
  const start = calendarDateOrdinal(startDate);
  const end = calendarDateOrdinal(endDate);
  if (start === null || end === null || end < start || end - start + 1 > MAX_LANE_RANGE_DAYS) {
    throw new RangeError(`Lane date range must contain between 1 and ${MAX_LANE_RANGE_DAYS} valid calendar days.`);
  }
}

export function buildStampDays(
  startDate: string,
  endDate: string,
  today: string,
  windowSize = MAX_LANE_RANGE_DAYS,
): StampDay[] {
  const start = calendarDateOrdinal(startDate);
  const end = calendarDateOrdinal(endDate);
  const todayOrdinal = calendarDateOrdinal(today);
  if (start === null || end === null || todayOrdinal === null || end < start || !Number.isInteger(windowSize) || windowSize < 1) {
    return [];
  }

  const challengeDays = end - start + 1;
  const visibleCount = Math.min(challengeDays, windowSize, MAX_LANE_RANGE_DAYS);
  let visibleStart = start;
  if (challengeDays > visibleCount) {
    if (todayOrdinal < start) visibleStart = start;
    else if (todayOrdinal > end) visibleStart = end - visibleCount + 1;
    else visibleStart = Math.max(start, todayOrdinal - Math.floor(visibleCount * 0.75));
  }
  const visibleEnd = Math.min(end, visibleStart + visibleCount - 1);
  visibleStart = Math.max(start, visibleEnd - visibleCount + 1);

  const days: StampDay[] = [];
  for (let ordinal = visibleStart; ordinal <= visibleEnd; ordinal += 1) {
    const date = addCalendarDays(startDate, ordinal - start);
    if (!date) return [];
    const dayNumber = ordinal - start + 1;
    days.push({
      date,
      dayNumber,
      state: ordinal === todayOrdinal ? "today" : ordinal < todayOrdinal ? "past" : "future",
      milestone: milestoneDays.has(dayNumber) ? dayNumber as StampMilestone : null,
    });
  }
  return days;
}
