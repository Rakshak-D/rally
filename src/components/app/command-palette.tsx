"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { usePathname, useRouter } from "next/navigation";

import { Icon, type IconName } from "@/components/ui/icons";
import { useTheme } from "@/components/app/theme-provider";

type Command = {
  label: string;
  icon: IconName;
  action: "today" | "history" | "goals" | "tasks" | "settings" | "help" | "checkin" | "new-goal" | "new-task" | "theme";
};

const baseCommands: Command[] = [
  { label: "Today", icon: "today", action: "today" },
  { label: "History", icon: "history", action: "history" },
  { label: "Goals", icon: "target", action: "goals" },
  { label: "Tasks", icon: "tasks", action: "tasks" },
  { label: "Settings", icon: "settings", action: "settings" },
  { label: "Help", icon: "help", action: "help" },
  { label: "Go to today’s check-in", icon: "today", action: "checkin" },
  { label: "New goal", icon: "plus", action: "new-goal" },
  { label: "New task", icon: "plus", action: "new-task" },
  { label: "Toggle light and dark theme", icon: "sun", action: "theme" },
];

export function CommandPalette({ workspaceId }: { workspaceId: string | null }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const keySequence = useRef<"g" | null>(null);
  const sequenceTimer = useRef<number | null>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const router = useRouter();
  const pathname = usePathname();
  const { preference, setPreference } = useTheme();
  const commands = useMemo(() => baseCommands.filter(({ label }) => label.toLowerCase().includes(query.trim().toLowerCase())), [query]);

  const close = useCallback(() => {
    if (dialogRef.current?.open) dialogRef.current.close();
    setOpen(false);
  }, []);

  const navigate = useCallback((path: string) => {
    const queryString = workspaceId ? `?workspace=${encodeURIComponent(workspaceId)}` : "";
    router.push(`${path}${queryString}`);
    close();
  }, [close, router, workspaceId]);

  const openRecord = useCallback((target: "new-goal" | "new-task") => {
    close();
    window.requestAnimationFrame(() => document.querySelector<HTMLButtonElement>(`[data-command-target="${target}"]`)?.click());
  }, [close]);

  const focusCheckin = useCallback(() => {
    if (pathname !== "/app") navigate("/app");
    else close();
    window.setTimeout(() => document.getElementById("accomplishment")?.focus(), 160);
  }, [close, navigate, pathname]);

  const executeCommand = useCallback((action: Command["action"]) => {
    if (action === "today") navigate("/app");
    else if (action === "history") navigate("/history");
    else if (action === "goals") navigate("/goals");
    else if (action === "tasks") navigate("/tasks");
    else if (action === "settings") navigate("/settings");
    else if (action === "help") navigate("/help");
    else if (action === "checkin") focusCheckin();
    else if (action === "new-goal" || action === "new-task") openRecord(action);
    else {
      setPreference(preference === "dark" ? "light" : "dark");
      close();
    }
  }, [close, focusCheckin, navigate, openRecord, preference, setPreference]);

  useEffect(() => {
    if (!open) return;
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (!dialog.open) dialog.showModal();
    inputRef.current?.focus();
    setQuery("");
  }, [open]);

  useEffect(() => () => {
    if (sequenceTimer.current !== null) window.clearTimeout(sequenceTimer.current);
  }, []);

  useEffect(() => {
    function onKeyDown(event: globalThis.KeyboardEvent) {
      const target = event.target;
      const editable = target instanceof HTMLElement && (target.isContentEditable || target.matches("input, textarea, select, [role='textbox']"));
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(true);
        return;
      }
      if (editable || event.metaKey || event.ctrlKey || event.altKey || event.key.length !== 1) return;

      const key = event.key.toLowerCase();
      if (keySequence.current === "g") {
        if (sequenceTimer.current !== null) window.clearTimeout(sequenceTimer.current);
        keySequence.current = null;
        if (key === "t") navigate("/tasks");
        else if (key === "h") navigate("/history");
        return;
      }
      if (key === "g") {
        keySequence.current = "g";
        sequenceTimer.current = window.setTimeout(() => { keySequence.current = null; }, 800);
      } else if (key === "c") {
        event.preventDefault();
        focusCheckin();
      } else if (key === "n") {
        event.preventDefault();
        openRecord("new-task");
      } else if (key === "?") {
        event.preventDefault();
        navigate("/help");
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [focusCheckin, navigate, openRecord, pathname, preference, router, setPreference, workspaceId]);

  function handleListKeyDown(event: ReactKeyboardEvent<HTMLUListElement>) {
    const items = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>("[role='menuitem']"));
    const index = items.indexOf(document.activeElement as HTMLButtonElement);
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      items[(index + (event.key === "ArrowDown" ? 1 : -1) + items.length) % items.length]?.focus();
    } else if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      (event.key === "Home" ? items[0] : items.at(-1))?.focus();
    }
  }

  return (
    <>
      <button className="command-palette-shortcut" type="button" onClick={() => setOpen(true)}>
        <span>Search Rally</span><kbd>Ctrl K</kbd>
      </button>
      <dialog className="command-dialog" ref={dialogRef} aria-label="Rally commands" onCancel={(event) => { event.preventDefault(); close(); }} onClose={() => setOpen(false)}>
        <div className="command-panel">
          <label className="visually-hidden" htmlFor="command-search">Search Rally commands</label>
          <input ref={inputRef} className="field-input command-search" id="command-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search pages and actions" onKeyDown={(event) => { if (event.key === "ArrowDown") { event.preventDefault(); dialogRef.current?.querySelector<HTMLButtonElement>("[role='menuitem']")?.focus(); } }} />
          {commands.length ? (
            <ul className="command-list" role="menu" onKeyDown={handleListKeyDown}>
              {commands.map((command) => (
                <li key={command.action}>
                  <button type="button" role="menuitem" onClick={() => executeCommand(command.action)}>
                    <Icon name={command.icon} size={18} /><span>{command.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : <p className="command-no-results">No matching actions.</p>}
          <footer className="command-footer"><span>Move with ↑ and ↓</span><span>Close with Esc</span></footer>
        </div>
      </dialog>
    </>
  );
}
