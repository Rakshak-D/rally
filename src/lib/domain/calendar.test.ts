import { describe, expect, it } from "vitest";
import * as calendar from "./calendar";

describe("challenge calendar", () => {
  it("maps an instant to the supplied IANA calendar date", () => {
    expect(
      calendar.localDateAt(new Date("2026-01-01T05:00:00.000Z"), "America/New_York"),
    ).toBe("2026-01-01");
  });

  it("counts the challenge start as day one and the inclusive end as the final day", () => {
    expect(calendar.inclusiveChallengeDay("2026-03-01", "2026-03-30", "2026-03-01")).toBe(1);
    expect(calendar.inclusiveChallengeDay("2026-03-01", "2026-03-30", "2026-03-30")).toBe(30);
    expect(calendar.inclusiveChallengeDay("2026-03-01", "2026-03-30", "2026-03-31")).toBeNull();
  });

  it("adds calendar days inclusively across leap days and year boundaries", () => {
    expect(calendar.addCalendarDays("2026-12-31", 59)).toBe("2027-02-28");
    expect(calendar.addCalendarDays("2024-02-28", 1)).toBe("2024-02-29");
    expect(calendar.addCalendarDays("2026-02-30", 1)).toBeNull();
  });

  it("formats local date values as compact editorial labels", () => {
    expect(calendar.formatCalendarDate("2026-11-23")).toBe("Mon 23 Nov");
    expect(calendar.formatCalendarDate("2027-01-01")).toBe("Fri 1 Jan");
    expect(() => calendar.formatCalendarDate("2026-02-30")).toThrow(RangeError);
  });

  it("rejects impossible date strings instead of manufacturing a challenge day", () => {
    expect(calendar.inclusiveChallengeDay("2026-02-30", "2026-03-02", "2026-03-01")).toBeNull();
  });

  it("maps midnight and daylight-saving instants to calendar dates without rolling dates", () => {
    expect(calendar.localDateAt(new Date("2026-03-08T04:59:59.000Z"), "America/New_York")).toBe("2026-03-07");
    expect(calendar.localDateAt(new Date("2026-03-08T05:00:00.000Z"), "America/New_York")).toBe("2026-03-08");
    expect(calendar.localDateAt(new Date("2026-03-08T07:00:00.000Z"), "America/New_York")).toBe("2026-03-08");
  });

  it("surfaces an invalid timezone instead of silently using the host timezone", () => {
    expect(() => calendar.localDateAt(new Date("2026-01-01T00:00:00.000Z"), "Mars/Phobos")).toThrow(RangeError);
  });
});
