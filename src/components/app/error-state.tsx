"use client";

import { useEffect, useRef } from "react";

export function ErrorState({ retry, error }: { retry: () => void; error?: unknown }) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  void error;

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return (
    <main className="route-feedback route-feedback--error">
      <div className="route-feedback-copy" role="alert">
        <p className="eyebrow">Rally · Temporary error</p>
        <h1 ref={headingRef} tabIndex={-1}>We couldn’t load this page.</h1>
        <p>Rally couldn’t complete the request. Try again, or return to Today.</p>
      </div>
      <div className="route-feedback-actions">
        <button className="button button--primary" type="button" onClick={retry}>Try again</button>
        <a className="button button--secondary" href="/app">Back to Today</a>
      </div>
    </main>
  );
}
