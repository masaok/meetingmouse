import { defineConfig } from "tsdown";

/** The library build. The Next.js app in src/app is not part of it; `next build` owns that. */
export default defineConfig({
  entry: {
    index: "src/index.ts",
    "db/index": "src/db/index.ts",
    "slack/index": "src/slack/index.ts",
    "domain/index": "src/domain/index.ts",
    "web/index": "src/web/index.ts",
  },
  format: "esm",
  platform: "node",
  dts: true,
  clean: true,
  outDir: "dist",
  fixedExtension: false,
});
