import { describe, expect, it } from "vitest";

import { INPUT, parseCreatePollSubmission } from "./schema";

function values(overrides: Record<string, unknown> = {}) {
  return {
    [INPUT.TITLE.block]: { [INPUT.TITLE.action]: { value: "Sprint planning" } },
    [INPUT.DATES.block]: {
      [INPUT.DATES.action]: {
        selected_options: [{ value: "2026-10-07" }, { value: "2026-10-08" }],
      },
    },
    [INPUT.FROM.block]: { [INPUT.FROM.action]: { selected_option: { value: "540" } } },
    [INPUT.TO.block]: { [INPUT.TO.action]: { selected_option: { value: "1020" } } },
    [INPUT.SLOT.block]: { [INPUT.SLOT.action]: { selected_option: { value: "30" } } },
    [INPUT.CHANNEL.block]: { [INPUT.CHANNEL.action]: { selected_conversation: "C123" } },
    ...overrides,
  };
}

describe("parseCreatePollSubmission", () => {
  it("parses a valid submission", () => {
    const r = parseCreatePollSubmission(values());
    expect(r).toEqual({
      ok: true,
      value: {
        title: "Sprint planning",
        dates: ["2026-10-07", "2026-10-08"],
        fromMinutes: 540,
        toMinutes: 1020,
        slotMinutes: 30,
        channelId: "C123",
      },
    });
  });

  it("rejects To <= From on the To block", () => {
    const r = parseCreatePollSubmission(
      values({
        [INPUT.TO.block]: { [INPUT.TO.action]: { selected_option: { value: "540" } } },
      }),
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.errors)).toEqual([INPUT.TO.block]);
  });

  it("rejects more than 24 slots per day", () => {
    const r = parseCreatePollSubmission(
      values({
        [INPUT.FROM.block]: {
          [INPUT.FROM.action]: { selected_option: { value: "360" } },
        },
        [INPUT.TO.block]: { [INPUT.TO.action]: { selected_option: { value: "1380" } } },
        [INPUT.SLOT.block]: { [INPUT.SLOT.action]: { selected_option: { value: "15" } } },
      }),
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors[INPUT.TO.block]).toMatch(/68 slots per day/);
  });

  it("rejects more than 14 dates and de-duplicates", () => {
    const many = Array.from({ length: 15 }, (_, i) => ({
      value: `2026-10-${String(i + 1).padStart(2, "0")}`,
    }));
    const r = parseCreatePollSubmission(
      values({
        [INPUT.DATES.block]: { [INPUT.DATES.action]: { selected_options: many } },
      }),
    );
    expect(r.ok).toBe(false);
    const dup = parseCreatePollSubmission(
      values({
        [INPUT.DATES.block]: {
          [INPUT.DATES.action]: {
            selected_options: [{ value: "2026-10-07" }, { value: "2026-10-07" }],
          },
        },
      }),
    );
    expect(dup.ok && dup.value.dates).toEqual(["2026-10-07"]);
  });

  it("requires title, dates and channel", () => {
    const r = parseCreatePollSubmission(
      values({
        [INPUT.TITLE.block]: { [INPUT.TITLE.action]: { value: "   " } },
        [INPUT.DATES.block]: { [INPUT.DATES.action]: { selected_options: [] } },
        [INPUT.CHANNEL.block]: {
          [INPUT.CHANNEL.action]: { selected_conversation: null },
        },
      }),
    );
    expect(r.ok).toBe(false);
    if (!r.ok)
      expect(Object.keys(r.errors).sort()).toEqual(
        [INPUT.CHANNEL.block, INPUT.DATES.block, INPUT.TITLE.block].sort(),
      );
  });

  it("rejects an unknown slot length", () => {
    const r = parseCreatePollSubmission(
      values({
        [INPUT.SLOT.block]: { [INPUT.SLOT.action]: { selected_option: { value: "45" } } },
      }),
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors[INPUT.SLOT.block]).toBeDefined();
  });

  it("fails safe on a malformed state", () => {
    expect(parseCreatePollSubmission({ nope: 1 }).ok).toBe(false);
  });
});
