/**
 * Read-only health check: is this instance worth driving? Prints one line per check and exits 1
 * on any FAIL. Never prints secret values.
 *
 *   pnpm health
 *   DOCTOR_URL=http://localhost:3111 pnpm health
 */
import { config } from "dotenv";

config({ path: ".env.local", quiet: true });

const url = (process.env.DOCTOR_URL ?? "http://localhost:3000").replace(/\/$/, "");
const offline = process.env.SLACK_TOKEN_VERIFICATION === "off";
let failed = false;

function report(name: string, status: "PASS" | "FAIL" | "SKIP", detail: string): void {
  if (status === "FAIL") failed = true;
  console.log(`${status.padEnd(4)} ${name.padEnd(14)} ${detail}`);
}

// 1. Environment (names only)
for (const key of ["SLACK_BOT_TOKEN", "SLACK_SIGNING_SECRET", "DATABASE_URL"] as const) {
  const v = process.env[key];
  report(
    `env ${key}`,
    v ? "PASS" : "FAIL",
    v ? "set" : "missing (docs/LOCAL_DEV.md#environment-variables)",
  );
}
if (offline)
  report(
    "mode",
    "PASS",
    "offline (SLACK_TOKEN_VERIFICATION=off): Slack API calls will fail and be logged",
  );

// 2. Homepage
try {
  const res = await fetch(`${url}/`);
  const body = await res.text();
  report(
    "homepage",
    res.status === 200 && body.includes("Meeting Mouse") ? "PASS" : "FAIL",
    `${res.status} ${url}/`,
  );
} catch (error) {
  report(
    "homepage",
    "FAIL",
    `${url}/ unreachable: ${(error as Error).message}. Is \`pnpm dev\` running?`,
  );
}

// 3. Route rejects unsigned requests
try {
  const res = await fetch(`${url}/api/slack/events`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: "command=%2Fmeet",
  });
  const hint =
    res.status === 401
      ? "signature verification on"
      : res.status === 500
        ? "server has no env (assertEnv threw)"
        : res.status === 404
          ? "route missing"
          : "unexpected";
  report(
    "route",
    res.status === 401 ? "PASS" : "FAIL",
    `unsigned POST → ${res.status} (${hint})`,
  );
} catch (error) {
  report("route", "FAIL", (error as Error).message);
}

// 4. Database
const dbUrl = process.env.DATABASE_URL ?? "";
if (!dbUrl || /localhost|127\.0\.0\.1/.test(dbUrl)) {
  report("database", "SKIP", "no remote DATABASE_URL");
} else {
  try {
    const { neon } = await import("@neondatabase/serverless");
    const sql = neon(dbUrl);
    const rows = await sql`select count(*)::int as polls from polls`;
    report("database", "PASS", `select ok, ${rows[0]?.polls ?? "?"} polls`);
  } catch (error) {
    report("database", "FAIL", (error as Error).message.split("\n")[0]);
  }
}

// 5. Slack token
const token = process.env.SLACK_BOT_TOKEN ?? "";
if (offline || !token.startsWith("xoxb-")) {
  report("slack", "SKIP", offline ? "offline mode" : "no bot token");
} else {
  try {
    const { WebClient } = await import("@slack/web-api");
    const auth = await new WebClient(token).auth.test();
    report(
      "slack",
      auth.ok ? "PASS" : "FAIL",
      `auth.test team=${auth.team} bot_user=${auth.user_id}`,
    );
  } catch (error) {
    report("slack", "FAIL", (error as Error).message.split("\n")[0]);
  }
}

process.exit(failed ? 1 : 0);
