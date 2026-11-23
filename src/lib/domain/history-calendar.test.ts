import { describe, expect, it } from "vitest";

import { buildHistoryCalendarDays } from "./history-calendar";

describe("buildHistoryCalendarDays", () => {
  it("shows the full short challenge range, including upcoming days", () => {
    const days = buildHistoryCalendarDays(
      [{ local_date: "2026-11-23", checkin_count: 2 }],
      { startDate: "2026-11-23", endDate: "2027-01-21", today: "2026-11-23" },
    );

    expect(days).toHaveLength(60);
    expect(days[0]).toEqual({ local_date: "2026-11-23", checkin_count: 2 });
    expect(days.at(-1)).toEqual({ local_date: "2027-01-21", checkin_count: 0 });
  });

  it("limits long active challenges to their latest 84 days", () => {
    const days = buildHistoryCalendarDays([], {
      startDate: "2026-01-01",
      endDate: "2027-01-01",
      today: "2026-11-23",
    });

    expect(days).toHaveLength(84);
    expect(days[0]?.local_date).toBe("2026-09-01");
    expect(days.at(-1)?.local_date).toBe("2026-11-23");
  });

  it("shows the first 84 days for a long upcoming challenge", () => {
    const days = buildHistoryCalendarDays([], {
      startDate: "2027-01-01",
      endDate: "2027-12-31",
      today: "2026-11-23",
    });

    expect(days).toHaveLength(84);
    expect(days[0]?.local_date).toBe("2027-01-01");
    expect(days.at(-1)?.local_date).toBe("2027-03-25");
  });
});
