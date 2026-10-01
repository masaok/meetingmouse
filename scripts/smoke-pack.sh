#!/usr/bin/env bash
# Install the packed tarball into a scratch project the way a host would, import every entry
# point under the react-server condition (what a Next.js route handler runs under), build the
# app with fake credentials, and prove the handler refuses an unsigned request with 401.
#   pnpm smoke:pack
set -euo pipefail
root=$(pwd)
tgz=$(pnpm --silent pack:lib)
receiver="@vercel/slack-bolt@$(node -p "require('./package.json').dependencies['@vercel/slack-bolt']")"
work=$(mktemp -d)
cd "$work"
printf '{ "name": "scratch-host", "private": true, "type": "module" }\n' > package.json
# a host declares the receiver package itself, because it calls createHandler
pnpm add --silent "$tgz" "$receiver" >/dev/null
cat > host.mjs <<'JS'
import { createHandler } from "@vercel/slack-bolt";
import { coreFeatures, createMeetMouse } from "meetmouse";
import { CORE_MIGRATIONS, schema } from "meetmouse/db";
import { COMMAND_WHEN } from "meetmouse/slack";
import { SLOT_MINUTES } from "meetmouse/domain";

process.env.SLACK_BOT_TOKEN = "xoxb-scratch";
process.env.SLACK_SIGNING_SECRET = "scratch";
process.env.DATABASE_URL = "postgres://scratch:scratch@localhost:5432/scratch";

const { app, receiver } = createMeetMouse({
  features: coreFeatures,
  signingSecret: "scratch",
  // the offline form, as in the repo's own dev mode: no auth.test against Slack on first request
  auth: { authorize: async () => ({ botToken: "xoxb-scratch", botId: "B0", botUserId: "U0" }) },
});
const handler = createHandler(app, receiver);
const res = await handler(
  new Request("http://host/api/slack/events", { method: "POST", body: "command=%2Fwhen" }),
);
const facts = {
  status: res.status,
  features: coreFeatures.map((f) => f.name),
  command: COMMAND_WHEN,
  slotMinutes: SLOT_MINUTES,
  migrationsFolderEndsWith: CORE_MIGRATIONS.migrationsFolder.replace(/\\/g, "/").split("/").slice(-3).join("/"),
  tables: Object.keys(schema).length,
};
console.log(JSON.stringify(facts));
if (res.status !== 401) throw new Error(`expected 401 for an unsigned request, got ${res.status}`);
JS
node --conditions=react-server host.mjs
cd "$root"
rm -rf "$work" "$(dirname "$tgz")"
