/**
 * Serve the web grid for a fixture poll, with an in-process Postgres and no Slack, so the
 * page can be opened and driven in a browser. Prints one link per fixture person.
 *
 *   pnpm grid:preview            # http://localhost:4010
 *   pnpm grid:preview 4020
 */
import { createServer } from "node:http";

import {
  createPoll,
  saveResponse,
  setMessageTs,
  upsertCachedUser,
} from "../src/db/queries";
import { generateSlots, upcomingDates } from "../src/domain/slots";
import { createGridHandlers, type GridClient } from "../src/web/handlers";
import { deriveGridSecret, signGridLink } from "../src/web/link";
import { testDb } from "../tests/db/pglite";

const port = Number(process.argv[2] ?? 4010);
const tz = "America/Los_Angeles";
const secret = deriveGridSecret("grid-preview");
const db = await testDb();

const slots = generateSlots({
  dates: upcomingDates(new Date(), tz, 5).slice(1),
  fromMinutes: 9 * 60,
  toMinutes: 17 * 60,
  slotMinutes: 30,
  tz,
});
const poll = await createPoll(db, {
  teamId: "T_PREVIEW",
  channelId: "C_PREVIEW",
  creatorId: "U_YOU",
  title: "Sprint planning",
  creatorTz: tz,
  slotMinutes: 30,
  slots,
});
await setMessageTs(db, poll.id, "1700000000.000100");

const people = [
  { userId: "U_YOU", displayName: "you", from: -1, to: -1 },
  { userId: "U_ADA", displayName: "ada", from: 3, to: 9 },
  { userId: "U_LIN", displayName: "lin", from: 5, to: 12 },
  { userId: "U_SAM", displayName: "sam", from: 4, to: 7 },
];
const perDay = slots.length / 4;
for (const p of people) {
  await upsertCachedUser(db, {
    teamId: poll.teamId,
    userId: p.userId,
    tz,
    displayName: p.displayName,
  });
  if (p.from < 0) continue;
  await saveResponse(db, {
    pollId: poll.id,
    userId: p.userId,
    tz,
    displayName: p.displayName,
    slots: slots.filter((_, i) => i % perDay >= p.from && i % perDay < p.to),
  });
}

const updates: unknown[] = [];
const client = {
  users: { info: async () => ({ ok: true, user: { tz, name: "preview" } }) },
  chat: {
    update: async (args: unknown) => {
      updates.push(args);
      console.log(`chat.update #${updates.length} (the Slack message would re-render)`);
      return { ok: true };
    },
  },
} as unknown as GridClient;
const handlers = createGridHandlers({ secret, db, clientFor: async () => client });

createServer(async (req, res) => {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  const request = new Request(`http://localhost:${port}${req.url}`, {
    method: req.method,
    headers: { "content-type": req.headers["content-type"] ?? "" },
    body: req.method === "POST" ? Buffer.concat(chunks) : undefined,
  });
  const handle = req.method === "POST" ? handlers.POST : handlers.GET;
  const response = await handle(request);
  res.writeHead(response.status, Object.fromEntries(response.headers));
  res.end(Buffer.from(await response.arrayBuffer()));
}).listen(port, () => {
  for (const p of people) {
    const token = signGridLink(secret, {
      pollId: poll.id,
      teamId: poll.teamId,
      userId: p.userId,
    });
    console.log(`${p.displayName}: http://localhost:${port}/grid/${token}`);
  }
});
