"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";

import { signOutAction } from "@/lib/auth/actions";
import { MemberAvatar } from "@/components/dashboard/member-avatar";
import { Icon } from "@/components/ui/icons";
import { useTheme } from "@/components/app/theme-provider";
import type { ThemePreference } from "@/lib/theme/preference";

const themeOptions: { value: ThemePreference; label: string; icon: "sun" | "moon" | "today" }[] = [
  { value: "system", label: "System", icon: "today" },
  { value: "light", label: "Light", icon: "sun" },
  { value: "dark", label: "Dark", icon: "moon" },
];

export function ProfileMenu({
  displayName,
  email,
  userId,
  avatarPath,
  compact = false,
}: {
  displayName: string;
  email: string;
  userId: string;
  avatarPath: string | null;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const descriptionId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const { preference, setPreference } = useTheme();
  const visibleEmail = compact ? "" : truncateEmail(email);

  useEffect(() => {
    if (!open) return;
    menuRef.current?.querySelector<HTMLElement>("[role^='menuitem']")?.focus();
    const onPointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

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
    }
  }

  return (
    <div className={`profile-menu${compact ? " profile-menu--compact" : ""}`} ref={rootRef}>
      <button
        className="profile-trigger"
        type="button"
        aria-describedby={descriptionId}
        title={email}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        ref={triggerRef}
      >
        <MemberAvatar name={displayName} userId={userId} src={avatarPath} size={compact ? "sm" : "md"} decorative={false} />
        {compact && <span className="visually-hidden">Profile menu for {displayName}</span>}
        {!compact && <span className="profile-trigger-copy"><strong>{displayName}</strong><span title={email}>{visibleEmail}</span></span>}
        {!compact && <Icon name="chevron" size={17} className="profile-trigger-chevron" />}
      </button>
      <span id={descriptionId} className="visually-hidden">Profile menu for {displayName}. Email: {email}</span>
      {open && (
        <div className="profile-popover" role="menu" aria-label="Profile menu" ref={menuRef} onKeyDown={handleMenuKeyDown}>
          <div className="profile-popover-heading">
            <strong>{displayName}</strong>
            <span>{email}</span>
          </div>
          <Link className="profile-menu-item" role="menuitem" href="/profile" onClick={() => close()}>
            <Icon name="user" size={18} /> View profile
          </Link>
          <Link className="profile-menu-item" role="menuitem" href="/settings" onClick={() => close()}>
            <Icon name="settings" size={18} /> Settings
          </Link>
          <Link className="profile-menu-item" role="menuitem" href="/help" onClick={() => close()}>
            <Icon name="help" size={18} /> Help &amp; how Rally works
          </Link>
          <div className="profile-menu-divider" role="separator" />
          <span className="profile-menu-label" role="presentation">Theme</span>
          {themeOptions.map((theme) => (
            <button
              className="profile-menu-item"
              type="button"
              role="menuitemradio"
              aria-checked={preference === theme.value}
              key={theme.value}
              onClick={() => setPreference(theme.value)}
            >
              <Icon name={theme.icon} size={18} /> {theme.label}
              {preference === theme.value && <Icon name="check" size={17} className="profile-menu-check" />}
            </button>
          ))}
          <div className="profile-menu-divider" role="separator" />
          <form action={signOutAction}>
            <button className="profile-menu-item profile-menu-item--danger" type="submit" role="menuitem">
              <Icon name="logout" size={18} /> Sign out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

function truncateEmail(value: string, limit = 19): string {
  return value.length > limit ? `${value.slice(0, limit - 1)}…` : value;
}
