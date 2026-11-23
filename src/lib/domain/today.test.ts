import { describe, expect, it } from "vitest";

import { greetingForUser, relativeTimeLabel, streakMilestoneProgress } from "./today";

describe("greetingForUser", () => {
  it("uses the workspace-local hour at day boundaries", () => {
    expect(greetingForUser(new Date("2026-11-23T02:00:00.000Z"), "Asia/Kolkata", "Mina"))
      .toBe("Good morning, Mina");
    expect(greetingForUser(new Date("2026-11-23T08:00:00.000Z"), "Asia/Kolkata", "Mina"))
      .toBe("Good afternoon, Mina");
    expect(greetingForUser(new Date("2026-11-23T13:00:00.000Z"), "Asia/Kolkata", "Mina"))
      .toBe("Good evening, Mina");
  });

  it("falls back to a friendly name when the profile name is empty", () => {
    expect(greetingForUser(new Date("2026-11-23T10:00:00.000Z"), "UTC", "  "))
      .toBe("Good morning, there");
  });
});

describe("streakMilestoneProgress", () => {
  it("reports progress toward the next milestone", () => {
    expect(streakMilestoneProgress(0)).toEqual({ previous: 0, next: 3, daysRemaining: 3, percent: 0 });
    expect(streakMilestoneProgress(3)).toEqual({ previous: 3, next: 7, daysRemaining: 4, percent: 0 });
    expect(streakMilestoneProgress(6)).toEqual({ previous: 3, next: 7, daysRemaining: 1, percent: 75 });
  });

  it("caps progress after the last milestone", () => {
    expect(streakMilestoneProgress(100)).toEqual({ previous: 100, next: null, daysRemaining: 0, percent: 100 });
    expect(streakMilestoneProgress(120)).toEqual({ previous: 100, next: null, daysRemaining: 0, percent: 100 });
  });
});

describe("relativeTimeLabel", () => {
  const now = new Date("2026-11-23T10:00:00.000Z");

  it("formats recent activity with compact relative labels", () => {
    expect(relativeTimeLabel("2026-11-23T08:00:00.000Z", now)).toBe("2h ago");
    expect(relativeTimeLabel("2026-11-23T09:55:00.000Z", now)).toBe("5m ago");
    expect(relativeTimeLabel("2026-11-23T09:59:40.000Z", now)).toBe("Just now");
  });

  it("uses a dated label for older and future activity", () => {
    expect(relativeTimeLabel("2026-11-20T10:00:00.000Z", now)).toBe("3d ago");
    expect(relativeTimeLabel("2026-11-23T11:00:00.000Z", now)).toBe("in 1h");
  });
});
