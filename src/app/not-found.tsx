import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <main id="main-content" className="route-feedback route-feedback--not-found">
      <div className="route-feedback-copy">
        <p className="eyebrow">Rally · 404</p>
        <h1>We couldn’t find that page.</h1>
        <p>The link may be out of date. Return to your workspace to continue.</p>
      </div>
      <div className="route-feedback-actions">
        <Link className="button button--primary" href="/app">Back to Today</Link>
        <Link className="text-link" href="/sign-in">Sign in</Link>
      </div>
    </main>
  );
}
