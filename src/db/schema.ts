import { sql } from "drizzle-orm";
import {
  check,
  foreignKey,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { POLL_STATUSES, SLOT_MINUTES } from "@/domain/constants";

const ts = (name: string) => timestamp(name, { withTimezone: true, mode: "date" });

export const polls = pgTable(
  "polls",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    teamId: text("team_id").notNull(),
    channelId: text("channel_id").notNull(),
    messageTs: text("message_ts"),
    creatorId: text("creator_id").notNull(),
    title: text("title").notNull(),
    creatorTz: text("creator_tz").notNull(),
    slotMinutes: integer("slot_minutes").notNull(),
    status: text("status", { enum: POLL_STATUSES }).notNull().default("open"),
    finalSlotStart: ts("final_slot_start"),
    createdAt: ts("created_at").notNull().defaultNow(),
    updatedAt: ts("updated_at").notNull().defaultNow(),
  },
  (t) => [
    // Derived from the same constant the modal and the zod parser use.
    check(
      "polls_slot_minutes_check",
      sql`${t.slotMinutes} in (${sql.raw(SLOT_MINUTES.join(", "))})`,
    ),
    check(
      "polls_status_check",
      sql`${t.status} in (${sql.raw(POLL_STATUSES.map((s) => `'${s}'`).join(", "))})`,
    ),
    index("polls_creator_idx").on(t.teamId, t.creatorId),
    index("polls_message_idx").on(t.channelId, t.messageTs),
  ],
);

export const pollSlots = pgTable(
  "poll_slots",
  {
    pollId: uuid("poll_id")
      .notNull()
      .references(() => polls.id, { onDelete: "cascade" }),
    slotStart: ts("slot_start").notNull(),
  },
  (t) => [primaryKey({ columns: [t.pollId, t.slotStart] })],
);

export const participants = pgTable(
  "participants",
  {
    pollId: uuid("poll_id")
      .notNull()
      .references(() => polls.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull(),
    tz: text("tz").notNull(),
    displayName: text("display_name").notNull(),
    respondedAt: ts("responded_at").notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.pollId, t.userId] }),
    index("participants_user_idx").on(t.userId),
  ],
);

export const availability = pgTable(
  "availability",
  {
    pollId: uuid("poll_id").notNull(),
    userId: text("user_id").notNull(),
    slotStart: ts("slot_start").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.pollId, t.userId, t.slotStart] }),
    foreignKey({
      name: "availability_slot_fk",
      columns: [t.pollId, t.slotStart],
      foreignColumns: [pollSlots.pollId, pollSlots.slotStart],
    }).onDelete("cascade"),
    foreignKey({
      name: "availability_participant_fk",
      columns: [t.pollId, t.userId],
      foreignColumns: [participants.pollId, participants.userId],
    }).onDelete("cascade"),
    index("availability_slot_idx").on(t.pollId, t.slotStart),
  ],
);

/** Cache of users.info so modal opens don't call Slack every time. */
export const slackUsers = pgTable(
  "slack_users",
  {
    teamId: text("team_id").notNull(),
    userId: text("user_id").notNull(),
    tz: text("tz").notNull(),
    displayName: text("display_name").notNull(),
    fetchedAt: ts("fetched_at").notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.teamId, t.userId] })],
);
