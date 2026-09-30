import { POLL_LIMITS } from "@/domain/constants";
import { generateSlots, upcomingDates } from "@/domain/slots";
import type { AvailabilityRow, Participant, Poll, PollSnapshot } from "@/domain/types";

/**
 * Deterministic poll snapshots for tests and `pnpm render:fixture`. Pure data; no clock, no DB.
 * All fixtures are anchored to 2026-10-06 (a Tuesday) so date labels are stable.
 */
export const FIXTURE_NOW = new Date("2026-10-06T16:00:00Z");
export const FIXTURE_TZ = "America/Los_Angeles";
export const FIXTURE_NAMES = [
  "empty",
  "three-day",
  "worst-case",
  "closed",
  "scheduled",
  "many-participants",
] as const;
export type FixtureName = (typeof FIXTURE_NAMES)[number];

function basePoll(overrides: Partial<Poll> = {}): Poll {
  return {
    id: "00000000-0000-4000-8000-000000000001",
    teamId: "T0000TEST",
    channelId: "C0000TEST",
    messageTs: "1700000000.000100",
    creatorId: "U0000ORG",
    title: "Sprint planning",
    creatorTz: FIXTURE_TZ,
    slotMinutes: 30,
    status: "open",
    finalSlotStart: null,
    createdAt: FIXTURE_NOW,
    updatedAt: FIXTURE_NOW,
    ...overrides,
  };
}

function participant(i: number, tz = FIXTURE_TZ): Participant {
  return {
    userId: `U${String(i).padStart(4, "0")}`,
    tz,
    displayName: `user${i}`,
    respondedAt: FIXTURE_NOW,
  };
}

/** Deterministic pseudo-random availability: user i is free for slot j when (i*7 + j*13) % m < k. */
function availabilityFor(
  slots: Date[],
  users: Participant[],
  m: number,
  k: number,
): AvailabilityRow[] {
  const rows: AvailabilityRow[] = [];
  users.forEach((u, i) => {
    slots.forEach((s, j) => {
      if ((i * 7 + j * 13) % m < k) rows.push({ userId: u.userId, slotStart: s });
    });
  });
  return rows;
}

export function fixture(name: FixtureName): PollSnapshot {
  const days = (n: number) => upcomingDates(FIXTURE_NOW, FIXTURE_TZ, n);
  switch (name) {
    case "empty": {
      const slots = generateSlots({
        dates: days(3),
        fromMinutes: 540,
        toMinutes: 1020,
        slotMinutes: 30,
        tz: FIXTURE_TZ,
      });
      return { poll: basePoll(), slots, participants: [], availability: [] };
    }
    case "three-day": {
      const slots = generateSlots({
        dates: days(3),
        fromMinutes: 540,
        toMinutes: 1020,
        slotMinutes: 30,
        tz: FIXTURE_TZ,
      });
      const participants = [
        participant(1),
        participant(2, "Asia/Tokyo"),
        participant(3),
        participant(4),
      ];
      // user 4 responded "none of these work"
      const availability = availabilityFor(slots, participants.slice(0, 3), 5, 3);
      return { poll: basePoll(), slots, participants, availability };
    }
    case "worst-case": {
      const slots = generateSlots({
        dates: days(POLL_LIMITS.MAX_DAYS),
        fromMinutes: 6 * 60,
        toMinutes: 6 * 60 + POLL_LIMITS.MAX_SLOTS_PER_DAY * 30,
        slotMinutes: 30,
        tz: FIXTURE_TZ,
      });
      const participants = Array.from({ length: 12 }, (_, i) => participant(i + 1));
      const availability = availabilityFor(slots, participants, 3, 2);
      return {
        poll: basePoll({
          title: "Q4 planning offsite (all hands, every region, all week)",
        }),
        slots,
        participants,
        availability,
      };
    }
    case "many-participants": {
      const slots = generateSlots({
        dates: days(2),
        fromMinutes: 540,
        toMinutes: 720,
        slotMinutes: 30,
        tz: FIXTURE_TZ,
      });
      const participants = Array.from({ length: 25 }, (_, i) => participant(i + 1));
      const availability = availabilityFor(slots, participants, 4, 3);
      return { poll: basePoll(), slots, participants, availability };
    }
    case "closed": {
      const s = fixture("three-day");
      return { ...s, poll: basePoll({ status: "closed" }) };
    }
    case "scheduled": {
      const s = fixture("three-day");
      return {
        ...s,
        poll: basePoll({ status: "scheduled", finalSlotStart: s.slots[2] }),
      };
    }
  }
}
