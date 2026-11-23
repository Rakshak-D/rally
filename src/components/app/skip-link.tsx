"use client";

import type { MouseEvent } from "react";

export function SkipLink() {
  function focusMainContent(event: MouseEvent<HTMLAnchorElement>) {
    const main = document.getElementById("main-content");
    if (!main) return;

    event.preventDefault();
    window.history.replaceState(window.history.state, "", "#main-content");
    main.focus({ preventScroll: true });
    main.scrollIntoView({ behavior: "auto", block: "start" });
  }

  return <a className="skip-link" href="#main-content" onClick={focusMainContent}>Skip to content</a>;
}
