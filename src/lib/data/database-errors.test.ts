import { describe, expect, it } from "vitest";

import { safeDatabaseMessage } from "./database-errors";

const copy = {
  fallback: "The change could not be saved.",
  permission: "You do not have permission to make this change.",
  conflict: "This record already exists.",
  validation: "Review the values and try again.",
};

describe("safeDatabaseMessage", () => {
  it("recognizes only the schema's explicit rate-limit exception", () => {
    expect(safeDatabaseMessage({ code: "P0001", message: "rate limit exceeded" }, copy))
      .toBe("Too many attempts. Please try again later.");
    expect(safeDatabaseMessage({ code: "P0001", message: "some other raised exception" }, copy))
      .toBe(copy.fallback);
  });

  it("keeps permission and constraint failures distinct", () => {
    expect(safeDatabaseMessage({ code: "42501", message: "workspace owner role required" }, copy))
      .toBe(copy.permission);
    expect(safeDatabaseMessage({ code: "23505", message: "duplicate key value" }, copy))
      .toBe(copy.conflict);
    expect(safeDatabaseMessage({ code: "22023", message: "invalid date" }, copy))
      .toBe(copy.validation);
  });

  it("does not expose unexpected database messages", () => {
    expect(safeDatabaseMessage({ code: "XX000", message: "private connection detail" }, copy))
      .toBe(copy.fallback);
    expect(safeDatabaseMessage(null, copy)).toBe(copy.fallback);
  });
});
