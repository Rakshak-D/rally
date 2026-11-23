"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

export function InviteLinkEntry() {
  const router = useRouter();
  const [error, setError] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const input = String(formData.get("inviteLink") ?? "").trim();
    const token = readInviteToken(input);
    if (!token) {
      setError("Paste a valid Rally invitation link or 64-character invite token.");
      return;
    }
    setError("");
    router.push(`/join/${token}`);
  }

  return (
    <form className="invite-entry-form" onSubmit={submit}>
      <label className="field-label" htmlFor="invite-link">Invitation link<input className="field-input" id="invite-link" name="inviteLink" type="text" autoComplete="url" maxLength={2048} placeholder="Paste the link shared with you" aria-invalid={error ? "true" : undefined} aria-describedby={error ? "invite-link-error" : "invite-link-hint"} required /></label>
      <span className="field-hint" id="invite-link-hint">Rally won’t show workspace details until you accept the invitation.</span>
      {error && <p className="form-message form-message--error" id="invite-link-error" role="alert">{error}</p>}
      <button className="button button--primary" type="submit">Continue <span aria-hidden="true">→</span></button>
    </form>
  );
}

function readInviteToken(input: string): string | null {
  if (/^[a-f0-9]{64}$/i.test(input)) return input.toLowerCase();
  try {
    const url = new URL(input, "https://rally.invalid");
    const match = /^\/join\/([a-f0-9]{64})\/?$/i.exec(url.pathname);
    return match?.[1]?.toLowerCase() ?? null;
  } catch {
    return null;
  }
}
