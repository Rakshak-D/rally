"use server";

import { createHash, randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getSiteUrl } from "@/lib/config";
import { safeDatabaseMessage, type DatabaseErrorLike } from "@/lib/data/database-errors";
import type { ActionState } from "@/lib/forms/state";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { assignedTaskStatusSchema, checkinSchema, challengeSchema, goalSchema, taskSchema, updateChallengeSchema, updateGoalSchema, updateTaskSchema } from "@/lib/validation/product";
import { createInviteSchema, createWorkspaceSchema, inviteTokenSchema, transferWorkspaceOwnershipSchema, updateProfileSchema, updateWorkspaceSchema } from "@/lib/validation/workspace";
import { validationFailure } from "@/lib/forms/state";

function readField(formData: FormData, name: string): string | undefined {
  const value = formData.get(name);
  return typeof value === "string" ? value : undefined;
}

async function authenticatedClient() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) redirect("/sign-in");
  return { supabase, user: data.user };
}

function databaseFailure(
  fallback: string,
  error?: DatabaseErrorLike | null,
  copy: Partial<{ permission: string; conflict: string; validation: string }> = {},
): ActionState {
  if (!error) return { kind: "error", message: fallback };
  return {
    kind: "error",
    message: safeDatabaseMessage(error, {
      fallback,
      permission: copy.permission ?? "You do not have permission to make this change.",
      conflict: copy.conflict ?? fallback,
      validation: copy.validation ?? fallback,
    }),
  };
}

export async function createWorkspaceAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = createWorkspaceSchema.safeParse({
    name: readField(formData, "name"),
    timezone: readField(formData, "timezone"),
  });
  if (!parsed.success) return databaseFailure("Add a workspace name and choose a valid timezone.");

  const { supabase } = await authenticatedClient();
  const { data, error } = await supabase.rpc("create_workspace", {
    p_name: parsed.data.name,
    p_timezone: parsed.data.timezone,
  });
  if (error || !data) return databaseFailure("The workspace could not be created. Try again in a moment.", error);

  revalidatePath("/app");
  redirect(`/app?workspace=${encodeURIComponent(data)}`);
}

export async function redeemInviteAction(
  token: string,
  _previous: ActionState,
  _formData: FormData,
): Promise<ActionState> {
  void _previous;
  void _formData;
  const parsed = inviteTokenSchema.safeParse(token);
  if (!parsed.success) return databaseFailure("This invite is unavailable. Ask its owner for a new link.");

  const { supabase } = await authenticatedClient();
  const tokenHash = createHash("sha256").update(parsed.data.toLowerCase()).digest("hex");
  const { data, error } = await supabase.rpc("redeem_invite", { p_token_hash: tokenHash });
  if (error || !data || typeof data !== "object" || Array.isArray(data)) {
    return databaseFailure("This invite is unavailable. Ask its owner for a new link.");
  }

  const status = data.status;
  const workspaceId = data.workspace_id;
  if ((status === "joined" || status === "already_member") && typeof workspaceId === "string") {
    revalidatePath("/app");
    redirect(`/app?workspace=${encodeURIComponent(workspaceId)}`);
  }

  return databaseFailure("This invite is unavailable. Ask its owner for a new link.");
}

export async function createInviteAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = createInviteSchema.safeParse({
    workspaceId: readField(formData, "workspaceId"),
    expiresInDays: readField(formData, "expiresInDays"),
    maxUses: readField(formData, "maxUses"),
  });
  if (!parsed.success) return databaseFailure("Choose a valid expiry and usage limit.");

  const { supabase } = await authenticatedClient();
  const token = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const expiresAt = new Date(Date.now() + parsed.data.expiresInDays * 24 * 60 * 60 * 1000).toISOString();
  const { error } = await supabase.rpc("create_invite", {
    p_workspace_id: parsed.data.workspaceId,
    p_token_hash: tokenHash,
    p_expires_at: expiresAt,
    p_max_uses: parsed.data.maxUses,
  });
  if (error) return databaseFailure(
    "The invitation could not be created. Try again in a moment.",
    error,
    { permission: "Only a workspace owner can create invitations." },
  );

  const link = new URL(`/join/${token}`, getSiteUrl()).toString();
  revalidatePath("/settings");
  return { kind: "success", message: "Copy this private link. It will be shown only once.", link };
}

