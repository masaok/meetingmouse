import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import { defineConfig, globalIgnores } from "eslint/config";

/**
 * Directory boundaries, enforced by the linter rather than by review comments.
 * See docs/ARCHITECTURE.md#dependency-rules for the reasoning behind each one.
 */
const boundary = (files, patterns, message) => ({
  files,
  rules: {
    "no-restricted-imports": [
      "error",
      { patterns: patterns.map((group) => ({ group: [group], message })) },
    ],
  },
});

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "drizzle/**",
    ".claude/worktrees/**",
  ]),

  // domain/ is pure: no Slack, no database, no framework.
  boundary(
    ["src/domain/**"],
    [
      "@slack/*",
      "@vercel/*",
      "next",
      "next/*",
      "@/db/*",
      "@/bolt/*",
      "@/slack/*",
      "@/features/*",
      "@/lib/*",
    ],
    "src/domain must stay pure (dates in, data out). Move the I/O to a feature listener.",
  ),
  // slack/ (limits, formatting, shared block helpers) renders data it is given; it never fetches.
  boundary(
    ["src/slack/**"],
    ["@/db/*", "@/bolt/*", "@/features/*"],
    "src/slack renders data it is handed. Fetch in the feature listener and pass it in.",
  ),
  // Feature block builders (blocks.ts) are renderers too.
  boundary(
    ["src/features/**/blocks.ts", "src/features/**/blocks.*.ts"],
    ["@/db/*", "@/bolt/*"],
    "Block builders render data they are handed. Fetch in listener.ts and pass it in.",
  ),
  // React UI never reaches server credentials. `server-only` is the primary guard; this is the fallback.
  boundary(
    ["src/app/**/*.tsx", "src/components/**"],
    ["@/db/*", "@/bolt/*", "@/lib/env"],
    "UI must not import server-only modules that hold credentials.",
  ),
  {
    files: ["src/**/*.ts", "src/**/*.tsx"],
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/consistent-type-imports": ["error", { prefer: "type-imports" }],
    },
  },
]);

export default eslintConfig;
