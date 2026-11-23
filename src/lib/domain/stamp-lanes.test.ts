import { describe, expect, it } from "vitest";

import { assertLaneRange, buildStampDays } from "./stamp-lanes";

describe("buildStampDays", () => {
  it("includes both challenge endpoints and places milestone flags by challenge day", () => {
    const days = buildStampDays("2026-11-01", "2026-11-14", "2026-11-07");

    expect(days).toHaveLength(14);
    expect(days[0]).toEqual({ date: "2026-11-01", dayNumber: 1, state: "past", milestone: null });
    expect(days[2]?.milestone).toBe(3);
    expect(days[6]).toMatchObject({ date: "2026-11-07", dayNumber: 7, state: "today", milestone: 7 });
    expect(days.at(-1)).toMatchObject({ date: "2026-11-14", dayNumber: 14, state: "future", milestone: 14 });
  });

  it("uses calendar dates across month and year boundaries", () => {
    expect(buildStampDays("2026-12-30", "2027-01-02", "2027-01-01")).toEqual([
      { date: "2026-12-30", dayNumber: 1, state: "past", milestone: null },
      { date: "2026-12-31", dayNumber: 2, state: "past", milestone: null },
      { date: "2027-01-01", dayNumber: 3, state: "today", milestone: 3 },
      { date: "2027-01-02", dayNumber: 4, state: "future", milestone: null },
    ]);
  });

  it("keeps the current day inside a 14-day window and includes nearby future days", () => {
    const days = buildStampDays("2026-01-01", "2026-12-31", "2026-11-23", 14);

    expect(days).toHaveLength(14);
    expect(days[0]?.date).toBe("2026-11-13");
    expect(days.find(({ state }) => state === "today")?.date).toBe("2026-11-23");
    expect(days.at(-1)).toMatchObject({ date: "2026-11-26", state: "future" });
  });

  it("shows the first available window for an upcoming challenge", () => {
    const days = buildStampDays("2027-01-01", "2027-12-31", "2026-11-23", 14);

    expect(days).toHaveLength(14);
    expect(days[0]).toMatchObject({ date: "2027-01-01", dayNumber: 1, state: "future" });
    expect(days.at(-1)?.date).toBe("2027-01-14");
  });

  it("shows the final window for a completed challenge", () => {
    const days = buildStampDays("2026-01-01", "2026-12-31", "2027-01-01", 14);

    expect(days).toHaveLength(14);
    expect(days[0]?.date).toBe("2026-12-18");
    expect(days.at(-1)).toMatchObject({ date: "2026-12-31", dayNumber: 365, state: "past" });
  });

  it("returns an empty list for invalid or reversed ranges", () => {
    expect(buildStampDays("2026-02-30", "2026-03-01", "2026-02-28")).toEqual([]);
    expect(buildStampDays("2026-03-02", "2026-03-01", "2026-03-01")).toEqual([]);
    expect(buildStampDays("2026-01-01", "2026-01-02", "not-a-date")).toEqual([]);
  });

  it("caps visible windows at the query-safe 90-day boundary", () => {
    const days = buildStampDays("2026-01-01", "2026-12-31", "2026-06-01", 200);

    expect(days).toHaveLength(90);
    expect(days[0]?.dayNumber).toBeGreaterThan(1);
  });
});

describe("assertLaneRange", () => {
  it("accepts an inclusive range of exactly 90 calendar days", () => {
    expect(() => assertLaneRange("2026-01-01", "2026-03-31")).not.toThrow();
  });

  it("rejects invalid, reversed, and greater-than-90-day ranges", () => {
    expect(() => assertLaneRange("2026-01-01", "2026-04-01")).toThrow(RangeError);
    expect(() => assertLaneRange("2026-03-02", "2026-03-01")).toThrow(RangeError);
    expect(() => assertLaneRange("2026-02-30", "2026-03-01")).toThrow(RangeError);
  });
});
