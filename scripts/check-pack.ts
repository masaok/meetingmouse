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

const isMain =
  process.argv[1] && import.meta.url === new URL(process.argv[1], "file://").href;
if (isMain) {
  const report = JSON.parse(readFileSync(0, "utf8")) as { files: { path: string }[] }[];
  const files = report[0].files.map((f) => f.path);
  const problems = problemsInPack(files);
  for (const p of problems) console.error(p);
  console.log(`${files.length} files in the tarball, ${problems.length} problems`);
  process.exit(problems.length ? 1 : 0);
}
