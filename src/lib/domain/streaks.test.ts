import { describe, expect, it } from "vitest";
import * as streaks from "./streaks";

const activeChallenge = {
  startDate: "2026-03-01",
  endDate: "2026-03-10",
  today: "2026-03-03",
};

describe("check-in streaks", () => {
  it("returns zero progress for empty histories", () => {
    expect(streaks.calculateStreaks([], activeChallenge)).toEqual({
      current: 0,
      longest: 0,
      totalDays: 0,
      consistency: 0,
    });
  });

  it("counts distinct consecutive dates through today", () => {
    expect(
      streaks.calculateStreaks(
        ["2026-03-01", "2026-03-02", "2026-03-03", "2026-03-03"],
        activeChallenge,
      ),
    ).toEqual({ current: 3, longest: 3, totalDays: 3, consistency: 100 });
  });

  it("keeps yesterday's streak alive when today has no check-in", () => {
    expect(
      streaks.calculateStreaks(["2026-03-01", "2026-03-02"], activeChallenge),
    ).toEqual({ current: 2, longest: 2, totalDays: 2, consistency: 67 });
  });

  it("resets the current streak after a missed day while preserving the longest run", () => {
    expect(
      streaks.calculateStreaks(["2026-03-01", "2026-03-02"], {
        ...activeChallenge,
        today: "2026-03-04",
      }),
    ).toEqual({ current: 0, longest: 2, totalDays: 2, consistency: 50 });
  });

  it("does not count invalid, future, or out-of-challenge dates", () => {
    expect(
      streaks.calculateStreaks(["bad", "2026-03-04", "2026-02-28", "2026-03-03"], activeChallenge),
    ).toEqual({ current: 1, longest: 1, totalDays: 1, consistency: 33 });
  });

  it("counts consecutive dates across month and year boundaries", () => {
    expect(streaks.calculateStreaks(["2025-12-31", "2026-01-01"], {
      startDate: "2025-12-31",
      endDate: "2026-01-01",
      today: "2026-01-01",
    })).toEqual({ current: 2, longest: 2, totalDays: 2, consistency: 100 });
  });

  it("does not manufacture progress before a future challenge starts", () => {
    expect(streaks.calculateStreaks(["2026-04-01"], {
      startDate: "2026-04-01",
      endDate: "2026-04-10",
      today: "2026-03-31",
    })).toEqual({ current: 0, longest: 0, totalDays: 0, consistency: 0 });
  });
});
