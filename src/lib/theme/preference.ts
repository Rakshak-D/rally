export type ThemePreference = "system" | "light" | "dark";
export type ResolvedTheme = Exclude<ThemePreference, "system">;

type ThemeStorage = Pick<Storage, "getItem" | "setItem">;

const THEME_KEY = "rally-theme";

function browserStorage(): ThemeStorage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function isThemePreference(value: string | null): value is ThemePreference {
  return value === "system" || value === "light" || value === "dark";
}

export function readThemePreference(storage?: Pick<Storage, "getItem">): ThemePreference {
  try {
    const value = (storage ?? browserStorage())?.getItem(THEME_KEY) ?? null;
    return isThemePreference(value) ? value : "system";
  } catch {
    return "system";
  }
}

export function writeThemePreference(preference: ThemePreference, storage?: Pick<Storage, "setItem">): boolean {
  try {
    const target = storage ?? browserStorage();
    if (!target) return false;
    target.setItem(THEME_KEY, preference);
    return true;
  } catch {
    return false;
  }
}

export function resolveTheme(preference: ThemePreference, systemTheme: ResolvedTheme): ResolvedTheme {
  return preference === "system" ? systemTheme : preference;
}
