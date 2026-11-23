import { describe, expect, it } from "vitest";

import { aggregateWeeklyCheckins } from "./weekly-checkins";

describe("aggregateWeeklyCheckins", () => {
  it("returns no weeks for an empty calendar", () => {
    expect(aggregateWeeklyCheckins([])).toEqual([]);
  });

  it("groups Sunday-to-Monday boundaries into Monday-start weeks", () => {
    expect(aggregateWeeklyCheckins([
      { local_date: "2026-11-30", checkin_count: 3 },
      { local_date: "2026-11-22", checkin_count: 2 },
      { local_date: "2026-11-29", checkin_count: 0 },
      { local_date: "2026-11-23", checkin_count: 1 },
    ])).toEqual([
      { weekStart: "2026-11-16", checkinCount: 2 },
      { weekStart: "2026-11-23", checkinCount: 1 },
      { weekStart: "2026-11-30", checkinCount: 3 },
    ]);
  });

  it("retains quiet weeks with zero check-ins", () => {
    expect(aggregateWeeklyCheckins([
      { local_date: "2026-11-02", checkin_count: 0 },
      { local_date: "2026-11-03", checkin_count: 0 },
      { local_date: "2026-11-09", checkin_count: 2 },
    ])).toEqual([
      { weekStart: "2026-11-02", checkinCount: 0 },
      { weekStart: "2026-11-09", checkinCount: 2 },
    ]);
  });
});
