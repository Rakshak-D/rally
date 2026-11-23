import { describe, expect, it } from "vitest";

import { avatarPathSchema, updateProfileSchema } from "./workspace";

describe("profile validation", () => {
  it("trims display names and optional taglines while enforcing the 80 character limit", () => {
    expect(updateProfileSchema.parse({ displayName: " Rally member ", tagline: " Keep showing up. " })).toEqual({
      displayName: "Rally member",
      tagline: "Keep showing up.",
    });
    expect(updateProfileSchema.parse({ displayName: "Rally member" }).tagline).toBe("");
    expect(updateProfileSchema.safeParse({ displayName: "Rally member", tagline: "x".repeat(81) }).success).toBe(false);
  });

  it("accepts only a UUID-owned webp or jpeg avatar path", () => {
    const userId = "01234567-89ab-cdef-0123-456789abcdef";
    expect(avatarPathSchema.safeParse(userId + "/avatar.webp").success).toBe(true);
    expect(avatarPathSchema.safeParse(userId + "/avatar.jpg").success).toBe(true);
    expect(avatarPathSchema.safeParse("other-user/avatar.webp").success).toBe(false);
    expect(avatarPathSchema.safeParse(userId + "/avatar.png").success).toBe(false);
    expect(avatarPathSchema.safeParse(userId + "/nested/avatar.webp").success).toBe(false);
  });
});
