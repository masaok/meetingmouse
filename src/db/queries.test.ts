import { sql } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";

import { testDb } from "../../tests/db/pglite";
import {
  createPoll,
  deletePoll,
  getCachedUser,
  getPoll,
  getPollByMessage,
  getPollSnapshot,
  getUserAvailability,
  listPollsForUser,
  rowsOf,
  saveResponse,
  setMessageTs,
  setStatus,
  upsertCachedUser,
  type Db,
} from "./queries";

const at = (iso: string) => new Date(iso);
const S1 = at("2026-10-01T16:00:00Z");
const S2 = at("2026-10-01T16:30:00Z");
const S3 = at("2026-10-01T17:00:00Z");
const S4 = at("2026-10-02T16:00:00Z");
const NOT_A_SLOT = at("2026-10-05T09:00:00Z");

let db: Db;
beforeAll(async () => {
  db = await testDb();
});

async function newPoll(overrides: Partial<Parameters<typeof createPoll>[1]> = {}) {
  return createPoll(db, {
    teamId: "T1",
    channelId: "C1",
    creatorId: "U_ORG",
    title: "Sprint planning",
    creatorTz: "America/Los_Angeles",
    slotMinutes: 30,
    slots: [S3, S1, S2, S4],
    ...overrides,
  });
}

const respond = (
  pollId: string,
  userId: string,
  slots: Date[],
  tz = "UTC",
  displayName = userId,
) => saveResponse(db, { pollId, userId, tz, displayName, slots });

/** Drizzle wraps driver errors ("Failed query: …") and keeps the Postgres error as `cause`. */
async function rejectsWithConstraint(
  p: Promise<unknown>,
  constraint: RegExp,
): Promise<void> {
  await expect(p).rejects.toSatisfy((e: unknown) => {
    const err = e as Error & { cause?: Error };
    return constraint.test(err.cause?.message ?? "") || constraint.test(err.message);
  });
}

async function countRows(table: string, pollId: string): Promise<number> {
  const result = await db.execute(
    sql`select count(*)::int as n from ${sql.raw(table)} where poll_id = ${pollId}::uuid`,
  );
  return rowsOf<{ n: number }>(result)[0].n;
}

describe("createPoll", () => {
  it("inserts the poll and its slots atomically and returns the domain object", async () => {
    const poll = await newPoll();
    expect(poll.status).toBe("open");
    expect(poll.slotMinutes).toBe(30);
    expect(poll.messageTs).toBeNull();
    expect(poll.createdAt).toBeInstanceOf(Date);
    const snap = await getPollSnapshot(db, poll.id);
    expect(snap?.slots).toEqual([S1, S2, S3, S4]);
  });

  it("rejects an empty slot list before touching the database", async () => {
    await expect(newPoll({ slots: [] })).rejects.toThrow(/at least one slot/);
  });

  it("rejects a slot length outside SLOT_MINUTES via the check constraint, inserting nothing", async () => {
    const before = rowsOf<{ n: number }>(
      await db.execute(sql`select count(*)::int as n from polls`),
    )[0].n;
    await rejectsWithConstraint(
      newPoll({ slotMinutes: 45 as never }),
      /polls_slot_minutes_check/,
    );
    const after = rowsOf<{ n: number }>(
      await db.execute(sql`select count(*)::int as n from polls`),
    )[0].n;
    expect(after).toBe(before);
  });
});

describe("saveResponse", () => {
  it("is replace-all: add three, then two with one overlap, leaves exactly two", async () => {
    const poll = await newPoll();
    await respond(poll.id, "U1", [S1, S2, S3], "UTC", "One");
    expect(await getUserAvailability(db, poll.id, "U1")).toEqual([S1, S2, S3]);

    const before = (await getPollSnapshot(db, poll.id))!.participants[0].respondedAt;
    await db.execute(sql`select pg_sleep(0.01)`);
    await respond(poll.id, "U1", [S3, S4], "Asia/Tokyo", "Ichi");

    expect(await getUserAvailability(db, poll.id, "U1")).toEqual([S3, S4]);
    const snap = (await getPollSnapshot(db, poll.id))!;
    expect(snap.participants).toHaveLength(1);
    expect(snap.participants[0]).toMatchObject({
      userId: "U1",
      tz: "Asia/Tokyo",
      displayName: "Ichi",
    });
    expect(snap.participants[0].respondedAt.getTime()).toBeGreaterThan(before.getTime());
  });

  it('with no slots keeps the participant ("none of these work") and clears their rows', async () => {
    const poll = await newPoll();
    await respond(poll.id, "U2", [S1]);
    await respond(poll.id, "U2", []);
    const snap = (await getPollSnapshot(db, poll.id))!;
    expect(snap.participants.map((p) => p.userId)).toEqual(["U2"]);
    expect(snap.availability).toEqual([]);
  });

  it("rejects a slot that is not in the poll and leaves prior rows intact", async () => {
    const poll = await newPoll();
    await respond(poll.id, "U3", [S1, S2]);
    await rejectsWithConstraint(
      respond(poll.id, "U3", [S1, NOT_A_SLOT]),
      /availability_slot_fk/,
    );
    expect(await getUserAvailability(db, poll.id, "U3")).toEqual([S1, S2]);
  });

  it("keeps users independent", async () => {
    const poll = await newPoll();
    await respond(poll.id, "UA", [S1]);
    await respond(poll.id, "UB", [S1, S2]);
    await respond(poll.id, "UA", [S4]);
    const snap = (await getPollSnapshot(db, poll.id))!;
    expect(snap.availability).toEqual([
      { userId: "UB", slotStart: S1 },
      { userId: "UB", slotStart: S2 },
      { userId: "UA", slotStart: S4 },
    ]);
  });

  it("two people saving at the same moment both land, each with their own slots", async () => {
    const poll = await newPoll();
    await Promise.all([
      respond(poll.id, "UA", [S1, S2]),
      respond(poll.id, "UB", [S2, S3]),
    ]);
    const snap = (await getPollSnapshot(db, poll.id))!;
    expect(snap.participants.map((p) => p.userId).sort()).toEqual(["UA", "UB"]);
    expect(await getUserAvailability(db, poll.id, "UA")).toEqual([S1, S2]);
    expect(await getUserAvailability(db, poll.id, "UB")).toEqual([S2, S3]);
  });

  it("one person saving twice at the same moment ends with one answer, never a mix", async () => {
    const poll = await newPoll();
    const first = [S1, S2];
    const second = [S3, S4];
    await Promise.all([respond(poll.id, "UA", first), respond(poll.id, "UA", second)]);
    const snap = (await getPollSnapshot(db, poll.id))!;
    expect(snap.participants).toHaveLength(1);
    const saved = await getUserAvailability(db, poll.id, "UA");
    expect([first, second]).toContainEqual(saved);
  });
});

