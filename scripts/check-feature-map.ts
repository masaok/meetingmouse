/**
 * Every Slack surface id in src/ (command, shortcut, event, action_id, callback_id) must be
 * documented in docs/FEATURE_MAP.md, so an agent handling a vague bug report can find it.
 *
 *   pnpm featuremap:check
 *   pnpm featuremap:check <srcDir> <featureMap.md>   # used by the proof-of-failure test
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const ID_PATTERNS = [
  /\bapp\.(?:command|shortcut|event|action|view|options)\(\s*["'`]([^"'`]+)["'`]/g,
  /\b(?:action_id|callback_id)\s*:\s*["'`]([^"'`]+)["'`]/g,
  /\b(?:ACTION|CALLBACK|COMMAND|EVENT|SHORTCUT)_[A-Z_]*\s*=\s*["'`]([^"'`]+)["'`]/g,
];

export function walkTs(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const p = path.join(dir, entry);
    if (statSync(p).isDirectory()) out.push(...walkTs(p));
    else if (/\.tsx?$/.test(p) && !/\.test\.tsx?$/.test(p)) out.push(p);
  }
  return out;
}

export function collectIds(files: string[]): Map<string, string> {
  const ids = new Map<string, string>();
  for (const file of files) {
    const src = readFileSync(file, "utf8");
    for (const re of ID_PATTERNS) {
      for (const m of src.matchAll(re)) if (!ids.has(m[1])) ids.set(m[1], file);
    }
  }
  return ids;
}

export function missingFromMap(ids: Map<string, string>, featureMap: string): string[] {
  return [...ids.keys()].filter((id) => !featureMap.includes(`\`${id}\``));
}

const isMain =
  process.argv[1] && import.meta.url === new URL(process.argv[1], "file://").href;
if (isMain) {
  const srcDir = process.argv[2] ?? "src";
  const mapPath = process.argv[3] ?? "docs/FEATURE_MAP.md";
  const ids = collectIds(walkTs(srcDir));
  const missing = missingFromMap(ids, readFileSync(mapPath, "utf8"));
  for (const id of missing)
    console.error(`undocumented surface id \`${id}\` (from ${ids.get(id)})`);
  console.log(`${ids.size} surface ids, ${missing.length} undocumented`);
  process.exit(missing.length ? 1 : 0);
}
