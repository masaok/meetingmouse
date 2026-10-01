/**
 * Pack the library from a staged copy, not from the repository root. The root package.json is
 * the app's: it carries hooks, dev tooling and the Next.js dependencies, none of which belong in
 * a tarball a host installs. The published manifest is derived here: the export map and metadata
 * from the root, and only the dependencies the built files actually import.
 *
 *   pnpm exec tsx scripts/pack-lib.ts                 # prints the tarball path
 *   pnpm exec tsx scripts/pack-lib.ts --dest .        # tarball into the current directory
 *   pnpm exec tsx scripts/pack-lib.ts --dry-run       # prints `npm pack --dry-run --json`
 */
import { execFileSync } from "node:child_process";
import {
  cpSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const SHIP = ["dist", "drizzle", "README.md", "LICENSE"];
const IMPORT =
  /(?:^|\n)\s*(?:import|export)\s[^;]*?from\s+["']([^"']+)["']|\bimport\(\s*["']([^"']+)["']\s*\)|(?:^|\n)\s*import\s+["']([^"']+)["']/g;

/** Bare package names imported by the given module sources, deduplicated and sorted. */
export function externalsOf(sources: string[]): string[] {
  const names = new Set<string>();
  for (const src of sources) {
    for (const m of src.matchAll(IMPORT)) {
      const spec = m[1] ?? m[2] ?? m[3];
      if (
        !spec ||
        spec.startsWith(".") ||
        spec.startsWith("/") ||
        spec.startsWith("node:")
      )
        continue;
      const parts = spec.split("/");
      names.add(spec.startsWith("@") ? `${parts[0]}/${parts[1]}` : parts[0]);
    }
  }
  return [...names].sort();
}

type Manifest = Record<string, unknown> & { dependencies?: Record<string, string> };

/** The manifest a host sees. Throws when a built import has no declared dependency. */
export function manifestFor(root: Manifest, externals: string[]): Manifest {
  const dependencies: Record<string, string> = {};
  for (const name of externals) {
    const version = root.dependencies?.[name];
    if (!version)
      throw new Error(`dist imports "${name}" but package.json has no dependency for it`);
    dependencies[name] = version;
  }
  const pick = [
    "name",
    "version",
    "description",
    "license",
    "repository",
    "type",
    "engines",
    "main",
    "types",
    "exports",
    "publishConfig",
  ];
  return {
    ...Object.fromEntries(pick.filter((k) => k in root).map((k) => [k, root[k]])),
    dependencies,
  };
}

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((e) => {
    const p = path.join(dir, e);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

const isMain =
  process.argv[1] && import.meta.url === new URL(process.argv[1], "file://").href;
if (isMain) {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const dest = path.resolve(
    args[args.indexOf("--dest") + 1] ||
      mkdtempSync(path.join(tmpdir(), "meetmouse-pack-")),
  );
  execFileSync("pnpm", ["build:lib"], { stdio: "ignore" });
  const root = JSON.parse(readFileSync("package.json", "utf8")) as Manifest;
  const sources = walk("dist")
    .filter((f) => f.endsWith(".js"))
    .map((f) => readFileSync(f, "utf8"));
  const manifest = manifestFor(root, externalsOf(sources));
  const stage = mkdtempSync(path.join(tmpdir(), "meetmouse-stage-"));
  for (const entry of SHIP) cpSync(entry, path.join(stage, entry), { recursive: true });
  writeFileSync(
    path.join(stage, "package.json"),
    JSON.stringify(manifest, null, 2) + "\n",
  );
  if (dryRun) {
    process.stdout.write(
      execFileSync("npm", ["pack", "--dry-run", "--json"], {
        cwd: stage,
        encoding: "utf8",
      }),
    );
  } else {
    const file = execFileSync("npm", ["pack", "--silent", "--pack-destination", dest], {
      cwd: stage,
      encoding: "utf8",
    })
      .trim()
      .split("\n")
      .pop();
    console.log(path.join(dest, file ?? ""));
  }
}
