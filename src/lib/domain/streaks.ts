import { calendarDateOrdinal } from "./calendar";

export type ChallengeDates = {
  startDate: string;
  endDate: string;
  today: string;
};

export type StreakSummary = {
  current: number;
  longest: number;
  totalDays: number;
  consistency: number;
};

export function calculateStreaks(
  checkinDates: readonly string[],
  challenge: ChallengeDates,
): StreakSummary {
  const start = calendarDateOrdinal(challenge.startDate);
  const end = calendarDateOrdinal(challenge.endDate);
  const today = calendarDateOrdinal(challenge.today);

  if (start === null || end === null || today === null || end < start) {
    return { current: 0, longest: 0, totalDays: 0, consistency: 0 };
  }

  const checkinOrdinals = new Set<number>();

  for (const checkinDate of checkinDates) {
    const ordinal = calendarDateOrdinal(checkinDate);
    if (ordinal !== null && ordinal >= start && ordinal <= end && ordinal <= today) {
      checkinOrdinals.add(ordinal);
    }
  }

  const sortedDates = [...checkinOrdinals].sort((left, right) => left - right);
  let longest = 0;
  let run = 0;
  let previous: number | null = null;

  for (const date of sortedDates) {
    run = previous !== null && date === previous + 1 ? run + 1 : 1;
    longest = Math.max(longest, run);
    previous = date;
  }

  let cursor = checkinOrdinals.has(today)
    ? today
    : checkinOrdinals.has(today - 1)
      ? today - 1
      : null;
  let current = 0;

  while (cursor !== null && checkinOrdinals.has(cursor)) {
    current += 1;
    cursor -= 1;
  }

  const elapsedThrough = Math.min(today, end);
  const elapsedDays = Math.max(0, elapsedThrough - start + 1);
  const totalDays = checkinOrdinals.size;
  const consistency = elapsedDays === 0 ? 0 : Math.round((totalDays / elapsedDays) * 100);

  return { current, longest, totalDays, consistency };
}
