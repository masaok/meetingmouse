/**
 * Mechanical prose rules for Markdown: no long dashes, no curly quotes. Covers docs/, the
 * blog posts in content/, the root Markdown files, the skills and .github. Code fences, inline code and link targets
 * are skipped.
 *
 *   pnpm prose:check              # all prose
 *   pnpm prose:check <file...>    # given files (used by the PostToolUse hook)
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const LONG_DASH = /[–—]/;
const CURLY = /[‘’“”]/;

export function prosePath(p: string): boolean {
  if (!p.endsWith(".md")) return false;
  if (p.includes("node_modules")) return false;
  return true;
}

export function problemsIn(file: string, text: string): string[] {
  const out: string[] = [];
  let fence = false;
  let generated = false;
  text.split("\n").forEach((raw, i) => {
    // The Next.js agent-rules block is rewritten by `next dev`; not ours to edit.
    if (raw.includes("BEGIN:nextjs-agent-rules")) generated = true;
    if (raw.includes("END:nextjs-agent-rules")) generated = false;
    if (generated) return;
    if (raw.trim().startsWith("```")) {
      fence = !fence;
      return;
    }
    if (fence) return;
    const line = raw.replace(/`[^`]*`/g, "").replace(/\]\([^)]*\)/g, "]");
    if (LONG_DASH.test(line))
      out.push(`${file}:${i + 1}: long dash; use a period or comma`);
    if (CURLY.test(line)) out.push(`${file}:${i + 1}: curly quote; use straight quotes`);
  });
  return out;
}

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const e of readdirSync(dir)) {
    const p = path.join(dir, e);
    if (statSync(p).isDirectory()) {
      if (e !== "node_modules" && e !== ".git") out.push(...walk(p));
    } else out.push(p);
  }
  return out;
}

const isMain =
  process.argv[1] && import.meta.url === new URL(process.argv[1], "file://").href;
if (isMain) {
  const own = [
    "docs",
    "content",
    "AGENTS.md",
    "CONTRIBUTING.md",
    "README.md",
    "SECURITY.md",
    "CODE_OF_CONDUCT.md",
    ".claude/skills",
    ".github",
  ];
  const given = process.argv.slice(2);
  const files = (
    given.length
      ? given
      : own.flatMap((p) =>
          existsSync(p) ? (statSync(p).isDirectory() ? walk(p) : [p]) : [],
        )
  ).filter(prosePath);
  const problems = files.flatMap((f) => problemsIn(f, readFileSync(f, "utf8")));
  for (const p of problems) console.error(p);
  console.log(`${files.length} files, ${problems.length} problems`);
  process.exit(problems.length ? 1 : 0);
}
