/**
 * Exercise the Slack route without Slack. Signs a payload with SLACK_SIGNING_SECRET the
 * way Slack does (v0 HMAC over `v0:{timestamp}:{body}`) and POSTs it.
 *
 *   pnpm slack:sign --command /meet --text "Sprint planning"
 *   pnpm slack:sign --payload tests/fixtures/payloads/respond_button.json
 *   pnpm slack:sign --json tests/fixtures/payloads/app_home_opened.json     # Events API body
 *   pnpm slack:sign --url https://preview.example/api/slack/events --command /meet
 *
 * Prints the HTTP status and body. Exit code 1 on non-2xx.
 */
import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import { parseArgs } from "node:util";

import { config } from "dotenv";

config({ path: ".env.local", quiet: true });

const { values } = parseArgs({
  options: {
    url: { type: "string", default: "http://localhost:3000/api/slack/events" },
    command: { type: "string" },
    text: { type: "string", default: "" },
    payload: { type: "string" },
    json: { type: "string" },
    user: { type: "string", default: "U0000TEST" },
    channel: { type: "string", default: "C0000TEST" },
    team: { type: "string", default: "T0000TEST" },
  },
});

const secret = process.env.SLACK_SIGNING_SECRET;
if (!secret)
  throw new Error(
    "SLACK_SIGNING_SECRET is not set. See docs/LOCAL_DEV.md#environment-variables",
  );

export function sign(body: string, timestamp: number, signingSecret: string): string {
  const hmac = createHmac("sha256", signingSecret)
    .update(`v0:${timestamp}:${body}`)
    .digest("hex");
  return `v0=${hmac}`;
}

let body: string;
let contentType = "application/x-www-form-urlencoded";
if (values.json) {
  body = readFileSync(values.json, "utf8");
  contentType = "application/json";
} else if (values.command) {
  body = new URLSearchParams({
    token: "deprecated",
    team_id: values.team,
    channel_id: values.channel,
    channel_name: "test",
    user_id: values.user,
    user_name: "tester",
    command: values.command,
    text: values.text,
    response_url: "https://hooks.slack.com/commands/T0000TEST/1/xxx",
    trigger_id: `${Date.now()}.1.deadbeef`,
  }).toString();
} else if (values.payload) {
  body = new URLSearchParams({
    payload: readFileSync(values.payload, "utf8"),
  }).toString();
} else {
  console.error(
    "Pass --command /meet, --payload file.json (interactivity) or --json file.json (events)",
  );
  process.exit(2);
}

const timestamp = Math.floor(Date.now() / 1000);
const res = await fetch(values.url, {
  method: "POST",
  headers: {
    "content-type": contentType,
    "x-slack-request-timestamp": String(timestamp),
    "x-slack-signature": sign(body, timestamp, secret),
  },
  body,
});
const text = await res.text();
console.log(`${res.status} ${res.statusText}\n${text}`);
process.exit(res.ok ? 0 : 1);
