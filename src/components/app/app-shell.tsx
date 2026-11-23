"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition, type ReactNode } from "react";

import { Logo } from "@/components/brand/logo";
import { ProfileMenu } from "@/components/app/profile-menu";
import { WorkspaceSwitcher } from "@/components/app/workspace-switcher";
import { Icon, type IconName } from "@/components/ui/icons";
import { ToastViewport } from "@/components/ui/toast";
import type { WorkspaceOption } from "@/lib/data/dashboard";

const primaryNavigation: { href: string; label: string; icon: IconName }[] = [
  { href: "/app", label: "Today", icon: "today" },
  { href: "/history", label: "History", icon: "history" },
  { href: "/goals", label: "Goals", icon: "target" },
  { href: "/tasks", label: "Tasks", icon: "tasks" },
];

export function AppShell({
  children,
  workspaces,
  userId,
  avatarPath,
  displayName,
  email,
}: {
  children: ReactNode;
  workspaces: WorkspaceOption[];
  userId: string;
  avatarPath: string | null;
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
    const query = new URLSearchParams(searchParams.toString());
    for (const key of ["workspace", "member", "challenge", "page"]) query.delete(key);
    query.set("workspace", workspaceId);
    const queryString = query.toString();
    startTransition(() => router.push(`${pathname}${queryString ? `?${queryString}` : ""}`, { scroll: false }));
  }

  const activeIndex = primaryNavigation.findIndex((item) => isActive(item.href, pathname));

  return (
    <div className="app-frame">
      <aside className="app-sidebar" aria-label="Rally workspace">
        <div className="sidebar-brand"><Logo href={hrefFor("/app")} /></div>
        <div className="sidebar-workspace">
          <span className="sidebar-label">Workspace</span>
          <WorkspaceSwitcher workspaces={workspaces} selectedWorkspace={selectedWorkspace} onSwitch={switchWorkspace} />
        </div>

        <nav className="side-nav" aria-label="Main navigation">
          {primaryNavigation.map((item) => {
            const active = isActive(item.href, pathname);
            return (
              <Link className={`side-nav-link${active ? " is-active" : ""}`} href={hrefFor(item.href)} key={item.href} aria-current={active ? "page" : undefined}>
                <Icon name={item.icon} size={20} />
                <span>{item.label}</span>
              </Link>
            );
          })}
          <Link className={`side-nav-link side-nav-link--quiet${isActive("/settings", pathname) ? " is-active" : ""}`} href={hrefFor("/settings")} aria-current={isActive("/settings", pathname) ? "page" : undefined}>
            <Icon name="settings" size={20} />
            <span>Settings</span>
          </Link>
        </nav>

        <div className="sidebar-bottom">
          <ProfileMenu displayName={displayName} email={email} userId={userId} avatarPath={avatarPath} />
        </div>
      </aside>

      <div className="app-main-column">
        <header className="mobile-topbar">
          <Logo href={hrefFor("/app")} />
          <div className="mobile-topbar-actions">
            <WorkspaceSwitcher workspaces={workspaces} selectedWorkspace={selectedWorkspace} onSwitch={switchWorkspace} compact />
            <ProfileMenu displayName={displayName} email={email} userId={userId} avatarPath={avatarPath} compact />
          </div>
        </header>
        <div className={`route-progress${isPending ? " is-pending" : ""}`} aria-hidden={!isPending}>
          {isPending && <span className="visually-hidden" role="status" aria-live="polite">Changing workspace</span>}
        </div>
        <main className="app-main" id="main-content" tabIndex={-1}>
          {children}
        </main>
        <nav className="mobile-nav" aria-label="Main navigation" style={{ "--nav-index": Math.max(0, activeIndex) } as React.CSSProperties}>
          <span className="mobile-nav-indicator" aria-hidden="true" />
          {primaryNavigation.map((item) => {
            const active = isActive(item.href, pathname);
            return (
              <Link href={hrefFor(item.href)} key={item.href} aria-current={active ? "page" : undefined} className={active ? "is-active" : ""}>
                <Icon name={item.icon} size={20} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
      <ToastViewport />
    </div>
  );
}

function isActive(href: string, pathname: string): boolean {
  return href === "/app" ? pathname === "/app" : pathname.startsWith(href);
}
