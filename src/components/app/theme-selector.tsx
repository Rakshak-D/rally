"use client";

import { useTheme } from "@/components/app/theme-provider";
import type { ThemePreference } from "@/lib/theme/preference";

const options: { value: ThemePreference; label: string; description: string }[] = [
  { value: "system", label: "System", description: "Follow this device" },
  { value: "light", label: "Light", description: "Warm and bright" },
  { value: "dark", label: "Dark", description: "Easy on the eyes" },
];

export function ThemeSelector() {
  const { preference, setPreference } = useTheme();

  return (
    <fieldset className="theme-selector">
      <legend>Color theme</legend>
      <p>Choose the appearance that feels right for you.</p>
      <div className="theme-selector-options">
        {options.map((option) => (
          <label className={preference === option.value ? "is-selected" : undefined} key={option.value}>
            <input
              type="radio"
              name="theme-preference"
              value={option.value}
              checked={preference === option.value}
              onChange={() => setPreference(option.value)}
            />
            <span><strong>{option.label}</strong><small>{option.description}</small></span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
