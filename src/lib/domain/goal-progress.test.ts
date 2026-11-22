import { describe, expect, it } from "vitest";

import { goalProgressPercent } from "./goal-progress";

describe("goalProgressPercent", () => {
  it("returns a bounded whole-number percentage for a target", () => {
    expect(goalProgressPercent(3, 8)).toBe(38);
    expect(goalProgressPercent(0, 8)).toBe(0);
    expect(goalProgressPercent(10, 8)).toBe(100);
  });

  it("returns null when the goal has no target", () => {
    expect(goalProgressPercent(3, null)).toBeNull();
  });
});
