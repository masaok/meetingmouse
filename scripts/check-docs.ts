/**
 * Validates every relative link and heading anchor in the living docs.
 * Enumerates with the filesystem (not `git ls-files`, which omits new files).
 *
 *   pnpm docs:check            # checks docs/, AGENTS.md, CONTRIBUTING.md, README.md
 *   pnpm docs:check <dir>      # checks one directory (used by the proof-of-failure test)
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

export interface DocProblem {
  file: string;
  line: number;
  message: string;
}

const MD_LINK = /\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;

/** GitHub-style heading slug. */
export function slug(heading: string): string {
  return heading
    .trim()
    .toLowerCase()
    .replace(/[`*_~]/g, "")
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/ /g, "-");
}

function headings(md: string): Set<string> {
  const out = new Set<string>();
  const counts = new Map<string, number>();
  for (const line of md.split("\n")) {
    const m = /^#{1,6}\s+(.+?)\s*#*$/.exec(line);
    if (!m) continue;
    const base = slug(m[1]);
    const n = counts.get(base) ?? 0;
    counts.set(base, n + 1);
    out.add(n === 0 ? base : `${base}-${n}`);
  }
  return out;
}

export function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const p = path.join(dir, entry);
    if (statSync(p).isDirectory()) {
      if (entry !== "node_modules" && !entry.startsWith(".")) out.push(...walk(p));
    } else if (p.endsWith(".md")) out.push(p);
  }
  return out;
}

export function checkDocs(files: string[]): DocProblem[] {
  const problems: DocProblem[] = [];
  const cache = new Map<string, Set<string>>();
  const headingsOf = (file: string) => {
    let h = cache.get(file);
    if (!h) cache.set(file, (h = headings(readFileSync(file, "utf8"))));
    return h;
  };

  for (const file of files) {
    const lines = readFileSync(file, "utf8").split("\n");
    let inFence = false;
    lines.forEach((text, i) => {
      if (text.trim().startsWith("```")) inFence = !inFence;
      if (inFence) return;
      for (const m of text.matchAll(MD_LINK)) {
        const target = m[1];
        if (/^[a-z]+:/i.test(target)) continue; // http(s), mailto
        const [rawPath, anchor] = target.split("#");
        const resolved = rawPath ? path.resolve(path.dirname(file), rawPath) : file;
        if (!existsSync(resolved)) {
          problems.push({ file, line: i + 1, message: `broken link: ${target}` });
          continue;
        }
        if (anchor && resolved.endsWith(".md") && !headingsOf(resolved).has(anchor)) {
          problems.push({ file, line: i + 1, message: `missing anchor: ${target}` });
        }
      }
    });
  }
  return problems;
}

const isMain =
  process.argv[1] && import.meta.url === new URL(process.argv[1], "file://").href;
if (isMain) {
  const root = process.argv[2];
  const files = root
    ? walk(root)
    : [...walk("docs"), "AGENTS.md", "CONTRIBUTING.md", "README.md"].filter(existsSync);
  const problems = checkDocs(files);
  for (const p of problems) console.error(`${p.file}:${p.line}: ${p.message}`);
  console.log(`${files.length} files, ${problems.length} problems`);
  process.exit(problems.length ? 1 : 0);
}
