import type { ReactNode } from "react";

import { Logo } from "@/components/brand/logo";

export function AuthCard({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <main className="auth-page" id="main-content" tabIndex={-1}>
      <div className="auth-frame">
        <div className="auth-header">
          <Logo href="/sign-in" />
          <span className="auth-tagline">Show up together.</span>
        </div>
        <section className="auth-content" aria-labelledby="auth-title">
          <p className="eyebrow">{eyebrow}</p>
          <h1 id="auth-title" className="auth-title">
            {title}
          </h1>
          <p className="auth-description">{description}</p>
          {children}
        </section>
        <footer className="auth-footer">
          <span>Rally</span>
          <span>Daily progress, held in common.</span>
        </footer>
      </div>
    </main>
  );
}
