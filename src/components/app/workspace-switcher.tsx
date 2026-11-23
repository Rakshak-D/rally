"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";

import { Icon } from "@/components/ui/icons";
import type { WorkspaceOption } from "@/lib/data/dashboard";

export function WorkspaceSwitcher({
  workspaces,
  selectedWorkspace,
  onSwitch,
  compact = false,
}: {
  workspaces: WorkspaceOption[];
  selectedWorkspace: WorkspaceOption | null;
  onSwitch: (workspaceId: string) => void;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const typeahead = useRef("");
  const typeaheadTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const selected = menuRef.current?.querySelector<HTMLElement>("[aria-checked='true']");
    const first = menuRef.current?.querySelector<HTMLElement>("[role^='menuitem']");
    (selected ?? first)?.focus();
    const onPointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  useEffect(() => () => {
    if (typeaheadTimer.current) clearTimeout(typeaheadTimer.current);
  }, []);

  function close(returnFocus = false) {
    setOpen(false);
    if (returnFocus) triggerRef.current?.focus();
  }

  function handleMenuKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const items = Array.from(menuRef.current?.querySelectorAll<HTMLElement>("[role^='menuitem']") ?? []);
    const currentIndex = items.indexOf(document.activeElement as HTMLElement);
    if (event.key === "Escape") {
      event.preventDefault();
      close(true);
    } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const offset = event.key === "ArrowDown" ? 1 : -1;
      items[(currentIndex + offset + items.length) % items.length]?.focus();
    } else if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      (event.key === "Home" ? items[0] : items.at(-1))?.focus();
    } else if (event.key === "Tab") {
      close();
    } else if (event.key.length === 1 && !event.altKey && !event.ctrlKey && !event.metaKey) {
      event.preventDefault();
      typeahead.current += event.key.toLocaleLowerCase();
      if (typeaheadTimer.current) clearTimeout(typeaheadTimer.current);
      typeaheadTimer.current = setTimeout(() => { typeahead.current = ""; }, 600);
      const match = workspaces.find((workspace) => workspace.name.toLocaleLowerCase().startsWith(typeahead.current));
      if (match) menuRef.current?.querySelector<HTMLElement>(`[data-workspace-id="${CSS.escape(match.id)}"]`)?.focus();
    }
  }

  const createHref = selectedWorkspace
    ? `/settings?workspace=${encodeURIComponent(selectedWorkspace.id)}&tab=workspace#new-workspace-heading`
    : "/settings?tab=workspace#new-workspace-heading";

  return (
    <div className={`workspace-menu${compact ? " workspace-menu--compact" : ""}`} ref={rootRef}>
      <button
        className="workspace-trigger"
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((value) => !value)}
        ref={triggerRef}
      >
        <span className="workspace-tile" style={{ background: workspaceGradient(selectedWorkspace?.id ?? "rally") }} aria-hidden="true">
          {(selectedWorkspace?.name ?? "R").slice(0, 1).toUpperCase()}
        </span>
        <span className="workspace-trigger-copy">
          <strong>{selectedWorkspace?.name ?? "No workspace yet"}</strong>
          {selectedWorkspace && <span className="workspace-role">{selectedWorkspace.role === "owner" ? "Owner" : "Member"}</span>}
        </span>
        <Icon name="chevron" size={18} className="workspace-chevron" />
        <span className="visually-hidden">Switch workspace</span>
      </button>
      {open && (
        <div className="workspace-popover" id={menuId} role="menu" aria-label="Switch workspace" ref={menuRef} onKeyDown={handleMenuKeyDown}>
          <span className="popover-heading">Your workspaces</span>
          {workspaces.length ? workspaces.map((workspace) => {
            const selected = workspace.id === selectedWorkspace?.id;
            return (
              <button
                className="workspace-option"
                type="button"
                role="menuitemradio"
                aria-checked={selected}
                data-workspace-id={workspace.id}
                key={workspace.id}
                onClick={() => {
                  onSwitch(workspace.id);
                  close();
                }}
              >
                <span className="workspace-tile workspace-tile--small" style={{ background: workspaceGradient(workspace.id) }} aria-hidden="true">
                  {workspace.name.slice(0, 1).toUpperCase()}
                </span>
                <span className="workspace-option-name">{workspace.name}</span>
                <span className="workspace-option-role">{workspace.role === "owner" ? "Owner" : "Member"}</span>
                {selected && <Icon name="check" size={17} className="workspace-option-check" />}
              </button>
            );
          }) : <p className="workspace-empty-note">Create a workspace to begin sharing progress.</p>}
          <div className="workspace-menu-footer">
            <Link className="workspace-menu-action" role="menuitem" href={createHref} onClick={() => close()}>
              <Icon name="plus" size={17} /> Create workspace
            </Link>
            <Link className="workspace-menu-action" role="menuitem" href="/join" onClick={() => close()}>
              <Icon name="arrow" size={17} /> Join with invite link
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function workspaceGradient(id: string): string {
  let hash = 0;
  for (const character of id) hash = (hash * 31 + character.charCodeAt(0)) | 0;
  const hue = Math.abs(hash) % 360;
  return `linear-gradient(145deg, hsl(${hue} 52% 81%), hsl(${(hue + 27) % 360} 42% 68%))`;
}
