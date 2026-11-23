import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const sourceExtensions = new Set([".css", ".ts", ".tsx", ".js", ".jsx"]);
const allowedRadii = new Set(["0", "3px", "8px", "14px", "50%", "inherit"]);

function collectFiles(root) {
  const files = [];
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const fullPath = path.join(root, entry.name);
    if (entry.isDirectory()) files.push(...collectFiles(fullPath));
    else if (sourceExtensions.has(path.extname(entry.name))) files.push(fullPath);
  }
  return files;
}

function lineNumber(source, index) {
  return source.slice(0, index).split("\n").length;
}

function findMatches(source, expression, name, file) {
  const matches = [];
  for (const match of source.matchAll(expression)) {
    matches.push(`${file}:${lineNumber(source, match.index ?? 0)} ${name}: ${match[0]}`);
  }
  return matches;
}

function auditFile(file) {
  const source = readFileSync(file, "utf8");
  const matches = [];
  const displayPath = path.relative(process.cwd(), file).replaceAll("\\", "/");

  for (const match of source.matchAll(/box-shadow\s*:\s*([^;}]+)[;}]/gi)) {
    const value = match[1].trim();
    if (value !== "none" && value !== "3px 3px 0 var(--ink)" && value !== "var(--shadow-press)") {
      matches.push(`${displayPath}:${lineNumber(source, match.index)} box-shadow must be none or the hard press shadow`);
    }
  }

  matches.push(...findMatches(source, /(?:linear|radial|conic)-gradient\s*\(/gi, "gradient", displayPath));
  matches.push(...findMatches(source, /backdrop-filter\s*:/gi, "backdrop-filter", displayPath));
  matches.push(...findMatches(source, /text-transform\s*:\s*uppercase\b/gi, "text-transform", displayPath));
  matches.push(...findMatches(source, /letter-spacing\s*:\s*-[\d.]+(?:em|px)\b/gi, "letter-spacing", displayPath));
  matches.push(...findMatches(source, /(?:IBM[_ ]Plex[_ ]Mono|font-mono|font-family\s*:[^;]*\bmonospace\b)/gi, "monospace type", displayPath));
  matches.push(...findMatches(source, /[\u2192]/g, "arrow glyph in UI source", displayPath));

  for (const match of source.matchAll(/border-radius\s*:\s*([^;}]+)[;}]/gi)) {
    const value = match[1].trim();
    const components = value.split(/\s+/);
    if (!components.every((component) => allowedRadii.has(component) || /^var\(--r-(?:slot|ctrl|sheet)\)$/.test(component))) {
      matches.push(`${displayPath}:${lineNumber(source, match.index)} unapproved border-radius: ${value}`);
    }
  }

  for (const match of source.matchAll(/font-size\s*:\s*([\d.]+)(px|rem)\b/gi)) {
    const size = Number(match[1]) * (match[2].toLowerCase() === "rem" ? 16 : 1);
    if (size < 12) matches.push(`${displayPath}:${lineNumber(source, match.index)} font size below 12px`);
  }

  return matches;
}

const root = path.resolve(process.argv[2] ?? path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "src"));
const violations = collectFiles(root).flatMap(auditFile);

if (violations.length) {
  process.stderr.write(`${violations.join("\n")}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write("Rally visual slop audit passed.\n");
}
