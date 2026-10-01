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
import { coreFeatures, createMeetingMouse } from "meetingmouse";
import { CORE_MIGRATIONS, schema } from "meetingmouse/db";
import { COMMAND_MEET, COMMANDS } from "meetingmouse/slack";
import { SLOT_MINUTES } from "meetingmouse/domain";
import { createGridHandlers, deriveGridSecret, signGridLink } from "meetingmouse/web";

process.env.SLACK_BOT_TOKEN = "xoxb-scratch";
process.env.SLACK_SIGNING_SECRET = "scratch";
process.env.DATABASE_URL = "postgres://scratch:scratch@localhost:5432/scratch";

const { app, receiver } = createMeetingMouse({
  features: coreFeatures,
  signingSecret: "scratch",
  // the offline form, as in the repo's own dev mode: no auth.test against Slack on first request
  auth: { authorize: async () => ({ botToken: "xoxb-scratch", botId: "B0", botUserId: "U0" }) },
});
const handler = createHandler(app, receiver);
const res = await handler(
  new Request("http://host/api/slack/events", { method: "POST", body: "command=%2Fmeet" }),
);
const gridSecret = deriveGridSecret("scratch");
const grid = createGridHandlers({ secret: gridSecret, clientFor: async () => { throw new Error("unreachable"); } });
const badLink = await grid.GET(new Request("http://host/grid/not-a-token"));
const goodLink = signGridLink(gridSecret, { pollId: "p", teamId: "T", userId: "U" });
const facts = {
  status: res.status,
  gridBadLink: badLink.status,
  gridLinkParts: goodLink.split(".").length,
  features: coreFeatures.map((f) => f.name),
  command: COMMAND_MEET,
  commands: COMMANDS,
  slotMinutes: SLOT_MINUTES,
  migrationsFolderEndsWith: CORE_MIGRATIONS.migrationsFolder.replace(/\\/g, "/").split("/").slice(-3).join("/"),
  tables: Object.keys(schema).length,
};
console.log(JSON.stringify(facts));
if (badLink.status !== 404) throw new Error(`expected 404 for a bad grid link, got ${badLink.status}`);
if (res.status !== 401) throw new Error(`expected 401 for an unsigned request, got ${res.status}`);
JS
node --conditions=react-server host.mjs
cd "$root"
rm -rf "$work" "$(dirname "$tgz")"
