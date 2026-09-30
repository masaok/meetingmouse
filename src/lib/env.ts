import { z } from "zod";

/**
 * Every runtime entry point (route handler, script) calls `assertEnv` first, so a missing
 * variable fails with its name and where to get it, not a stack trace inside a library.
 * See docs/LOCAL_DEV.md#environment-variables.
 */
const EnvSchema = z.object({
  SLACK_BOT_TOKEN: z.string().startsWith("xoxb-", "must be a bot token (xoxb-…)"),
  SLACK_SIGNING_SECRET: z.string().min(1),
  DATABASE_URL: z.string().startsWith("postgres", "must be a Postgres connection string"),
});

export type Env = z.infer<typeof EnvSchema>;
export type EnvKey = keyof Env;

const DOC = "docs/LOCAL_DEV.md#environment-variables";

export function assertEnv(
  keys: readonly EnvKey[] = Object.keys(EnvSchema.shape) as EnvKey[],
): void {
  const picked = EnvSchema.pick(
    Object.fromEntries(keys.map((k) => [k, true])) as Record<EnvKey, true>,
  );
  const result = picked.safeParse(process.env);
  if (result.success) return;
  const problems = result.error.issues.map((i) => `  ${i.path.join(".")}: ${i.message}`);
  throw new Error(
    `Missing or invalid environment variables:\n${problems.join("\n")}\nSee ${DOC}`,
  );
}

let cached: Env | undefined;

/** Parsed, validated environment. Throws with the list of missing variables. */
export function env(): Env {
  if (!cached) {
    assertEnv();
    cached = EnvSchema.parse(process.env);
  }
  return cached;
}
