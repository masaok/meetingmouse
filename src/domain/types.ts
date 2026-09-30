import type { PollStatus, SlotMinutes } from "./constants";

export interface Poll {
  id: string;
  teamId: string;
  channelId: string;
  /** Set after chat.postMessage succeeds. */
  messageTs: string | null;
  creatorId: string;
  title: string;
  /** IANA zone the organizer created the poll in. */
  creatorTz: string;
  slotMinutes: SlotMinutes;
  status: PollStatus;
  finalSlotStart: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Participant {
  userId: string;
  tz: string;
  displayName: string;
  respondedAt: Date;
}

/** One checked slot for one user. A participant with zero rows means "none of these work". */
export interface AvailabilityRow {
  userId: string;
  slotStart: Date;
}

/** Everything needed to render a poll, in one object. Produced by db/queries, consumed by renderers. */
export interface PollSnapshot {
  poll: Poll;
  /** Every slot instant in the poll, ascending UTC. */
  slots: Date[];
  participants: Participant[];
  availability: AvailabilityRow[];
}

export interface SlotTally {
  slot: Date;
  count: number;
  userIds: string[];
}

export interface TimeRange {
  start: Date;
  /** Exclusive end (start of the slot after the last one in the range). */
  end: Date;
}

/** Inputs to slot generation, straight from the create modal. */
export interface SlotSpec {
  /** Local calendar dates as yyyy-mm-dd, in `tz`. */
  dates: string[];
  /** Minutes from local midnight, inclusive start of the daily window. */
  fromMinutes: number;
  /** Minutes from local midnight, exclusive end of the daily window. */
  toMinutes: number;
  slotMinutes: SlotMinutes;
  tz: string;
}
