/**
 * Import every real entry point the way production loads it (tsx, react-server condition),
 * so a module that only breaks at import time fails here instead of on the first request.
 * Run: pnpm smoke
 */
import { pathToFileURL } from "node:url";

process.env.SLACK_BOT_TOKEN ??= "xoxb-smoke";
process.env.SLACK_SIGNING_SECRET ??= "smoke";
process.env.DATABASE_URL ??= "postgres://smoke:smoke@localhost:5432/smoke";

const entryPoints = [
  "src/app/api/slack/events/route.ts",
  "src/bolt/app.ts",
  "src/bolt/create.ts",
  "src/db/client.ts",
  "src/db/schema.ts",
  "src/features/index.ts",
  "drizzle.config.ts",
];

let failed = false;
for (const file of entryPoints) {
  try {
    const mod = await import(pathToFileURL(file).href);
    console.log(`ok   ${file} (${Object.keys(mod).join(", ") || "no exports"})`);
  } catch (error) {
    failed = true;
    console.error(`FAIL ${file}`);
    console.error(error);
  }
}
process.exit(failed ? 1 : 0);
