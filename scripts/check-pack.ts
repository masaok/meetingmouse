/**
 * The published tarball holds the library build, the migrations and the two files every
 * package needs, and nothing else: no app, no tests, no scripts, no env example.
 *
 *   pnpm build:lib && npm pack --dry-run --json | pnpm exec tsx scripts/check-pack.ts
 */
import { readFileSync } from "node:fs";

const ALLOWED = [
  /^dist\//,
  /^drizzle\/.+\.sql$/,
  /^drizzle\/meta\//,
  /^README\.md$/,
  /^LICENSE$/,
  /^package\.json$/,
];
const REQUIRED = [
  "dist/index.js",
  "dist/index.d.ts",
  "dist/db/index.js",
  "dist/slack/index.js",
  "dist/domain/index.js",
  "drizzle/meta/_journal.json",
];

export function problemsInPack(files: string[]): string[] {
  const out: string[] = [];
  for (const f of files)
    if (!ALLOWED.some((re) => re.test(f))) out.push(`not for the tarball: ${f}`);
  for (const r of REQUIRED)
    if (!files.includes(r)) out.push(`missing from the tarball: ${r}`);
  if (!files.some((f) => /^drizzle\/\d{4}_.+\.sql$/.test(f)))
    out.push("missing from the tarball: a numbered migration");
  return out;
}

type PackEntry = { files: { path: string }[] };

/**
 * The file paths in `npm pack --dry-run --json` output. npm up to 11 prints an array with one
 * entry; npm 12 prints an object keyed by package name.
 */
export function filesInReport(report: PackEntry[] | Record<string, PackEntry>): string[] {
  const [entry] = Array.isArray(report) ? report : Object.values(report);
  if (!entry) throw new Error("npm pack reported no package");
  return entry.files.map((f) => f.path);
}

const isMain =
  process.argv[1] && import.meta.url === new URL(process.argv[1], "file://").href;
if (isMain) {
  const files = filesInReport(JSON.parse(readFileSync(0, "utf8")));
  const problems = problemsInPack(files);
  for (const p of problems) console.error(p);
  console.log(`${files.length} files in the tarball, ${problems.length} problems`);
  process.exit(problems.length ? 1 : 0);
}