describe("poll lifecycle", () => {
  it("setMessageTs and getPollByMessage round-trip", async () => {
    const poll = await newPoll({ channelId: "C_TS" });
    await setMessageTs(db, poll.id, "1700000000.000100");
    const found = await getPollByMessage(db, "C_TS", "1700000000.000100");
    expect(found?.id).toBe(poll.id);
    expect(found?.updatedAt.getTime()).toBeGreaterThanOrEqual(poll.updatedAt.getTime());
    expect(await getPollByMessage(db, "C_TS", "nope")).toBeNull();
  });

  it("setStatus records the final slot and rejects unknown statuses", async () => {
    const poll = await newPoll();
    await setStatus(db, poll.id, "scheduled", S2);
    expect(await getPoll(db, poll.id)).toMatchObject({
      status: "scheduled",
      finalSlotStart: S2,
    });
    await setStatus(db, poll.id, "closed");
    expect(await getPoll(db, poll.id)).toMatchObject({
      status: "closed",
      finalSlotStart: null,
    });
    await rejectsWithConstraint(
      setStatus(db, poll.id, "bogus" as never),
      /polls_status_check/,
    );
  });

  it("deletePoll cascades to slots, participants and availability", async () => {
    const poll = await newPoll();
    await respond(poll.id, "U9", [S1]);
    expect(await countRows("availability", poll.id)).toBe(1);
    await deletePoll(db, poll.id);
    expect(await getPoll(db, poll.id)).toBeNull();
    expect(await getPollSnapshot(db, poll.id)).toBeNull();
    expect(await countRows("poll_slots", poll.id)).toBe(0);
    expect(await countRows("participants", poll.id)).toBe(0);
    expect(await countRows("availability", poll.id)).toBe(0);
  });

  it("getPollSnapshot returns null for an unknown poll", async () => {
    expect(await getPollSnapshot(db, "00000000-0000-0000-0000-000000000000")).toBeNull();
  });
});

describe("listPollsForUser", () => {
  it("separates organized from responded-to and excludes other teams", async () => {
    const mine = await newPoll({ teamId: "T_LIST", creatorId: "U_ME" });
    const theirs = await newPoll({ teamId: "T_LIST", creatorId: "U_THEM" });
    const otherTeam = await newPoll({ teamId: "T_OTHER", creatorId: "U_ME" });
    await respond(mine.id, "U_ME", [S1]);
    await respond(theirs.id, "U_ME", [S1]);
    await respond(otherTeam.id, "U_ME", [S1]);

    const { organized, responded } = await listPollsForUser(db, "T_LIST", "U_ME");
    expect(organized.map((p) => p.id)).toEqual([mine.id]);
    expect(responded.map((p) => p.id)).toEqual([theirs.id]);
  });
});

describe("slack_users cache", () => {
  it("upserts and reads back", async () => {
    expect(await getCachedUser(db, "T1", "U_C")).toBeNull();
    await upsertCachedUser(db, {
      teamId: "T1",
      userId: "U_C",
      tz: "Europe/Paris",
      displayName: "Céline",
    });
    await upsertCachedUser(db, {
      teamId: "T1",
      userId: "U_C",
      tz: "Europe/Berlin",
      displayName: "Céline",
    });
    const cached = await getCachedUser(db, "T1", "U_C");
    expect(cached).toMatchObject({ tz: "Europe/Berlin", displayName: "Céline" });
    expect(cached?.fetchedAt).toBeInstanceOf(Date);
  });
});
