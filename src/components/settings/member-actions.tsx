"use client";

import { useActionState } from "react";

import { MemberAvatar } from "@/components/dashboard/member-avatar";
import { useActionToast } from "@/components/ui/toast";
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
              <MemberAvatar name={member.display_name} userId={member.id} src={member.avatar_path} isSelf={member.id === currentUserId} />
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
  useActionToast(state);

  return (
    <form action={formAction} className="member-action-form" onSubmit={(event) => { if (!window.confirm("Remove this member from the workspace? Their shared progress history will remain.")) event.preventDefault(); }}>
      <input type="hidden" name="workspaceId" value={workspaceId} />
      <input type="hidden" name="userId" value={userId} />
      <button className="button button--quiet" type="submit" disabled={pending}>{pending ? "Removing…" : "Remove"}</button>
      {state.kind === "error" && state.message && <span className="member-action-message member-action-message--error" role="alert">{state.message}</span>}
    </form>
  );
}

function LeaveWorkspaceForm({ workspaceId }: { workspaceId: string }) {
  const [state, formAction, pending] = useActionState(leaveWorkspaceAction, initialActionState);
  useActionToast(state);

  return (
    <form action={formAction} className="leave-workspace-form" onSubmit={(event) => { if (!window.confirm("Leave this workspace? Your history stays with the group, and you can rejoin with a new invitation.")) event.preventDefault(); }}>
      <input type="hidden" name="workspaceId" value={workspaceId} />
      {state.kind === "error" && state.message && <p className="form-message form-message--error" role="alert">{state.message}</p>}
      <button className="button button--secondary" type="submit" disabled={pending}>{pending ? "Leaving…" : "Leave workspace"}</button>
    </form>
  );
}
