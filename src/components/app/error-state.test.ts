import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { ErrorState } from "./error-state";

describe("ErrorState", () => {
  it("offers a safe, accessible retry and return path without rendering error details", () => {
    const markup = renderToStaticMarkup(
      createElement(ErrorState, { retry: vi.fn(), error: new Error("database password") }),
    );

    expect(markup).toContain("role=\"alert\"");
    expect(markup).toContain("We couldn’t load this page.");
    expect(markup).toContain("Try again");
    expect(markup).toContain("href=\"/app\"");
    expect(markup).not.toContain("database password");
  });
});
