"use client";

import Link from "next/link";
import { useState, useSyncExternalStore } from "react";

import { Icon } from "@/components/ui/icons";

const STORAGE_KEY = "rally-first-run-dismissed";

function subscribeToStorage(onChange: () => void): () => void {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}

function getDismissedSnapshot(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

function getServerSnapshot(): boolean {
  return false;
}

export function FirstRunHelper() {
  const storedDismissed = useSyncExternalStore(subscribeToStorage, getDismissedSnapshot, getServerSnapshot);
  const [dismissedLocally, setDismissedLocally] = useState(false);
  const dismissed = storedDismissed || dismissedLocally;

  function dismiss() {
    setDismissedLocally(true);
    try {
      window.localStorage.setItem(STORAGE_KEY, "true");
    } catch {
      // Dismiss for the current page even when storage is unavailable.
    }
  }

  if (dismissed) return null;

  return (
    <section className="first-run-helper" aria-labelledby="first-run-heading">
      <div className="first-run-intro">
        <h2 id="first-run-heading">How Rally works</h2>
        <p>Small steps, shared over time.</p>
      </div>
      <ol className="first-run-steps">
        <li><Icon name="note" size={20} /><span><strong>Check in daily</strong><small>Write down what moved forward.</small></span></li>
        <li><Icon name="flame" size={20} /><span><strong>Build your streak</strong><small>Consistency grows one day at a time.</small></span></li>
        <li><Icon name="sparkle" size={20} /><span><strong>Cheer your circle</strong><small>See what everyone is working on.</small></span></li>
      </ol>
      <div className="first-run-actions">
        <Link href="/help" className="text-link">Learn more</Link>
        <button className="button button--quiet" type="button" onClick={dismiss}>Dismiss</button>
      </div>
    </section>
  );
}
