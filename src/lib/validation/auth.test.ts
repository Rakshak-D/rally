import { describe, expect, it } from "vitest";

import { signInSchema, signUpSchema } from "./auth";

describe("authentication input validation", () => {
  it("normalizes email addresses and accepts bounded sign-in credentials", () => {
    expect(
      signInSchema.parse({ email: "  MEMBER@EXAMPLE.COM ", password: "any valid passphrase" }),
    ).toEqual({ email: "member@example.com", password: "any valid passphrase" });
  });

  it("rejects malformed emails and oversized passwords", () => {
    expect(signInSchema.safeParse({ email: "not-an-email", password: "secret" }).success).toBe(false);
    expect(
      signInSchema.safeParse({ email: "a@example.com", password: "x".repeat(257) }).success,
    ).toBe(false);
  });

  it("requires a longer new password and a readable display name", () => {
    expect(
      signUpSchema.safeParse({
        email: "a@example.com",
        password: "short",
        displayName: "Rally Member",
      }).success,
    ).toBe(false);
    expect(
      signUpSchema.safeParse({
        email: "a@example.com",
        password: "a secure example passphrase",
        displayName: "   ",
      }).success,
    ).toBe(false);
  });

  it("trims the display name and caps registration field lengths", () => {
    expect(
      signUpSchema.parse({
        email: "a@example.com",
        password: "a secure example passphrase",
        displayName: "  Aria  ",
      }),
    ).toEqual({
      email: "a@example.com",
      password: "a secure example passphrase",
      displayName: "Aria",
    });
    expect(
      signUpSchema.safeParse({
        email: "a@example.com",
        password: "a secure example passphrase",
        displayName: "x".repeat(81),
      }).success,
    ).toBe(false);
  });
});
