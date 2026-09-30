/** Runs before `pnpm dev`. Names what is missing instead of failing on the first request. */
import { config } from "dotenv";

config({ path: ".env.local", quiet: true });

const { assertEnv } = await import("../src/lib/env");
try {
  assertEnv();
} catch (error) {
  console.warn(`\x1b[33m⚠  ${(error as Error).message}\x1b[0m`);
  console.warn(
    "\x1b[33m   The homepage will work; Slack requests will fail until these are set.\x1b[0m",
  );
}