export async function revokeInviteAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const inviteId = readField(formData, "inviteId");
  if (!inviteId) return databaseFailure("Select an invitation to revoke.");

  const { supabase } = await authenticatedClient();
  const { error } = await supabase.rpc("revoke_invite", { p_invite_id: inviteId });
  if (error) return databaseFailure("The invitation could not be revoked.", error, { permission: "Only a workspace owner can revoke invitations." });

  revalidatePath("/settings");
  return { kind: "success", message: "Invitation revoked." };
}

export async function updateProfileAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = updateProfileSchema.safeParse({ displayName: readField(formData, "displayName") });
  if (!parsed.success) return databaseFailure("Your name must be between 1 and 80 characters.");

  const { supabase, user } = await authenticatedClient();
  const { data, error } = await supabase.from("profiles").update({ display_name: parsed.data.displayName }).eq("id", user.id).select("id").maybeSingle();
  if (error || !data) return databaseFailure("Your profile could not be updated.", error);

  revalidatePath("/app");
  revalidatePath("/settings");
  return { kind: "success", message: "Profile saved." };
}

export async function updateWorkspaceAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = updateWorkspaceSchema.safeParse({
    workspaceId: readField(formData, "workspaceId"),
    name: readField(formData, "name"),
    timezone: readField(formData, "timezone"),
  });
  if (!parsed.success) return databaseFailure("Add a workspace name and choose a valid timezone.");

  const { supabase } = await authenticatedClient();
  const { data, error } = await supabase
    .from("workspaces")
    .update({ name: parsed.data.name, timezone: parsed.data.timezone })
    .eq("id", parsed.data.workspaceId)
    .select("id")
    .maybeSingle();
  if (error || !data) return databaseFailure("The workspace settings could not be saved.", error, { permission: "Only a workspace owner can change these settings." });

  revalidatePath("/app");
  revalidatePath("/settings");
  return { kind: "success", message: "Workspace settings saved." };
}

export async function leaveWorkspaceAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const workspaceId = readField(formData, "workspaceId");
  if (!workspaceId) return databaseFailure("Select a workspace first.");

  const { supabase } = await authenticatedClient();
  const { error } = await supabase.rpc("leave_workspace", { p_workspace_id: workspaceId });
  if (error) return databaseFailure("The workspace could not be left.", error, { permission: "Workspace owners must hand off ownership before leaving." });

  revalidatePath("/app");
  redirect("/app");
}

export async function removeWorkspaceMemberAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const workspaceId = readField(formData, "workspaceId");
  const userId = readField(formData, "userId");
  if (!workspaceId || !userId) return databaseFailure("Select a member to remove.");

  const { supabase } = await authenticatedClient();
  const { error } = await supabase.rpc("remove_workspace_member", {
    p_workspace_id: workspaceId,
    p_user_id: userId,
  });
  if (error) return databaseFailure("The member could not be removed.", error, { permission: "Only a workspace owner can remove a member." });

  revalidatePath("/settings");
  revalidatePath("/app");
  return { kind: "success", message: "Member removed from the workspace." };
}

