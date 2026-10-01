import { and, asc, desc, eq, ne, sql } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";

import type { PollStatus, SlotMinutes } from "@/domain/constants";
import type { AvailabilityRow, Participant, Poll, PollSnapshot } from "@/domain/types";

import * as schema from "./schema";

/**
 * Queries take the database as their first argument so the same code runs against Neon
 * (neon-http) in production and PGlite in tests. Multi-row writes that must be atomic are
 * single statements with data-modifying CTEs: no `batch`, no `transaction`, so no driver
 * differences. See docs/DATA_MODEL.md#semantics.
 */
export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;

const { polls, pollSlots, participants, availability, slackUsers } = schema;

type PollRow = typeof polls.$inferSelect;

const toPoll = (row: PollRow): Poll => ({
  id: row.id,
  teamId: row.teamId,
  channelId: row.channelId,
  messageTs: row.messageTs,
  creatorId: row.creatorId,
  title: row.title,
  creatorTz: row.creatorTz,
  slotMinutes: row.slotMinutes as SlotMinutes,
  status: row.status as PollStatus,
  finalSlotStart: row.finalSlotStart,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});

/** Postgres array parameter of instants. Dates go over the wire as ISO strings. */
const tsArray = (dates: Date[]) =>
  sql`${sql.param(dates.map((d) => d.toISOString()))}::timestamptz[]`;

/** Drivers disagree on the shape of `execute` results; every Postgres driver exposes `rows`. */
export function rowsOf<T>(result: unknown): T[] {
  if (Array.isArray(result)) return result as T[];
  const rows = (result as { rows?: T[] }).rows;
  if (!rows) throw new Error("execute() result has no rows");
  return rows;
}

export interface CreatePollInput {
  teamId: string;
  channelId: string;
  creatorId: string;
  title: string;
  creatorTz: string;
  slotMinutes: SlotMinutes;
  slots: Date[];
}

/** Inserts the poll and all of its slots in one statement. */
export async function createPoll(db: Db, input: CreatePollInput): Promise<Poll> {
  if (input.slots.length === 0)
    throw new Error("createPoll: a poll needs at least one slot");
  const result = await db.execute(sql`
    with p as (
      insert into ${polls} (team_id, channel_id, creator_id, title, creator_tz, slot_minutes)
      values (${input.teamId}, ${input.channelId}, ${input.creatorId}, ${input.title}, ${input.creatorTz}, ${input.slotMinutes})
      returning id
    ),
    s as (
      insert into ${pollSlots} (poll_id, slot_start)
      select p.id, unnest(${tsArray(input.slots)}) from p
    )
    select id from p
  `);
  const id = rowsOf<{ id: string }>(result)[0]?.id;
  if (!id) throw new Error("createPoll: insert returned no id");
  const poll = await getPoll(db, id);
  if (!poll) throw new Error("createPoll: poll vanished after insert");
  return poll;
}

export interface SaveResponseInput {
  pollId: string;
  userId: string;
  tz: string;
  displayName: string;
  /** Empty means "none of these work for me": the participant row is kept, availability cleared. */
  slots: Date[];
}

/**
 * Replace-all for one user, atomically, in one statement:
 * upsert the participant, delete rows not in the new set, insert rows not yet present.
 * The delete and the insert never touch the same row, so same-snapshot CTE semantics are safe.
 * A slot that is not in `poll_slots` violates the FK and rejects the whole statement.
 */
export async function saveResponse(db: Db, input: SaveResponseInput): Promise<void> {
  const slots = tsArray(input.slots);
  await db.execute(sql`
    with p as (
      insert into ${participants} (poll_id, user_id, tz, display_name)
      values (${input.pollId}::uuid, ${input.userId}, ${input.tz}, ${input.displayName})
      on conflict (poll_id, user_id) do update
        set tz = excluded.tz, display_name = excluded.display_name, responded_at = now()
    ),
    d as (
      delete from ${availability}
      where poll_id = ${input.pollId}::uuid and user_id = ${input.userId}
        and slot_start <> all(${slots})
    )
    insert into ${availability} (poll_id, user_id, slot_start)
    select ${input.pollId}::uuid, ${input.userId}, unnest(${slots})
    on conflict do nothing
  `);
}

export interface ToggleSlotInput {
  pollId: string;
  userId: string;
  tz: string;
  displayName: string;
  slot: Date;
}

/**
 * Flip one slot for one user, atomically, in one statement: upsert the participant, delete
 * the row if it is there, insert it if the delete found nothing. Two clicks on the same slot
 * that race cannot leave a duplicate. A slot that is not in `poll_slots` violates the FK.
 */
export async function toggleSlot(db: Db, input: ToggleSlotInput): Promise<void> {
  const slot = sql`${input.slot.toISOString()}::timestamptz`;
  await db.execute(sql`
    with p as (
      insert into ${participants} (poll_id, user_id, tz, display_name)
      values (${input.pollId}::uuid, ${input.userId}, ${input.tz}, ${input.displayName})
      on conflict (poll_id, user_id) do update
        set tz = excluded.tz, display_name = excluded.display_name, responded_at = now()
    ),
    d as (
      delete from ${availability}
      where poll_id = ${input.pollId}::uuid and user_id = ${input.userId}
        and slot_start = ${slot}
      returning 1
    )
    insert into ${availability} (poll_id, user_id, slot_start)
    select ${input.pollId}::uuid, ${input.userId}, ${slot}
    where not exists (select 1 from d)
    on conflict do nothing
  `);
}

