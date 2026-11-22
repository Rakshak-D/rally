"use client";

import { useActionState } from "react";

import { MemberAvatar } from "@/components/dashboard/member-avatar";
import type { WorkspaceDashboard } from "@/lib/data/dashboard";
import { initialActionState } from "@/lib/forms/state";
import { leaveWorkspaceAction, removeWorkspaceMemberAction } from "@/lib/workspace/actions";

type Member = WorkspaceDashboard["workspaceMembers"][number];

export function MemberList({
  members,
  roles,
  currentUserId,
  workspaceId,
  isOwner,
}: {
  members: Member[];
  roles: Map<string, "owner" | "member">;
  currentUserId: string;
  workspaceId: string;
  isOwner: boolean;
}) {
  return (
    <div>
      <ul className="settings-member-list">
        {members.map((member) => {
          const role = roles.get(member.id) ?? "member";
          return (
            <li key={member.id}>
              <MemberAvatar name={member.display_name} isSelf={member.id === currentUserId} />
              <div className="settings-member-copy"><strong>{member.display_name}{member.id === currentUserId ? " · You" : ""}</strong><span>{role}</span></div>
              {isOwner && role === "member" && <RemoveMemberForm workspaceId={workspaceId} userId={member.id} />}
            </li>
          );
        })}
      </ul>
      {!isOwner && <LeaveWorkspaceForm workspaceId={workspaceId} />}
    </div>
  );
}

function RemoveMemberForm({ workspaceId, userId }: { workspaceId: string; userId: string }) {
  const [state, formAction, pending] = useActionState(removeWorkspaceMemberAction, initialActionState);

  return (
    <form action={formAction} className="member-action-form">
      <input type="hidden" name="workspaceId" value={workspaceId} />
      <input type="hidden" name="userId" value={userId} />
      <button className="button button--quiet" type="submit" disabled={pending}>{pending ? "Removing…" : "Remove"}</button>
      {state.message && <span className={`member-action-message member-action-message--${state.kind}`} role={state.kind === "error" ? "alert" : "status"}>{state.message}</span>}
    </form>
  );
}

function LeaveWorkspaceForm({ workspaceId }: { workspaceId: string }) {
  const [state, formAction, pending] = useActionState(leaveWorkspaceAction, initialActionState);

  return (
    <form action={formAction} className="leave-workspace-form">
      <input type="hidden" name="workspaceId" value={workspaceId} />
      {state.message && <p className={`form-message form-message--${state.kind}`} role={state.kind === "error" ? "alert" : "status"}>{state.message}</p>}
      <button className="button button--secondary" type="submit" disabled={pending}>{pending ? "Leaving…" : "Leave workspace"}</button>
    </form>
  );
}
