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
for (const token of Object.keys(blockFor('[data-theme="dark"]'))) {
  if (dark[token] !== systemDark[token]) throw new Error(`System dark token ${token} differs from explicit dark theme.`);
}

const checks = [
  ["Body text on canvas", "--ink", "--road", 4.5],
  ["Body text on sheet", "--ink", "--paper", 4.5],
  ["Secondary text on canvas", "--ink-2", "--road", 4.5],
  ["Secondary text on sheet", "--ink-2", "--paper", 4.5],
  ["Inline link on canvas", "--link", "--road", 4.5],
  ["Inline link on sheet", "--link", "--paper", 4.5],
  ["Blocker text on canvas", "--stop", "--road", 4.5],
  ["Blocker text on sheet", "--stop", "--paper", 4.5],
  ["Primary button label", "--stamp-ink", "--stamp", 4.5],
  ["Active navigation label", "--stamp-ink", "--stamp", 4.5],
  ["Member You label", "--stamp-ink", "--stamp", 4.5],
  ["Focus ring on canvas", "--link", "--road", 3],
  ["Focus ring on sheet", "--link", "--paper", 3],
  ["Structural border on canvas", "--rule", "--road", 3],
  ["Structural border on sheet", "--rule", "--paper", 3],
  ["Avatar initials 1", "--ink", "--avatar-tone-1", 4.5],
  ["Avatar initials 2", "--ink", "--avatar-tone-2", 4.5],
  ["Avatar initials 3", "--ink", "--avatar-tone-3", 4.5],
  ["Avatar initials 4", "--ink", "--avatar-tone-4", 4.5],
  ["Avatar initials 5", "--ink", "--avatar-tone-5", 4.5],
  ["Avatar initials 6", "--ink", "--avatar-tone-6", 4.5],
];

let failed = false;
for (const [themeName, theme] of [["Light", light], ["Dark", dark]]) {
  const avatarText = "--ink";
  console.log(`${themeName} theme`);
  for (const [label, foregroundToken, backgroundToken, minimum] of checks) {
    const effectiveForeground = label.startsWith("Avatar initials") ? theme[avatarText] : theme[foregroundToken];
    const ratio = contrast(effectiveForeground, theme[backgroundToken]);
    const status = ratio >= minimum ? "PASS" : "FAIL";
    console.log(`${status} ${label}: ${ratio.toFixed(2)}:1 (minimum ${minimum}:1)`);
    if (ratio < minimum) failed = true;
  }
}

if (failed) process.exitCode = 1;
