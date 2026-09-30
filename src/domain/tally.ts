import { POLL_LIMITS } from "./constants";
import type { SlotMinutes } from "./constants";
import type { AvailabilityRow, Participant, SlotTally, TimeRange } from "./types";

/** One entry per slot, in slot order. Rows for unknown slots are ignored. */
export function tally(slots: Date[], availability: AvailabilityRow[]): SlotTally[] {
  const byInstant = new Map<number, Set<string>>(
    slots.map((s) => [s.getTime(), new Set<string>()]),
  );
  for (const row of availability) {
    byInstant.get(row.slotStart.getTime())?.add(row.userId);
  }
  return slots.map((slot) => {
    const userIds = [...(byInstant.get(slot.getTime()) ?? [])].sort();
    return { slot, count: userIds.length, userIds };
  });
}

/** Highest count first, earliest slot on ties. Slots nobody picked are excluded. */
export function bestTimes(
  tallies: SlotTally[],
  n: number = POLL_LIMITS.BEST_TIMES,
): SlotTally[] {
  return tallies
    .filter((t) => t.count > 0)
    .sort((a, b) => b.count - a.count || a.slot.getTime() - b.slot.getTime())
    .slice(0, n);
}

/**
 * Contiguous runs of slots where everyone is free, merged into ranges. `end` is exclusive.
 * Two slots are contiguous only when exactly `slotMinutes` apart.
 */
export function fullOverlapRanges(
  tallies: SlotTally[],
  total: number,
  slotMinutes: SlotMinutes,
): TimeRange[] {
  if (total <= 0) return [];
  const step = slotMinutes * 60_000;
  const ranges: TimeRange[] = [];
  let current: TimeRange | undefined;
  for (const t of tallies) {
    if (t.count !== total) {
      current = undefined;
      continue;
    }
    const start = t.slot.getTime();
    if (current && current.end.getTime() === start) {
      current.end = new Date(start + step);
    } else {
      current = { start: t.slot, end: new Date(start + step) };
      ranges.push(current);
    }
  }
  return ranges;
}

/** Participants who answered, including those who said none of the slots work. */
export function respondedCount(participants: Participant[]): number {
  return participants.length;
}
