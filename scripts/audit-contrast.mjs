import { readFileSync } from "node:fs";

const tokenCss = readFileSync(new URL("../src/app/styles/tokens.css", import.meta.url), "utf8");

function blockFor(selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = tokenCss.match(new RegExp(`${escaped}\\s*\\{([^}]+)\\}`));
  if (!match) throw new Error(`Missing token block: ${selector}`);
  return Object.fromEntries([...match[1].matchAll(/(--[\w-]+):\s*(#[\da-fA-F]{6})\s*;/g)].map(([, name, value]) => [name, value]));
}

function luminance(hex) {
  const channels = hex.slice(1).match(/.{2}/g)?.map((channel) => Number.parseInt(channel, 16) / 255);
  if (!channels || channels.length !== 3) throw new Error(`Invalid color token: ${hex}`);
  const linear = channels.map((channel) => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

function contrast(foreground, background) {
  const [lighter, darker] = [luminance(foreground), luminance(background)].sort((left, right) => right - left);
  return (lighter + 0.05) / (darker + 0.05);
}

const light = blockFor(":root");
const dark = { ...light, ...blockFor('[data-theme="dark"]') };
const systemDark = blockFor(":root:not([data-theme])");
for (const [name, value] of Object.entries(systemDark)) {
  if (dark[name] !== value) throw new Error(`System dark token ${name} differs from explicit dark theme.`);
}

const checks = [
  ["Body text on canvas", "--text", "--bg", 4.5],
  ["Body text on surface", "--text", "--surface", 4.5],
  ["Body text on quiet surface", "--text", "--surface-2", 4.5],
  ["Body text on success surface", "--text", "--success-soft", 4.5],
  ["Body text on warning surface", "--text", "--warning-soft", 4.5],
  ["Body text on danger surface", "--text", "--danger-soft", 4.5],
  ["Muted text on canvas", "--text-muted", "--bg", 4.5],
  ["Muted text on surface", "--text-muted", "--surface", 4.5],
  ["Muted text on quiet surface", "--text-muted", "--surface-2", 4.5],
  ["Muted text on success surface", "--text-muted", "--success-soft", 4.5],
  ["Muted text on warning surface", "--text-muted", "--warning-soft", 4.5],
  ["Muted text on danger surface", "--text-muted", "--danger-soft", 4.5],
  ["Primary text on canvas", "--primary-text", "--bg", 4.5],
  ["Primary text on surface", "--primary-text", "--surface", 4.5],
  ["Primary text on quiet surface", "--primary-text", "--surface-2", 4.5],
  ["Primary text on selected surface", "--primary-text", "--primary-soft", 4.5],
  ["Primary button label", "--on-primary", "--primary", 4.5],
  ["Primary hover button label", "--on-primary", "--primary-hover", 4.5],
  ["Success label", "--success", "--success-soft", 4.5],
  ["Warning label", "--warning", "--warning-soft", 4.5],
  ["Danger label", "--danger", "--danger-soft", 4.5],
  ["Primary focus ring on canvas", "--primary", "--bg", 3],
  ["Primary focus ring on surface", "--primary", "--surface", 3],
  ["Control border on canvas", "--border-strong", "--bg", 3],
  ["Control border on surface", "--border-strong", "--surface", 3],
  ["Control border on quiet surface", "--border-strong", "--surface-2", 3],
];

let failed = false;
for (const [themeName, theme] of [["Light", light], ["Dark", dark]]) {
  console.log(`${themeName} theme`);
  for (const [label, foregroundToken, backgroundToken, minimum] of checks) {
    const ratio = contrast(theme[foregroundToken], theme[backgroundToken]);
    const status = ratio >= minimum ? "PASS" : "FAIL";
    console.log(`${status} ${label}: ${ratio.toFixed(2)}:1 (minimum ${minimum}:1)`);
    if (ratio < minimum) failed = true;
  }
}

if (failed) process.exitCode = 1;
