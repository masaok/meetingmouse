import { existsSync, readdirSync, readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { checkDocs, slug, walk } from "../scripts/check-docs";
import { collectIds, missingFromMap, walkTs } from "../scripts/check-feature-map";
import { filesInReport, problemsInPack } from "../scripts/check-pack";
import { externalsOf, manifestFor } from "../scripts/pack-lib";

/** Proof-of-failure: each custom check must fail on the fixture built to break it. */
describe("check-docs", () => {
  it("fails on a broken link and a missing anchor", () => {
    const problems = checkDocs(walk("tests/fixtures/docs-bad"));
    expect(problems.map((p) => p.message)).toEqual([
      "broken link: ./does-not-exist.md",
      "missing anchor: ./other.md#nope",
    ]);
  });

  it("slugs headings like GitHub", () => {
    expect(slug("Time zones & DST")).toBe("time-zones--dst");
    expect(slug("`pnpm verify` gate")).toBe("pnpm-verify-gate");
  });

  it("passes on the real docs", () => {
    expect(
      checkDocs([...walk("docs"), "AGENTS.md", "CONTRIBUTING.md", "README.md"]),
    ).toEqual([]);
  });
});

describe("check-feature-map", () => {
  it("fails on an undocumented surface id", () => {
    const ids = collectIds(walkTs("tests/fixtures/feature-map-bad/src"));
    const map = readFileSync("tests/fixtures/feature-map-bad/FEATURE_MAP.md", "utf8");
    expect(missingFromMap(ids, map)).toEqual(["undocumented_button"]);
  });

  it("passes on the real source", () => {
    const ids = collectIds(walkTs("src"));
    expect(ids.size).toBeGreaterThan(0);
    expect(missingFromMap(ids, readFileSync("docs/FEATURE_MAP.md", "utf8"))).toEqual([]);
  });
});

describe("verification recipes", () => {
  it("every feature directory has a recipe with the four required sections", () => {
    const dirs = readdirSync("src/features", { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name);
    for (const dir of dirs) {
      const file = `.claude/skills/verify-meetmouse/features/${dir}.md`;
      expect(existsSync(file), `${dir} needs ${file}`).toBe(true);
      const md = readFileSync(file, "utf8");
      for (const h2 of [
        "## Sub-features",
        "## How to get to it (user POV)",
        "## Driving it with slack-sign",
        "## Gotchas",
      ]) {
        expect(md, `${file} is missing "${h2}"`).toContain(h2);
      }
    }
  });
});

/**
 * pnpm resolves its own commands before package scripts, so a script named like one of them is
 * unreachable through `pnpm <name>` and silently runs the built-in instead. Script runners
 * (`start`, `test`, `run`) are not in the list because they do run the script.
 */
const PNPM_BUILTINS = new Set([
  "add",
  "approve-builds",
  "audit",
  "bin",
  "config",
  "create",
  "dedupe",
  "deploy",
  "dlx",
  "doctor",
  "env",
  "exec",
  "fetch",
  "import",
  "init",
  "install",
  "licenses",
  "link",
  "list",
  "ls",
  "outdated",
  "pack",
  "patch",
  "prune",
  "publish",
  "rebuild",
  "remove",
  "root",
  "self-update",
  "setup",
  "store",
  "unlink",
  "update",
  "why",
]);

describe("package scripts", () => {
  it("no script name is shadowed by a pnpm built-in command", () => {
    const { scripts } = JSON.parse(readFileSync("package.json", "utf8")) as {
      scripts: Record<string, string>;
    };
    const shadowed = Object.keys(scripts).filter((name) => PNPM_BUILTINS.has(name));
    expect(shadowed).toEqual([]);
  });

  it("fails on a script named like a built-in", () => {
    expect(["doctor"].filter((name) => PNPM_BUILTINS.has(name))).toEqual(["doctor"]);
  });
});

describe("check-pack", () => {
  const good = [
    "package.json",
    "README.md",
    "LICENSE",
    "dist/index.js",
    "dist/index.d.ts",
    "dist/db/index.js",
    "dist/slack/index.js",
    "dist/domain/index.js",
    "drizzle/0000_x.sql",
    "drizzle/meta/_journal.json",
  ];
  it("passes a tarball with exactly the library, the migrations and the two files", () => {
    expect(problemsInPack(good)).toEqual([]);
  });
  it("fails on app code, secrets examples or a missing entry point", () => {
    expect(problemsInPack([...good, "src/app/page.tsx", ".env.example"])).toEqual([
      "not for the tarball: src/app/page.tsx",
      "not for the tarball: .env.example",
    ]);
    expect(problemsInPack(good.filter((f) => f !== "dist/db/index.js"))).toEqual([
      "missing from the tarball: dist/db/index.js",
    ]);
  });
  it("reads the file list from npm 11's array and from npm 12's object", () => {
    const entry = { files: [{ path: "LICENSE" }, { path: "dist/index.js" }] };
    expect(filesInReport([entry])).toEqual(["LICENSE", "dist/index.js"]);
    expect(filesInReport({ meetmouse: entry })).toEqual(["LICENSE", "dist/index.js"]);
    expect(() => filesInReport([])).toThrow("npm pack reported no package");
  });
});

describe("pack-lib", () => {
  it("finds the bare packages the built files import, side-effect imports included", () => {
    const sources = [
      'import { App } from "@slack/bolt";\nimport { neon } from "@neondatabase/serverless";\nimport x from "./chunk-abc.js";\nimport { readFileSync } from "node:fs";',
      'export * from "drizzle-orm/pg-core";\nconst m = await import("zod");',
      'import "server-only";\nimport "./side-effect.js";',
    ];
    expect(externalsOf(sources)).toEqual([
      "@neondatabase/serverless",
      "@slack/bolt",
      "drizzle-orm",
      "server-only",
      "zod",
    ]);
  });

  it("derives the published manifest from the root and refuses an undeclared import", () => {
    const root = {
      name: "meetmouse",
      version: "0.1.0",
      license: "MIT",
      type: "module",
      scripts: { prepare: "husky", preinstall: "npx only-allow pnpm" },
      devDependencies: { vitest: "^5" },
      dependencies: { zod: "^4", next: "16.3.6" },
      exports: { ".": "./dist/index.js" },
    };
    expect(manifestFor(root, ["zod"])).toEqual({
      name: "meetmouse",
      version: "0.1.0",
      license: "MIT",
      type: "module",
      exports: { ".": "./dist/index.js" },
      dependencies: { zod: "^4" },
    });
    expect(() => manifestFor(root, ["left-pad"])).toThrow(
      'dist imports "left-pad" but package.json has no dependency for it',
    );
  });
});
