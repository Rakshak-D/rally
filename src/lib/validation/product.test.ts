import { describe, expect, it } from "vitest";

import { checkinSchema, challengeSchema, goalSchema, taskSchema } from "./product";
import { createInviteSchema, createWorkspaceSchema } from "./workspace";

describe("workspace and product input validation", () => {
  it("accepts and normalizes a workspace with an IANA timezone", () => {
    expect(createWorkspaceSchema.parse({ name: "  Sunday Table ", timezone: "Asia/Kolkata" })).toEqual({
      name: "Sunday Table",
      timezone: "Asia/Kolkata",
    });
  });

  it("rejects invalid timezones and limits invite expiry and use counts", () => {
    expect(createWorkspaceSchema.safeParse({ name: "Rally", timezone: "Mars/Phobos" }).success).toBe(false);
    expect(
      createInviteSchema.safeParse({ workspaceId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", expiresInDays: "31", maxUses: "1" }).success,
    ).toBe(false);
  });

  it("accepts inclusive challenge date ranges and rejects impossible or reversed dates", () => {
    expect(
      challengeSchema.safeParse({
        workspaceId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        title: "60 days of practice",
        description: "",
        startDate: "2026-03-01",
        endDate: "2026-04-29",
      }).success,
    ).toBe(true);
    expect(
      challengeSchema.safeParse({
        workspaceId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        title: "Broken date",
        description: "",
        startDate: "2026-02-30",
        endDate: "2026-03-02",
      }).success,
    ).toBe(false);
    expect(
      challengeSchema.safeParse({
        workspaceId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        title: "Reversed",
        description: "",
        startDate: "2026-04-01",
        endDate: "2026-03-01",
      }).success,
    ).toBe(false);
  });

  it("bounds check-in fields and requires both daily prompts", () => {
    expect(checkinSchema.safeParse({ challengeId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", accomplishment: "", nextPlan: "Tomorrow" }).success).toBe(false);
    expect(checkinSchema.safeParse({ challengeId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", accomplishment: "x".repeat(1201), nextPlan: "Tomorrow" }).success).toBe(false);
    expect(checkinSchema.safeParse({ challengeId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", accomplishment: "Read 12 pages", nextPlan: "Finish the chapter" }).success).toBe(true);
  });

  it("validates task due dates and state transitions against known values", () => {
    const base = {
      workspaceId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      challengeId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      title: "Draft the outline",
      description: "",
    };
    expect(taskSchema.safeParse({ ...base, dueDate: "2026-12-01", status: "in_progress" }).success).toBe(true);
    expect(taskSchema.safeParse({ ...base, dueDate: "2026-02-30", status: "todo" }).success).toBe(false);
    expect(taskSchema.safeParse({ ...base, status: "blocked" }).success).toBe(false);
    expect(goalSchema.safeParse({ ...base, status: "active" }).success).toBe(true);
  });
});
