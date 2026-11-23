import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const checkerPath = fileURLToPath(new URL("./check-slop.mjs", import.meta.url));

function runChecker(css) {
  const directory = mkdtempSync(path.join(os.tmpdir(), "rally-slop-"));
  try {
    writeFileSync(path.join(directory, "fixture.css"), css, "utf8");
    try {
      const output = execFileSync(process.execPath, [checkerPath, directory], { encoding: "utf8" });
      return { code: 0, output };
    } catch (error) {
      assert.ok(error && typeof error === "object" && "status" in error);
      return { code: error.status, output: `${error.stdout ?? ""}${error.stderr ?? ""}` };
    }
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

test("allows token radii, circular avatars, and tokenized press shadows", () => {
  const result = runChecker(`
.button { border-radius: var(--r-ctrl); box-shadow: var(--shadow-press); }
.drawer { border-radius: var(--r-sheet) 0 0 var(--r-sheet); }
.avatar { border-radius: 50%; }
`);

  assert.equal(result.code, 0, result.output);
});

test("reports each banned visual pattern with a useful source location", () => {
  const result = runChecker(`
.bad {
  box-shadow: 0 0 12px rgba(0, 0, 0, .1);
  background: linear-gradient(#111, #222);
  backdrop-filter: blur(5px);
  border-radius: 16px;
  letter-spacing: -0.02em;
  text-transform: uppercase;
  content: "→";
}
`);

  assert.equal(result.code, 1, result.output);
  for (const pattern of ["box-shadow", "linear-gradient", "backdrop-filter", "border-radius", "letter-spacing", "text-transform", "→"]) {
    assert.match(result.output, new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  assert.match(result.output, /fixture\.css:\d+/);
});
