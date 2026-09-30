import { describe, expect, it } from "vitest";

import {
  dayBlockId,
  parsePrivateMetadata,
  parseRespondSubmission,
  RESPOND,
} from "./schema";

describe("parseRespondSubmission", () => {
  it("collects selected slots across day blocks and chunks, sorted and de-duplicated", () => {
    const r = parseRespondSubmission({
      [dayBlockId("2026-10-06", 0)]: {
        [RESPOND.SLOTS_ACTION]: {
          selected_options: [{ value: "1791304200" }, { value: "1791302400" }],
        },
      },
      [dayBlockId("2026-10-06", 1)]: {
        [RESPOND.SLOTS_ACTION]: { selected_options: [{ value: "1791302400" }] },
      },
      [dayBlockId("2026-10-07", 0)]: {
        [RESPOND.SLOTS_ACTION]: { selected_options: null },
      },
      [RESPOND.NONE_BLOCK]: { [RESPOND.NONE_ACTION]: { selected_options: [] } },
      unrelated_block: { x: { value: "ignored" } },
    });
    expect(r.none).toBe(false);
    expect(r.slots.map((d) => d.toISOString())).toEqual([
      "2026-10-06T16:00:00.000Z",
      "2026-10-06T16:30:00.000Z",
    ]);
  });

  it("'none of these' wins over any ticked slots", () => {
    const r = parseRespondSubmission({
      [dayBlockId("2026-10-06", 0)]: {
        [RESPOND.SLOTS_ACTION]: { selected_options: [{ value: "1791302400" }] },
      },
      [RESPOND.NONE_BLOCK]: {
        [RESPOND.NONE_ACTION]: { selected_options: [{ value: RESPOND.NONE_VALUE }] },
      },
    });
    expect(r).toEqual({ slots: [], none: true });
  });

  it("ignores garbage values and malformed state", () => {
    expect(
      parseRespondSubmission({
        [dayBlockId("d", 0)]: {
          [RESPOND.SLOTS_ACTION]: {
            selected_options: [{ value: "abc" }, { value: "-5" }],
          },
        },
      }),
    ).toEqual({ slots: [], none: false });
    expect(parseRespondSubmission("nope")).toEqual({ slots: [], none: false });
  });

  it("parses private metadata defensively", () => {
    expect(
      parsePrivateMetadata('{"pollId":"00000000-0000-4000-8000-000000000001"}'),
    ).toEqual({ pollId: "00000000-0000-4000-8000-000000000001" });
    expect(parsePrivateMetadata('{"pollId":"not-a-uuid"}')).toBeNull();
    expect(parsePrivateMetadata(undefined)).toBeNull();
    expect(parsePrivateMetadata("{")).toBeNull();
  });
});
