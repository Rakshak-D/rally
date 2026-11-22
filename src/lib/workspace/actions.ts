"use server";

import { createHash, randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getSiteUrl } from "@/lib/config";
import type { ActionState } from "@/lib/forms/state";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { checkinSchema, challengeSchema, goalSchema, taskSchema, updateChallengeSchema, updateGoalSchema, updateTaskSchema } from "@/lib/validation/product";
import { createInviteSchema, createWorkspaceSchema, inviteTokenSchema, updateProfileSchema, updateWorkspaceSchema } from "@/lib/validation/workspace";

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

function databaseFailure(message: string): ActionState {
  return { kind: "error", message };
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
  if (error || !data) return databaseFailure("The workspace could not be created. Try again in a moment.");

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
  if (error) return databaseFailure("The invitation could not be created. Confirm you are a workspace owner and try again.");

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
  if (error) return databaseFailure("The invitation could not be revoked.");

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
  const { error } = await supabase.from("profiles").update({ display_name: parsed.data.displayName }).eq("id", user.id);
  if (error) return databaseFailure("Your profile could not be updated.");

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
  const { error } = await supabase
    .from("workspaces")
    .update({ name: parsed.data.name, timezone: parsed.data.timezone })
    .eq("id", parsed.data.workspaceId);
  if (error) return databaseFailure("Only a workspace owner can change these settings.");

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
  if (error) return databaseFailure("Workspace owners must hand off ownership before leaving.");

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
  if (error) return databaseFailure("Only an owner can remove a workspace member.");

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
  if (error || !data) {
    const message = error?.code === "23P01"
      ? "Those dates overlap another challenge in this workspace."
      : "Only a workspace owner can start a challenge. Check your dates and try again.";
    return databaseFailure(message);
  }

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

  const { error } = await supabase
    .from("challenges")
    .update({
      title: parsed.data.title,
      description: parsed.data.description,
      start_date: parsed.data.startDate,
      end_date: parsed.data.endDate,
      timezone: challenge.timezone,
    })
    .eq("id", parsed.data.challengeId)
    .eq("workspace_id", parsed.data.workspaceId);
  if (error) {
    return databaseFailure(error.code === "23P01" ? "Those dates overlap another challenge." : "Only a workspace owner can edit this challenge.");
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
    ...(parsed.data.notes ? { p_notes: parsed.data.notes } : {}),
  });
  if (error) {
    const message = error.code === "23505"
      ? "Today's check-in was just saved. Refresh to edit it."
      : error.code === "22023"
        ? "The challenge is outside its check-in dates."
        : "Today's check-in could not be saved. Refresh and try again.";
    return databaseFailure(message);
  }

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
  });
  if (!parsed.success) return databaseFailure("Add a goal title before saving.");

  const { supabase } = await authenticatedClient();
  const { error } = await supabase.from("goals").insert({
    workspace_id: parsed.data.workspaceId,
    challenge_id: parsed.data.challengeId,
    title: parsed.data.title,
    description: parsed.data.description,
    status: parsed.data.status,
  });
  if (error) return databaseFailure("The goal could not be created in this workspace.");

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
  });
  if (!parsed.success) return databaseFailure("Review this goal and try again.");

  const { supabase } = await authenticatedClient();
  const { error } = await supabase.from("goals").update({
    title: parsed.data.title,
    description: parsed.data.description,
    status: parsed.data.status,
  }).eq("id", parsed.data.goalId);
  if (error) return databaseFailure("This goal could not be updated.");

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

  const { supabase } = await authenticatedClient();
  const { error } = await supabase.from("goals").delete().eq("id", goalId);
  if (error) return databaseFailure("This goal could not be deleted.");

  revalidatePath("/app");
  revalidatePath("/goals");
  return { kind: "success", message: "Goal deleted." };
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
  });
  if (!parsed.success) return databaseFailure("Add a task title and use a real due date.");

  const { supabase } = await authenticatedClient();
  const { error } = await supabase.from("tasks").insert({
    workspace_id: parsed.data.workspaceId,
    challenge_id: parsed.data.challengeId,
    title: parsed.data.title,
    description: parsed.data.description,
    due_date: parsed.data.dueDate,
    status: parsed.data.status,
  });
  if (error) return databaseFailure("The task could not be created in this workspace.");

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
  });
  if (!parsed.success) return databaseFailure("Review this task and try again.");

  const { supabase } = await authenticatedClient();
  const { error } = await supabase.from("tasks").update({
    title: parsed.data.title,
    description: parsed.data.description,
    due_date: parsed.data.dueDate,
    status: parsed.data.status,
  }).eq("id", parsed.data.taskId);
  if (error) return databaseFailure("This task could not be updated.");

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

  const { supabase } = await authenticatedClient();
  const { error } = await supabase.from("tasks").delete().eq("id", taskId);
  if (error) return databaseFailure("This task could not be deleted.");

  revalidatePath("/app");
  revalidatePath("/tasks");
  return { kind: "success", message: "Task deleted." };
}
