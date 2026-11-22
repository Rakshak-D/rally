"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition, type ReactNode } from "react";

import { Logo } from "@/components/brand/logo";
import { signOutAction } from "@/lib/auth/actions";
import type { WorkspaceOption } from "@/lib/data/dashboard";

const navigation = [
  { href: "/app", label: "Today", code: "01" },
  { href: "/history", label: "History", code: "02" },
  { href: "/goals", label: "Goals", code: "03" },
  { href: "/tasks", label: "Tasks", code: "04" },
  { href: "/settings", label: "Settings", code: "05" },
];

export function AppShell({
  children,
  workspaces,
  displayName,
  email,
}: {
  children: ReactNode;
  workspaces: WorkspaceOption[];
  displayName: string;
  email: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const workspaceFromQuery = searchParams.get("workspace");
  const selectedWorkspace = workspaces.find(({ id }) => id === workspaceFromQuery) ?? workspaces[0] ?? null;

  function hrefFor(path: string): string {
    if (!selectedWorkspace) return path;
    return `${path}?workspace=${encodeURIComponent(selectedWorkspace.id)}`;
  }

  function switchWorkspace(workspaceId: string) {
    if (!workspaces.some((workspace) => workspace.id === workspaceId)) return;

    const destination = navigation.some((item) => item.href === pathname) ? pathname : "/app";
    const query = new URLSearchParams(searchParams.toString());
    for (const key of ["workspace", "member", "challenge", "page"]) query.delete(key);
    query.set("workspace", workspaceId);
    startTransition(() => router.push(`${destination}?${query.toString()}`, { scroll: false }));
  }

  return (
    <div className="app-frame">
      <aside className="app-sidebar">
        <div className="sidebar-brand"><Logo href={hrefFor("/app")} /></div>
        <div className="sidebar-workspace">
          <label className="sidebar-label" htmlFor="workspace-switcher">WORKSPACE</label>
          {workspaces.length > 0 ? (
            <select
              id="workspace-switcher"
              className="workspace-select"
              aria-label="Switch workspace"
              value={selectedWorkspace?.id ?? ""}
              onChange={(event) => switchWorkspace(event.target.value)}
            >
              {workspaces.map((workspace) => <option key={workspace.id} value={workspace.id}>{workspace.name}</option>)}
            </select>
          ) : (
            <span className="workspace-select workspace-select--empty">No workspace yet</span>
          )}
        </div>

        <nav className="side-nav" aria-label="Main navigation">
          {navigation.map((item) => {
            const active = item.href === "/app" ? pathname === "/app" : pathname.startsWith(item.href);
            return (
              <Link className={`side-nav-link${active ? " is-active" : ""}`} href={hrefFor(item.href)} key={item.href} aria-current={active ? "page" : undefined}>
                <span className="side-nav-code">{item.code}</span>
                <span>{item.label}</span>
                {active && <span className="side-nav-marker" aria-hidden="true" />}
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-bottom">
          <div className="sidebar-user">
            <span className="member-avatar member-avatar--small" aria-hidden="true">{initials(displayName)}</span>
            <span className="sidebar-user-copy"><strong>{displayName}</strong><span>{email}</span></span>
          </div>
          <form action={signOutAction}>
            <button className="sign-out-button" type="submit">Sign out <span aria-hidden="true">↗</span></button>
          </form>
        </div>
      </aside>

      <div className="app-main-column">
        <header className="mobile-topbar">
          <Logo href={hrefFor("/app")} />
          {workspaces.length > 0 && (
            <select
              className="workspace-select workspace-select--mobile"
              aria-label="Switch workspace"
              value={selectedWorkspace?.id ?? ""}
              onChange={(event) => switchWorkspace(event.target.value)}
            >
              {workspaces.map((workspace) => <option key={workspace.id} value={workspace.id}>{workspace.name}</option>)}
            </select>
          )}
        </header>
        <main className="app-main" id="main-content" tabIndex={-1}>
          {isPending && <p className="route-pending" role="status">Changing workspace…</p>}
          {children}
        </main>
        <nav className="mobile-nav" aria-label="Main navigation">
          {navigation.map((item) => {
            const active = item.href === "/app" ? pathname === "/app" : pathname.startsWith(item.href);
            return <Link href={hrefFor(item.href)} key={item.href} aria-current={active ? "page" : undefined} className={active ? "is-active" : ""}>{item.label}</Link>;
          })}
        </nav>
      </div>
    </div>
  );
}

function initials(value: string): string {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  return (parts.length > 1 ? `${parts[0][0]}${parts.at(-1)?.[0] ?? ""}` : value.slice(0, 2)).toUpperCase();
}
