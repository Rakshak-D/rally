const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MILLISECONDS_PER_CALENDAR_DAY = 86_400_000;

function isIsoCalendarDate(value: string): boolean {
  if (!ISO_DATE_PATTERN.test(value)) return false;

  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
}

export function calendarDateOrdinal(value: string): number | null {
  if (!isIsoCalendarDate(value)) return null;

  return new Date(`${value}T00:00:00.000Z`).getTime() / MILLISECONDS_PER_CALENDAR_DAY;
}

export function addCalendarDays(value: string, days: number): string | null {
  const ordinal = calendarDateOrdinal(value);
  if (ordinal === null || !Number.isInteger(days)) return null;

  const result = new Date((ordinal + days) * MILLISECONDS_PER_CALENDAR_DAY);
  if (Number.isNaN(result.valueOf())) return null;
  return result.toISOString().slice(0, 10);
}

export function localDateAt(instant: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    calendar: "iso8601",
    numberingSystem: "latn",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(instant);

  const values = new Map(parts.map(({ type, value }) => [type, value]));
  const year = values.get("year");
  const month = values.get("month");
  const day = values.get("day");

  if (!year || !month || !day) {
    throw new RangeError("Unable to format the instant in the supplied timezone.");
  }

  return `${year.padStart(4, "0")}-${month}-${day}`;
}

export function inclusiveChallengeDay(
  startDate: string,
  endDate: string,
  localDate: string,
): number | null {
  if (
    !isIsoCalendarDate(startDate) ||
    !isIsoCalendarDate(endDate) ||
    !isIsoCalendarDate(localDate) ||
    endDate < startDate ||
    localDate < startDate ||
    localDate > endDate
  ) {
    return null;
  }

  const localOrdinal = calendarDateOrdinal(localDate);
  const startOrdinal = calendarDateOrdinal(startDate);

  if (localOrdinal === null || startOrdinal === null) return null;
  return localOrdinal - startOrdinal + 1;
}
