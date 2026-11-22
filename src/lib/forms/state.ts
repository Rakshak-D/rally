export type ActionState = {
  kind: "idle" | "error" | "success";
  message: string;
  link?: string;
  workspaceId?: string;
};

export const initialActionState: ActionState = { kind: "idle", message: "" };
