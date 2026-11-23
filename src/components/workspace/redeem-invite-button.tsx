"use client";

import { useActionState } from "react";

import { Icon } from "@/components/ui/icons";
import { initialActionState } from "@/lib/forms/state";
import { redeemInviteAction } from "@/lib/workspace/actions";

export function RedeemInviteButton({ token }: { token: string }) {
  const action = redeemInviteAction.bind(null, token);
  const [state, formAction, pending] = useActionState(action, initialActionState);

  return (
    <form action={formAction} className="form-stack">
      {state.kind === "error" && <p className="form-message form-message--error" role="alert">{state.message}</p>}
      <button className="button button--primary button--full" type="submit" disabled={pending}>
        {pending ? "Joining…" : "Accept invitation"}
        <Icon name="arrow" size={18} />
      </button>
    </form>
  );
}
