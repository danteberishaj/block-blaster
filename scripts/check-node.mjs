// Preflight Node version guard for Rowflare.
//
// Runs before `npm run verify` / `npm test` so a wrong Node version fails with a
// clear, actionable message instead of a cryptic error like
// "node: bad option: --import".
//
// Must stay runnable on Node >=14 (no syntax newer than that) and depend on
// nothing outside the standard library.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const packageJsonPath = join(here, "..", "package.json");

function parseVersion(version) {
  // Accept full (20.19.4) and partial (21, 20.19) versions; missing minor/patch
  // default to 0 so a comparator like "<21" parses as [21, 0, 0].
  const match = /^v?(\d+)(?:\.(\d+))?(?:\.(\d+))?/.exec(String(version).trim());
  if (!match) return null;
  return [Number(match[1]), Number(match[2] || 0), Number(match[3] || 0)];
}

function compareVersions(a, b) {
  for (let i = 0; i < 3; i++) {
    if (a[i] !== b[i]) return a[i] < b[i] ? -1 : 1;
  }
  return 0;
}

// Very small subset of a semver range parser: handles the space-separated
// comparator lists we use in package.json engines, e.g. ">=20.19.4 <21".
function satisfies(current, range) {
  const comparators = String(range).trim().split(/\s+/).filter(Boolean);
  for (const comparator of comparators) {
    const opMatch = /^(>=|<=|>|<|=)?\s*(.+)$/.exec(comparator);
    if (!opMatch) return false;
    const operator = opMatch[1] || "=";
    const target = parseVersion(opMatch[2]);
    if (!target) return false;
    const cmp = compareVersions(current, target);
    if (operator === ">=" && !(cmp >= 0)) return false;
    if (operator === ">" && !(cmp > 0)) return false;
    if (operator === "<=" && !(cmp <= 0)) return false;
    if (operator === "<" && !(cmp < 0)) return false;
    if (operator === "=" && cmp !== 0) return false;
  }
  return true;
}

let range = ">=20.19.4 <21";
try {
  const pkg = JSON.parse(readFileSync(packageJsonPath, "utf8"));
  if (pkg && pkg.engines && pkg.engines.node) range = pkg.engines.node;
} catch (error) {
  // Fall back to the built-in default range if package.json can't be read.
}

const currentRaw = process.versions.node;
const current = parseVersion(currentRaw);

if (!current || !satisfies(current, range)) {
  process.stderr.write(
    "Rowflare requires Node " +
      range +
      " (found v" +
      currentRaw +
      "). Run: nvm use\n",
  );
  process.exit(1);
}
