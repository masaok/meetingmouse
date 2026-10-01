import { existsSync, readdirSync, readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { checkDocs, slug, walk } from "../scripts/check-docs";
import { collectIds, missingFromMap, walkTs } from "../scripts/check-feature-map";

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