/** Forget one user's answer entirely: the participant row, and its availability by cascade. */
export async function removeResponse(
  db: Db,
  pollId: string,
  userId: string,
): Promise<void> {
  await db
    .delete(participants)
    .where(and(eq(participants.pollId, pollId), eq(participants.userId, userId)));
}

export async function getPoll(db: Db, pollId: string): Promise<Poll | null> {
  const [row] = await db.select().from(polls).where(eq(polls.id, pollId)).limit(1);
  return row ? toPoll(row) : null;
}

export async function getPollByMessage(
  db: Db,
  channelId: string,
  messageTs: string,
): Promise<Poll | null> {
  const [row] = await db
    .select()
    .from(polls)
    .where(and(eq(polls.channelId, channelId), eq(polls.messageTs, messageTs)))
    .limit(1);
  return row ? toPoll(row) : null;
}

export async function getPollSnapshot(
  db: Db,
  pollId: string,
): Promise<PollSnapshot | null> {
  const poll = await getPoll(db, pollId);
  if (!poll) return null;
  const [slotRows, participantRows, availabilityRows] = await Promise.all([
    db
      .select({ slotStart: pollSlots.slotStart })
      .from(pollSlots)
      .where(eq(pollSlots.pollId, pollId))
      .orderBy(asc(pollSlots.slotStart)),
    db
      .select()
      .from(participants)
      .where(eq(participants.pollId, pollId))
      .orderBy(asc(participants.respondedAt), asc(participants.userId)),
    db
      .select({ userId: availability.userId, slotStart: availability.slotStart })
      .from(availability)
      .where(eq(availability.pollId, pollId))
      .orderBy(asc(availability.slotStart), asc(availability.userId)),
  ]);
  const participantsOut: Participant[] = participantRows.map((r) => ({
    userId: r.userId,
    tz: r.tz,
    displayName: r.displayName,
    respondedAt: r.respondedAt,
  }));
  const availabilityOut: AvailabilityRow[] = availabilityRows;
  return {
    poll,
    slots: slotRows.map((r) => r.slotStart),
    participants: participantsOut,
    availability: availabilityOut,
  };
}

export async function setMessageTs(
  db: Db,
  pollId: string,
  messageTs: string,
): Promise<void> {
  await db
    .update(polls)
    .set({ messageTs, updatedAt: sql`now()` })
    .where(eq(polls.id, pollId));
}

export async function setStatus(
  db: Db,
  pollId: string,
  status: PollStatus,
  finalSlotStart: Date | null = null,
): Promise<void> {
  await db
    .update(polls)
    .set({ status, finalSlotStart, updatedAt: sql`now()` })
    .where(eq(polls.id, pollId));
}

/** Cascades to slots, participants and availability. */
export async function deletePoll(db: Db, pollId: string): Promise<void> {
  await db.delete(polls).where(eq(polls.id, pollId));
}

export async function getUserAvailability(
  db: Db,
  pollId: string,
  userId: string,
): Promise<Date[]> {
  const rows = await db
    .select({ slotStart: availability.slotStart })
    .from(availability)
    .where(and(eq(availability.pollId, pollId), eq(availability.userId, userId)))
    .orderBy(asc(availability.slotStart));
  return rows.map((r) => r.slotStart);
}

const LIST_LIMIT = 20;

/** Polls a user organized, and polls they responded to but did not organize. Newest first. */
export async function listPollsForUser(
  db: Db,
  teamId: string,
  userId: string,
): Promise<{ organized: Poll[]; responded: Poll[] }> {
  const [organized, responded] = await Promise.all([
    db
      .select()
      .from(polls)
      .where(and(eq(polls.teamId, teamId), eq(polls.creatorId, userId)))
      .orderBy(desc(polls.createdAt))
      .limit(LIST_LIMIT),
    db
      .select({ poll: polls })
      .from(participants)
      .innerJoin(polls, eq(participants.pollId, polls.id))
      .where(
        and(
          eq(participants.userId, userId),
          eq(polls.teamId, teamId),
          ne(polls.creatorId, userId),
        ),
      )
      .orderBy(desc(polls.createdAt))
      .limit(LIST_LIMIT),
  ]);
  return {
    organized: organized.map(toPoll),
    responded: responded.map((r) => toPoll(r.poll)),
  };
}

export interface CachedUser {
  tz: string;
  displayName: string;
  fetchedAt: Date;
}

export async function getCachedUser(
  db: Db,
  teamId: string,
  userId: string,
): Promise<CachedUser | null> {
  const [row] = await db
    .select({
      tz: slackUsers.tz,
      displayName: slackUsers.displayName,
      fetchedAt: slackUsers.fetchedAt,
    })
    .from(slackUsers)
    .where(and(eq(slackUsers.teamId, teamId), eq(slackUsers.userId, userId)))
    .limit(1);
  return row ?? null;
}

export async function upsertCachedUser(
  db: Db,
  input: { teamId: string; userId: string; tz: string; displayName: string },
): Promise<void> {
  await db
    .insert(slackUsers)
    .values({ ...input, fetchedAt: sql`now()` })
    .onConflictDoUpdate({
      target: [slackUsers.teamId, slackUsers.userId],
      set: { tz: input.tz, displayName: input.displayName, fetchedAt: sql`now()` },
    });
}
