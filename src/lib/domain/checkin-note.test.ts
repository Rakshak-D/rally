import { describe, expect, it } from "vitest";

import { parseCheckinNote, serializeCheckinNote } from "./checkin-note";

describe("check-in notes", () => {
  it("stores and reads blocker state with the existing text column", () => {
    expect(serializeCheckinNote("  Need a hand with the schedule.  ", true)).toBe("Blocker: Need a hand with the schedule.");
    expect(parseCheckinNote("Blocker: Need a hand with the schedule.")).toEqual({
      text: "Need a hand with the schedule.",
      isBlocker: true,
    });
  });

  it("recognizes older blocker notes and leaves ordinary notes unchanged", () => {
    expect(parseCheckinNote("blocked by a missing part")).toEqual({
      text: "blocked by a missing part",
      isBlocker: true,
    });
    expect(parseCheckinNote("A useful note for everyone.")).toEqual({
      text: "A useful note for everyone.",
      isBlocker: false,
    });
  });

  it("does not create a blocker prefix for an empty note", () => {
    expect(serializeCheckinNote("   ", true)).toBe("");
    expect(parseCheckinNote(null)).toEqual({ text: "", isBlocker: false });
  });
});
