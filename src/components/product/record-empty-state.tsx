import type { ReactNode } from "react";

export function RecordEmptyState({ action, children, description, title }: {
  action?: ReactNode;
  children?: ReactNode;
  description: string;
  title: string;
}) {
  return (
    <section className="records-empty" aria-labelledby="records-empty-heading">
      <svg viewBox="0 0 112 82" aria-hidden="true" focusable="false">
        <path className="empty-illustration-line" d="M13 68h86M24 58V39a5 5 0 0 1 5-5h15M68 34h15a5 5 0 0 1 5 5v19" />
        <circle className="empty-illustration-orbit" cx="56" cy="26" r="15" />
        <path className="empty-illustration-mark" d="M56 18v16m-8-8h16" />
        <circle className="empty-illustration-dot" cx="24" cy="20" r="3" />
        <circle className="empty-illustration-dot" cx="88" cy="19" r="3" />
      </svg>
      <h2 id="records-empty-heading">{title}</h2>
      <p>{description}</p>
      {action}
      {children}
    </section>
  );
}
