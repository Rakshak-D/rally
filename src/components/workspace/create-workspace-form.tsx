"use client";

import { useActionState } from "react";

import { createWorkspaceAction } from "@/lib/workspace/actions";
import { initialActionState } from "@/lib/forms/state";

const COMMON_TIMEZONES = [
  "America/Los_Angeles",
  "America/Denver",
  "America/Chicago",
  "America/New_York",
  "America/Sao_Paulo",
  "Europe/London",
  "Europe/Paris",
  "Africa/Johannesburg",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Sydney",
  "Pacific/Auckland",
  "UTC",
];

export function TimezoneSelect({ id, name, value }: { id: string; name: string; value?: string }) {
  const local = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const options = [...new Set([value, local, ...COMMON_TIMEZONES].filter((timezone): timezone is string => Boolean(timezone)))];

  return (
    <select className="field-select" id={id} name={name} defaultValue={value ?? local} required>
      {options.map((timezone) => <option key={timezone} value={timezone}>{timezone}</option>)}
    </select>
  );
}

export function CreateWorkspaceForm() {
  const [state, formAction, pending] = useActionState(createWorkspaceAction, initialActionState);
  return (
    <form action={formAction} className="form-stack workspace-form">
      <label className="field-label" htmlFor="workspace-name">
        Workspace name
        <input className="field-input" id="workspace-name" name="name" type="text" maxLength={80} placeholder="The Sunday table" required />
      </label>
      <label className="field-label" htmlFor="workspace-timezone">
        Timezone
        <TimezoneSelect id="workspace-timezone" name="timezone" />
        <span className="field-hint">Shared dates and check-in days follow this timezone.</span>
      </label>
      {state.kind === "error" && <p className="form-message form-message--error" role="alert">{state.message}</p>}
      <button className="button button--primary" type="submit" disabled={pending}>
        {pending ? "Creating…" : "Create workspace"}
        <span aria-hidden="true">↗</span>
      </button>
    </form>
  );
}
