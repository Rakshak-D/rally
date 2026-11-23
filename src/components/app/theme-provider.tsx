"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { readThemePreference, resolveTheme, writeThemePreference, type ThemePreference } from "@/lib/theme/preference";

type ThemeContextValue = {
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function applyTheme(preference: ThemePreference, systemIsDark: boolean): void {
  const resolved = resolveTheme(preference, systemIsDark ? "dark" : "light");
  document.documentElement.dataset.theme = resolved;
  document.documentElement.dataset.themePreference = preference;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>("system");

  useEffect(() => {
    const systemTheme = window.matchMedia("(prefers-color-scheme: dark)");
    const syncPreference = () => {
      const stored = readThemePreference();
      setPreferenceState(stored);
      applyTheme(stored, systemTheme.matches);
    };

    syncPreference();
    systemTheme.addEventListener("change", syncPreference);
    window.addEventListener("storage", syncPreference);
    return () => {
      systemTheme.removeEventListener("change", syncPreference);
      window.removeEventListener("storage", syncPreference);
    };
  }, []);

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next);
    writeThemePreference(next);
    applyTheme(next, window.matchMedia("(prefers-color-scheme: dark)").matches);
  }, []);

  const value = useMemo(() => ({ preference, setPreference }), [preference, setPreference]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const value = useContext(ThemeContext);
  if (!value) throw new Error("useTheme must be used inside ThemeProvider.");
  return value;
}
