import { describe, expect, it, vi } from "vitest";

import { readThemePreference, resolveTheme, writeThemePreference } from "./preference";

describe("theme preference", () => {
  it("uses system mode for missing or invalid stored values", () => {
    expect(readThemePreference({ getItem: () => null })).toBe("system");
    expect(readThemePreference({ getItem: () => "blue" })).toBe("system");
  });

  it("reads an explicit light or dark preference", () => {
    expect(readThemePreference({ getItem: () => "light" })).toBe("light");
    expect(readThemePreference({ getItem: () => "dark" })).toBe("dark");
  });

  it("resolves system mode using the current device setting", () => {
    expect(resolveTheme("system", "dark")).toBe("dark");
    expect(resolveTheme("light", "dark")).toBe("light");
  });

  it("persists the selected mode and safely handles blocked storage", () => {
    const setItem = vi.fn();
    expect(writeThemePreference("dark", { setItem })).toBe(true);
    expect(setItem).toHaveBeenCalledWith("rally-theme", "dark");
    expect(writeThemePreference("light", { setItem: () => { throw new Error("blocked"); } })).toBe(false);
  });
});
