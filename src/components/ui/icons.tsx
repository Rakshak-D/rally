import type { ReactNode, SVGProps } from "react";

export type IconName =
  | "today"
  | "history"
  | "target"
  | "tasks"
  | "settings"
  | "user"
  | "help"
  | "flame"
  | "plus"
  | "chevron"
  | "logout"
  | "camera"
  | "moon"
  | "sun"
  | "check"
  | "close"
  | "arrow"
  | "sparkle"
  | "note"
  | "warning"
  | "lock"
  | "more";

const paths: Record<IconName, ReactNode> = {
  today: <><path d="M4 10.5 12 4l8 6.5" /><path d="M6.5 9v10h11V9M10 19v-6h4v6" /></>,
  history: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7v5l3.5 2" /><path d="M4 4v4h4" /></>,
  target: <><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="4.5" /><circle cx="12" cy="12" r=".8" /></>,
  tasks: <><rect x="4" y="4" width="16" height="16" rx="3" /><path d="m8 12 2.5 2.5L16 9" /></>,
  settings: <><circle cx="12" cy="12" r="3" /><path d="m19.4 15 .1.1a1.8 1.8 0 1 1-2.5 2.5l-.1-.1a1.8 1.8 0 0 0-3 .9v.2a1.8 1.8 0 1 1-3.6 0v-.2a1.8 1.8 0 0 0-3-.9l-.1.1a1.8 1.8 0 1 1-2.5-2.5l.1-.1a1.8 1.8 0 0 0-.9-3h-.2a1.8 1.8 0 1 1 0-3.6h.2a1.8 1.8 0 0 0 .9-3l-.1-.1a1.8 1.8 0 1 1 2.5-2.5l.1.1a1.8 1.8 0 0 0 3-.9v-.2a1.8 1.8 0 1 1 3.6 0v.2a1.8 1.8 0 0 0 3 .9l.1-.1a1.8 1.8 0 1 1 2.5 2.5l-.1.1a1.8 1.8 0 0 0 .9 3h.2a1.8 1.8 0 1 1 0 3.6h-.2a1.8 1.8 0 0 0-.9 3Z" /></>,
  user: <><circle cx="12" cy="8" r="3.5" /><path d="M4.5 20a7.5 7.5 0 0 1 15 0" /></>,
  help: <><circle cx="12" cy="12" r="8.5" /><path d="M9.5 9a2.6 2.6 0 1 1 4.5 1.7c-1.2 1.1-2 1.4-2 3" /><path d="M12 17h.01" /></>,
  flame: <path d="M13.1 3.5c.4 2.2-.4 3.5-1.8 5.1-1.1-1-1.5-2-1.3-3.2C7.2 7.7 6 10.3 6 13a6 6 0 0 0 12 0c0-3.5-1.8-6.7-4.9-9.5Zm-1.2 14a2.7 2.7 0 0 1-2.7-2.7c0-1.2.6-2.2 1.7-3.4.1 1 .6 1.5 1.3 2 .6-.7 1-1.4.9-2.4 1.2 1.1 1.6 2.2 1.6 3.4a2.8 2.8 0 0 1-2.8 3.1Z" />,
  plus: <><path d="M12 5v14M5 12h14" /></>,
  chevron: <path d="m7 10 5 5 5-5" />,
  logout: <><path d="M10 5H5v14h5M14 8l4 4-4 4M18 12H9" /></>,
  camera: <><path d="M4 8h4l1.5-2h5L16 8h4v11H4z" /><circle cx="12" cy="13" r="3" /></>,
  moon: <path d="M19.5 15.5A8 8 0 0 1 8.5 4.5 8.5 8.5 0 1 0 19.5 15.5Z" />,
  sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32 1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" /></>,
  check: <path d="m5 12 4.5 4.5L19 7" />,
  close: <><path d="m6 6 12 12M18 6 6 18" /></>,
  arrow: <><path d="M5 12h14M13 6l6 6-6 6" /></>,
  sparkle: <><path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z" /><path d="m19 15 .8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15Z" /></>,
  note: <><path d="M5 4h14v13l-4 3H5z" /><path d="M8 9h8M8 13h6" /></>,
  warning: <><path d="M12 3.5 21 20H3z" /><path d="M12 9v4.5m0 3.2h.01" /></>,
  lock: <><rect x="4.5" y="10" width="15" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></>,
  more: <><circle cx="5" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /></>,
};

export function Icon({ name, size = 20, ...props }: SVGProps<SVGSVGElement> & { name: IconName; size?: number }) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {paths[name]}
    </svg>
  );
}