export async function createChallengeAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = challengeSchema.safeParse({
    workspaceId: readField(formData, "workspaceId"),
    title: readField(formData, "title"),
    description: readField(formData, "description") ?? "",
    startDate: readField(formData, "startDate"),
    endDate: readField(formData, "endDate"),
  });
  if (!parsed.success) return databaseFailure("Review the title and inclusive challenge dates.");

  const { supabase } = await authenticatedClient();
  const { data: workspace } = await supabase
    .from("workspaces")
    .select("timezone")
    .eq("id", parsed.data.workspaceId)
    .maybeSingle();
  if (!workspace) return databaseFailure("Choose a workspace you belong to.");

  const { data, error } = await supabase
    .from("challenges")
    .insert({
      workspace_id: parsed.data.workspaceId,
      title: parsed.data.title,
      description: parsed.data.description,
      start_date: parsed.data.startDate,
      end_date: parsed.data.endDate,
      timezone: workspace.timezone,
    })
    .select("id")
    .single();
  if (error || !data) return databaseFailure(
    "The challenge could not be created. Check the dates and try again.",
    error,
    {
      permission: "Only a workspace owner can start a challenge.",
      conflict: "Those dates overlap another challenge in this workspace.",
      validation: "Check the title and challenge dates.",
    },
  );

  revalidatePath("/app");
  redirect(`/app?workspace=${encodeURIComponent(parsed.data.workspaceId)}`);
}

export async function updateChallengeAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = updateChallengeSchema.safeParse({
    challengeId: readField(formData, "challengeId"),
    workspaceId: readField(formData, "workspaceId"),
    title: readField(formData, "title"),
    description: readField(formData, "description") ?? "",
    startDate: readField(formData, "startDate"),
    endDate: readField(formData, "endDate"),
  });
  if (!parsed.success) return databaseFailure("Review the title and inclusive challenge dates.");

  const { supabase } = await authenticatedClient();
  const { data: challenge } = await supabase
    .from("challenges")
    .select("timezone")
    .eq("id", parsed.data.challengeId)
    .eq("workspace_id", parsed.data.workspaceId)
    .maybeSingle();
  if (!challenge) return databaseFailure("Choose a challenge you can manage.");

  const { data, error } = await supabase
    .from("challenges")
    .update({
      title: parsed.data.title,
      description: parsed.data.description,
      start_date: parsed.data.startDate,
      end_date: parsed.data.endDate,
      timezone: challenge.timezone,
    })
    .eq("id", parsed.data.challengeId)
    .eq("workspace_id", parsed.data.workspaceId)
    .select("id")
    .maybeSingle();
  if (error || !data) {
    return databaseFailure("The challenge could not be updated.", error, {
      permission: "Only a workspace owner can edit this challenge.",
      conflict: "Those dates overlap another challenge.",
      validation: "Check the title and challenge dates.",
    });
  }

  revalidatePath("/app");
  revalidatePath("/settings");
  return { kind: "success", message: "Challenge details saved." };
}

export async function saveCheckinAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = checkinSchema.safeParse({
    challengeId: readField(formData, "challengeId"),
    accomplishment: readField(formData, "accomplishment"),
    nextPlan: readField(formData, "nextPlan"),
    notes: readField(formData, "notes") ?? "",
  });
  if (!parsed.success) return databaseFailure("Add what you did and what you plan to do next.");

  const { supabase } = await authenticatedClient();
  const { data, error } = await supabase.rpc("save_checkin", {
    p_challenge_id: parsed.data.challengeId,
    p_accomplishment: parsed.data.accomplishment,
    p_next_plan: parsed.data.nextPlan,
    p_notes: parsed.data.notes,
  });
  if (error) return databaseFailure("Today's check-in could not be saved. Refresh and try again.", error, {
    conflict: "Today's check-in was just saved. Refresh to edit it.",
    validation: "The challenge is outside its check-in dates.",
  });

  const status = data && typeof data === "object" && !Array.isArray(data) ? data.status : null;
  if (status !== "created" && status !== "updated") {
    return databaseFailure("Today's check-in could not be saved. Refresh and try again.");
  }

  revalidatePath("/app");
  revalidatePath("/history");
  return { kind: "success", message: status === "updated" ? "Today's check-in updated." : "Today's check-in saved." };
}

