import { z } from "zod";

import { calendarDateOrdinal } from "../domain/calendar";

const dateSchema = z.string().refine((value) => calendarDateOrdinal(value) !== null, "Enter a real calendar date.");
const optionalDateSchema = z.preprocess(
  (value) => value === "" || value === undefined ? null : value,
  dateSchema.nullable(),
);
const progressCurrentSchema = z.preprocess(
  (value) => value === "" || value === undefined ? 0 : value,
  z.coerce.number().finite().min(0).max(1_000_000_000),
);
const progressTargetSchema = z.preprocess(
  (value) => value === "" || value === undefined ? null : value,
  z.union([z.null(), z.coerce.number().finite().positive().max(1_000_000_000)]),
);
const progressUnitSchema = z.preprocess(
  (value) => value === undefined || (typeof value === "string" && value.trim() === "") ? null : value,
  z.string().trim().max(24).nullable(),
);
const assigneeIdSchema = z.preprocess(
  (value) => value === "" || value === undefined ? null : value,
  z.uuid().nullable(),
);
const workspaceIdSchema = z.uuid();
const challengeIdSchema = z.uuid();

export const challengeSchema = z
  .object({
    workspaceId: workspaceIdSchema,
    title: z.string().trim().min(1).max(100),
    description: z.string().trim().max(1200).default(""),
    startDate: dateSchema,
    endDate: dateSchema,
  })
  .refine((challenge) => challenge.endDate >= challenge.startDate, {
    message: "The end date must be the same as or after the start date.",
    path: ["endDate"],
  });

export const updateChallengeSchema = challengeSchema.extend({ challengeId: challengeIdSchema });

export const checkinSchema = z.object({
  challengeId: challengeIdSchema,
  accomplishment: z.string().trim().min(1).max(1200),
  nextPlan: z.string().trim().min(1).max(1200),
  notes: z.string().trim().max(1200).default(""),
});

const goalFields = {
  title: z.string().trim().min(1).max(100),
  description: z.string().trim().max(1200).default(""),
  status: z.enum(["active", "completed"]).default("active"),
  progressCurrent: progressCurrentSchema,
  progressTarget: progressTargetSchema,
  progressUnit: progressUnitSchema,
};

export const goalSchema = z.object({
  workspaceId: workspaceIdSchema,
  challengeId: challengeIdSchema,
  ...goalFields,
}).refine((goal) => goal.progressTarget === null || goal.progressCurrent <= goal.progressTarget, {
  message: "Current progress cannot be greater than the target.",
  path: ["progressCurrent"],
});

export const updateGoalSchema = z.object({
  goalId: z.uuid(),
  ...goalFields,
}).refine((goal) => goal.progressTarget === null || goal.progressCurrent <= goal.progressTarget, {
  message: "Current progress cannot be greater than the target.",
  path: ["progressCurrent"],
});

export const taskSchema = z.object({
  workspaceId: workspaceIdSchema,
  challengeId: challengeIdSchema,
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(1200).default(""),
  dueDate: optionalDateSchema,
  status: z.enum(["todo", "in_progress", "completed"]).default("todo"),
  assigneeId: assigneeIdSchema,
});

export const updateTaskSchema = z.object({
  taskId: z.uuid(),
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(1200).default(""),
  dueDate: optionalDateSchema,
  status: z.enum(["todo", "in_progress", "completed"]),
  assigneeId: assigneeIdSchema,
});

export const assignedTaskStatusSchema = z.object({
  taskId: z.uuid(),
  status: z.enum(["todo", "in_progress", "completed"]),
});
