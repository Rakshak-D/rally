import type { ZodIssue } from "zod";

export type ActionState = {
  kind: "idle" | "error" | "success";
  message: string;
  link?: string;
  workspaceId?: string;
  email?: string;
  nextPath?: string;
  fieldErrors?: Record<string, string>;
  checkinId?: string;
  checkinCreated?: boolean;
};

export const initialActionState: ActionState = { kind: "idle", message: "" };

export function validationFailure(message: string, issues: readonly ZodIssue[]): ActionState {
  const fieldErrors: Record<string, string> = {};
  for (const issue of issues) {
    const field = issue.path[0];
    if (typeof field === "string" && !fieldErrors[field]) fieldErrors[field] = issue.message;
  }
  return { kind: "error", message, fieldErrors };
}
