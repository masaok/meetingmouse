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
    const recipeFor: Record<string, string> = {
      "poll-create": "create-poll",
      "poll-respond": "respond",
      "poll-organize": "organizer-actions",
      "app-home": "app-home",
    };
    for (const dir of dirs) {
      const file = `.claude/skills/verify-meetmouse/features/${recipeFor[dir] ?? dir}.md`;
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
