import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import {
  createPoll,
  getUserAvailability,
  saveResponse,
  setMessageTs,
  setStatus,
  type Db,
} from "@/db/queries";

import { testDb } from "../../tests/db/pglite";
import { fakeClient } from "../../tests/helpers/fakeApp";
import { createGridHandlers } from "./handlers";
import { deriveGridSecret, signGridLink } from "./link";
import type { GridState } from "./state";

vi.mock("server-only", () => ({}));

const secret = deriveGridSecret("test");
const NOW = new Date("2026-10-06T16:00:00Z");
const S1 = new Date("2026-10-13T16:00:00Z");
const S2 = new Date("2026-10-13T16:30:00Z");
const S3 = new Date("2026-10-14T16:00:00Z");
const NOT_A_SLOT = new Date("2026-10-20T16:00:00Z");
const seconds = (d: Date) => d.getTime() / 1000;

let db: Db;
let pollId: string;
let client: ReturnType<typeof fakeClient>;
let handlers: ReturnType<typeof createGridHandlers>;

beforeAll(async () => {
  db = await testDb();
});

beforeEach(async () => {
  const poll = await createPoll(db, {
    teamId: "T1",
    channelId: "C1",
    creatorId: "U_ORG",
    title: "Lunch <script>",
    creatorTz: "America/Los_Angeles",
    slotMinutes: 30,
    slots: [S1, S2, S3],
  });
  pollId = poll.id;
  await setMessageTs(db, pollId, "1700000000.000100");
  client = fakeClient();
  handlers = createGridHandlers({
    secret,
    db,
    now: () => NOW,
    clientFor: async () => client as never,
  });
});

const url = (claims: { teamId?: string; userId?: string } = {}, query = "") =>
  `https://host.test/grid/${signGridLink(secret, { pollId, teamId: "T1", userId: "U1", ...claims }, NOW)}${query}`;
const get = (target: string) => handlers.GET(new Request(target));
const post = (target: string, body: unknown) =>
  handlers.POST(
    new Request(target, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
  );

describe("grid handlers", () => {
  it("serves the page with both grids, the state and the script", async () => {
    const res = await get(url());
    const page = await res.text();

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("text/html; charset=utf-8");
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(page).toContain('id="mine-grid"');
    expect(page).toContain('id="group-grid"');
    expect(page).toContain(`data-slot="${seconds(S1)}"`);
    expect(page).toContain("Lunch &lt;script&gt;");
    expect(page).not.toContain("Lunch <script>");
  });

  it("returns the state as JSON, labelled in the viewer's Slack zone", async () => {
    const res = await get(url({}, "?format=json"));
    const state = (await res.json()) as GridState;

    expect(res.status).toBe(200);
    expect(state.tz).toBe("America/Los_Angeles");
    expect(state.days.map((d) => d.label)).toEqual(["Oct 13", "Oct 14"]);
    expect(state.rows.map((r) => r.label)).toEqual(["9:00 AM", "9:30 AM"]);
    expect(state.cells).toEqual([
      [seconds(S1), seconds(S3)],
      [seconds(S2), null],
    ]);
    expect(state.me).toEqual({ name: "test", responded: false, slots: [] });
  });

  it("saves the posted slots, drops unknown ones, and re-renders the Slack message", async () => {
    const res = await post(url(), { slots: [seconds(S1), seconds(NOT_A_SLOT)] });
    const state = (await res.json()) as GridState;

    expect(res.status).toBe(200);
    expect(state.me).toEqual({ name: "test", responded: true, slots: [seconds(S1)] });
    expect(await getUserAvailability(db, pollId, "U1")).toEqual([S1]);
    expect(client.chat.update).toHaveBeenCalledTimes(1);
    expect(client.chat.update.mock.calls[0][0]).toMatchObject({
      channel: "C1",
      ts: "1700000000.000100",
    });
  });

  it("replaces the viewer's earlier answer and leaves other people's alone", async () => {
    await saveResponse(db, {
      pollId,
      userId: "U2",
      tz: "UTC",
      displayName: "two",
      slots: [S1, S2],
    });
    await post(url(), { slots: [seconds(S1), seconds(S2)] });
    const res = await post(url(), { slots: [seconds(S3)] });
    const state = (await res.json()) as GridState;

    expect(await getUserAvailability(db, pollId, "U1")).toEqual([S3]);
    expect(await getUserAvailability(db, pollId, "U2")).toEqual([S1, S2]);
    expect(state.others[String(seconds(S1))]).toEqual(["two"]);
    expect(state.othersTotal).toBe(1);
  });

  it("keeps the save when Slack cannot update the message", async () => {
    client.chat.update.mockRejectedValue({ data: { error: "channel_not_found" } });
    const res = await post(url(), { slots: [seconds(S2)] });

    expect(res.status).toBe(200);
    expect(await getUserAvailability(db, pollId, "U1")).toEqual([S2]);
  });

  it("refuses to change a poll that is not open", async () => {
    await setStatus(db, pollId, "closed");
    const res = await post(url(), { slots: [seconds(S1)] });
    const body = (await res.json()) as { error: string; state: GridState };

    expect(res.status).toBe(409);
    expect(body.error).toBe("closed");
    expect(body.state.status).toBe("closed");
    expect(await getUserAvailability(db, pollId, "U1")).toEqual([]);
  });

  it("rejects a body that is not a list of slots", async () => {
    expect((await post(url(), { slots: "all" })).status).toBe(400);
    expect((await post(url(), {})).status).toBe(400);
  });

  it("answers 404 for a forged, expired or foreign link", async () => {
    const forged = `https://host.test/grid/${signGridLink(deriveGridSecret("other"), { pollId, teamId: "T1", userId: "U1" }, NOW)}`;
    const expired = `https://host.test/grid/${signGridLink(secret, { pollId, teamId: "T1", userId: "U1" }, NOW, -1)}`;

    expect((await get(forged)).status).toBe(404);
    expect((await get(expired)).status).toBe(404);
    expect((await get(url({ teamId: "T2" }))).status).toBe(404);
    expect((await post(forged, { slots: [seconds(S1)] })).status).toBe(404);
    expect(await getUserAvailability(db, pollId, "U1")).toEqual([]);
    expect(await (await get(expired)).text()).toContain("This link has expired");
  });
});