export async function createGoalAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = goalSchema.safeParse({
    workspaceId: readField(formData, "workspaceId"),
    challengeId: readField(formData, "challengeId"),
    title: readField(formData, "title"),
    description: readField(formData, "description") ?? "",
    status: readField(formData, "status") ?? "active",
    progressCurrent: readField(formData, "progressCurrent"),
    progressTarget: readField(formData, "progressTarget"),
    progressUnit: readField(formData, "progressUnit"),
  });
  if (!parsed.success) return validationFailure("Review the goal fields and try again.", parsed.error.issues);

  const { supabase } = await authenticatedClient();
  const { error } = await supabase.from("goals").insert({
    workspace_id: parsed.data.workspaceId,
    challenge_id: parsed.data.challengeId,
    title: parsed.data.title,
    description: parsed.data.description,
    status: parsed.data.status,
    progress_current: parsed.data.progressCurrent,
    progress_target: parsed.data.progressTarget,
    progress_unit: parsed.data.progressUnit,
  });
  if (error) return databaseFailure("The goal could not be created in this workspace.", error);

  revalidatePath("/app");
  revalidatePath("/goals");
  return { kind: "success", message: "Goal created." };
}

export async function updateGoalAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = updateGoalSchema.safeParse({
    goalId: readField(formData, "goalId"),
    title: readField(formData, "title"),
    description: readField(formData, "description") ?? "",
    status: readField(formData, "status"),
    progressCurrent: readField(formData, "progressCurrent"),
    progressTarget: readField(formData, "progressTarget"),
    progressUnit: readField(formData, "progressUnit"),
  });
  if (!parsed.success) return validationFailure("Review the goal fields and try again.", parsed.error.issues);

  const { supabase } = await authenticatedClient();
  const { data, error } = await supabase.from("goals").update({
    title: parsed.data.title,
    description: parsed.data.description,
    status: parsed.data.status,
    progress_current: parsed.data.progressCurrent,
    progress_target: parsed.data.progressTarget,
    progress_unit: parsed.data.progressUnit,
  }).eq("id", parsed.data.goalId).select("id").maybeSingle();
  if (error || !data) return databaseFailure("This goal could not be updated.", error);

  revalidatePath("/app");
  revalidatePath("/goals");
  return { kind: "success", message: "Goal updated." };
}

export async function deleteGoalAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const goalId = readField(formData, "goalId");
  if (!goalId) return databaseFailure("Select a goal to delete.");

  const { supabase, user } = await authenticatedClient();
  const { data, error } = await supabase.from("goals").update({ deleted_at: new Date().toISOString() }).eq("id", goalId).eq("owner_id", user.id).is("deleted_at", null).select("id").maybeSingle();
  if (error || !data) return databaseFailure("This goal could not be removed.", error);

  revalidatePath("/app");
  revalidatePath("/goals");
  return { kind: "success", message: "Goal moved to deleted items. You can restore it from Goals." };
}

export async function restoreGoalAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const goalId = readField(formData, "goalId");
  if (!goalId) return databaseFailure("Select a goal to restore.");
  const { supabase, user } = await authenticatedClient();
  const { data, error } = await supabase.from("goals").update({ deleted_at: null }).eq("id", goalId).eq("owner_id", user.id).not("deleted_at", "is", null).select("id").maybeSingle();
  if (error || !data) return databaseFailure("This goal could not be restored.", error);
  revalidatePath("/goals");
  revalidatePath("/app");
  return { kind: "success", message: "Goal restored." };
}

export async function createTaskAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = taskSchema.safeParse({
    workspaceId: readField(formData, "workspaceId"),
    challengeId: readField(formData, "challengeId"),
    title: readField(formData, "title"),
    description: readField(formData, "description") ?? "",
    dueDate: readField(formData, "dueDate"),
    status: readField(formData, "status") ?? "todo",
    assigneeId: readField(formData, "assigneeId"),
  });
  if (!parsed.success) return validationFailure("Review the task fields and try again.", parsed.error.issues);

  const { supabase } = await authenticatedClient();
  const { error } = await supabase.from("tasks").insert({
    workspace_id: parsed.data.workspaceId,
    challenge_id: parsed.data.challengeId,
    title: parsed.data.title,
    description: parsed.data.description,
    due_date: parsed.data.dueDate,
    status: parsed.data.status,
    assignee_id: parsed.data.assigneeId,
  });
  if (error) return databaseFailure("The task could not be created in this workspace.", error);

  revalidatePath("/app");
  revalidatePath("/tasks");
  return { kind: "success", message: "Task created." };
}

