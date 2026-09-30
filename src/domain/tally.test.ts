import { describe, expect, it } from "vitest";

import { bestTimes, fullOverlapRanges, respondedCount, tally } from "./tally";
import type { AvailabilityRow, Participant, SlotTally } from "./types";

const at = (iso: string) => new Date(iso);
const slots = [
  at("2026-10-01T16:00:00Z"),
  at("2026-10-01T16:30:00Z"),
  at("2026-10-01T17:00:00Z"),
  at("2026-10-01T18:00:00Z"), // gap: 17:30 is not a slot
];
const row = (userId: string, iso: string): AvailabilityRow => ({
  userId,
  slotStart: at(iso),
});

describe("tally", () => {
  it("counts per slot in slot order with sorted user ids", () => {
    const result = tally(slots, [
      row("U2", "2026-10-01T16:00:00Z"),
      row("U1", "2026-10-01T16:00:00Z"),
      row("U1", "2026-10-01T17:00:00Z"),
    ]);
    expect(result.map((t) => t.count)).toEqual([2, 0, 1, 0]);
    expect(result[0].userIds).toEqual(["U1", "U2"]);
    expect(result.map((t) => t.slot)).toEqual(slots);
  });

  it("ignores rows for slots that are not in the poll", () => {
    const result = tally(slots, [row("U1", "2026-10-01T17:30:00Z")]);
    expect(result.every((t) => t.count === 0)).toBe(true);
  });

  it("is unaffected by a participant with zero rows", () => {
    const participants: Participant[] = [
      {
        userId: "U9",
        tz: "UTC",
        displayName: "Nine",
        respondedAt: at("2026-10-01T00:00:00Z"),
      },
    ];
    expect(respondedCount(participants)).toBe(1);
    expect(tally(slots, []).map((t) => t.count)).toEqual([0, 0, 0, 0]);
  });
});

describe("bestTimes", () => {
  const t = (iso: string, count: number): SlotTally => ({
    slot: at(iso),
    count,
    userIds: Array.from({ length: count }, (_, i) => `U${i}`),
  });

  it("sorts by count desc then earliest, excludes zero, and caps at n", () => {
    const tallies = [
      t("2026-10-01T18:00:00Z", 2),
      t("2026-10-01T16:00:00Z", 2),
      t("2026-10-01T17:00:00Z", 3),
      t("2026-10-01T19:00:00Z", 0),
      t("2026-10-01T20:00:00Z", 1),
    ];
    expect(bestTimes(tallies).map((x) => x.slot.toISOString())).toEqual([
      "2026-10-01T17:00:00.000Z",
      "2026-10-01T16:00:00.000Z",
      "2026-10-01T18:00:00.000Z",
    ]);
    expect(bestTimes(tallies, 5)).toHaveLength(4);
  });

  it("does not mutate its input", () => {
    const tallies = [t("2026-10-01T18:00:00Z", 1), t("2026-10-01T16:00:00Z", 2)];
    bestTimes(tallies);
    expect(tallies[0].slot.toISOString()).toBe("2026-10-01T18:00:00.000Z");
  });
});

describe("fullOverlapRanges", () => {
  const full = (iso: string): SlotTally => ({
    slot: at(iso),
    count: 2,
    userIds: ["U1", "U2"],
  });
  const partial = (iso: string): SlotTally => ({
    slot: at(iso),
    count: 1,
    userIds: ["U1"],
  });

  it("merges contiguous full slots and breaks on a gap or a partial slot", () => {
    const tallies = [
      full("2026-10-01T16:00:00Z"),
      full("2026-10-01T16:30:00Z"),
      partial("2026-10-01T17:00:00Z"),
      full("2026-10-01T17:30:00Z"),
      full("2026-10-01T18:30:00Z"), // 18:00 missing: not contiguous
    ];
    expect(
      fullOverlapRanges(tallies, 2, 30).map((r) => [
        r.start.toISOString(),
        r.end.toISOString(),
      ]),
    ).toEqual([
      ["2026-10-01T16:00:00.000Z", "2026-10-01T17:00:00.000Z"],
      ["2026-10-01T17:30:00.000Z", "2026-10-01T18:00:00.000Z"],
      ["2026-10-01T18:30:00.000Z", "2026-10-01T19:00:00.000Z"],
    ]);
  });

  it("respects the slot length when deciding contiguity", () => {
    const tallies = [full("2026-10-01T16:00:00Z"), full("2026-10-01T17:00:00Z")];
    expect(fullOverlapRanges(tallies, 2, 60)).toHaveLength(1);
    expect(fullOverlapRanges(tallies, 2, 30)).toHaveLength(2);
  });

  it("returns nothing when there are no participants", () => {
    expect(fullOverlapRanges([full("2026-10-01T16:00:00Z")], 0, 30)).toEqual([]);
  });
});
