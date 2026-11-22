import { z } from "zod";

function isValidTimezone(value: string): boolean {
  try {
    new Intl.DateTimeFormat("en", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

export const createWorkspaceSchema = z.object({
  name: z.string().trim().min(1).max(80),
  timezone: z.string().trim().min(1).max(100).refine(isValidTimezone, "Choose a valid timezone."),
});

export const createInviteSchema = z.object({
  workspaceId: z.uuid(),
  expiresInDays: z.coerce.number().int().min(1).max(30).default(7),
  maxUses: z.coerce.number().int().min(1).max(25).default(1),
});

export const inviteTokenSchema = z.string().regex(/^[a-f0-9]{64}$/i);

export const updateProfileSchema = z.object({
  displayName: z.string().trim().min(1).max(80),
});

export const updateWorkspaceSchema = z.object({
  workspaceId: z.uuid(),
  name: z.string().trim().min(1).max(80),
  timezone: z.string().trim().min(1).max(100).refine(isValidTimezone, "Choose a valid timezone."),
});

export const transferWorkspaceOwnershipSchema = z.object({
  workspaceId: z.uuid(),
  newOwnerId: z.uuid(),
}).refine((values) => values.workspaceId !== values.newOwnerId, {
  message: "Choose another workspace member.",
  path: ["newOwnerId"],
});