export async function updateTaskAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = updateTaskSchema.safeParse({
    taskId: readField(formData, "taskId"),
    title: readField(formData, "title"),
    description: readField(formData, "description") ?? "",
    dueDate: readField(formData, "dueDate"),
    status: readField(formData, "status"),
    assigneeId: readField(formData, "assigneeId"),
  });
  if (!parsed.success) return validationFailure("Review the task fields and try again.", parsed.error.issues);

  const { supabase, user } = await authenticatedClient();
  const { data, error } = await supabase.from("tasks").update({
    title: parsed.data.title,
    description: parsed.data.description,
    due_date: parsed.data.dueDate,
    status: parsed.data.status,
    assignee_id: parsed.data.assigneeId,
  }).eq("id", parsed.data.taskId).eq("owner_id", user.id).is("deleted_at", null).select("id").maybeSingle();
  if (error || !data) return databaseFailure("This task could not be updated.", error);

  revalidatePath("/app");
  revalidatePath("/tasks");
  return { kind: "success", message: "Task updated." };
}

export async function deleteTaskAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const taskId = readField(formData, "taskId");
  if (!taskId) return databaseFailure("Select a task to delete.");

  const { supabase, user } = await authenticatedClient();
  const { data, error } = await supabase.from("tasks").update({ deleted_at: new Date().toISOString() }).eq("id", taskId).eq("owner_id", user.id).is("deleted_at", null).select("id").maybeSingle();
  if (error || !data) return databaseFailure("This task could not be removed.", error);

  revalidatePath("/app");
  revalidatePath("/tasks");
  return { kind: "success", message: "Task moved to deleted items. You can restore it from Tasks." };
}

export async function restoreTaskAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const taskId = readField(formData, "taskId");
  if (!taskId) return databaseFailure("Select a task to restore.");
  const { supabase, user } = await authenticatedClient();
  const { data, error } = await supabase.from("tasks").update({ deleted_at: null }).eq("id", taskId).eq("owner_id", user.id).not("deleted_at", "is", null).select("id").maybeSingle();
  if (error || !data) return databaseFailure("This task could not be restored.", error);
  revalidatePath("/tasks");
  revalidatePath("/app");
  return { kind: "success", message: "Task restored." };
}

export async function updateAssignedTaskStatusAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = assignedTaskStatusSchema.safeParse({
    taskId: readField(formData, "taskId"),
    status: readField(formData, "status"),
  });
  if (!parsed.success) return validationFailure("Choose a valid task status.", parsed.error.issues);
  const { supabase } = await authenticatedClient();
  const { error } = await supabase.rpc("update_assigned_task_status", {
    p_task_id: parsed.data.taskId,
    p_status: parsed.data.status,
  });
  if (error) return databaseFailure("The assigned task could not be updated.", error);
  revalidatePath("/tasks");
  revalidatePath("/app");
  return { kind: "success", message: "Task status updated." };
}

export async function transferWorkspaceOwnershipAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = transferWorkspaceOwnershipSchema.safeParse({
    workspaceId: readField(formData, "workspaceId"),
    newOwnerId: readField(formData, "newOwnerId"),
  });
  if (!parsed.success) return validationFailure("Choose a current workspace member.", parsed.error.issues);
  const { supabase } = await authenticatedClient();
  const { error } = await supabase.rpc("transfer_workspace_ownership", {
    p_workspace_id: parsed.data.workspaceId,
    p_new_owner_id: parsed.data.newOwnerId,
  });
  if (error) return databaseFailure("Workspace ownership could not be transferred.", error, {
    permission: "Only the current workspace owner can transfer ownership.",
    validation: "Choose another current workspace member.",
  });
  revalidatePath("/settings");
  revalidatePath("/app");
  return { kind: "success", message: "Ownership transferred. You are now a workspace member." };
}
