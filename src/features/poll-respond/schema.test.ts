import { describe, expect, it } from "vitest";

import {
  dayBlockId,
  parsePrivateMetadata,
  parseSlotValue,
  SLOT_ACTION,
  slotActionId,
} from "./schema";

describe("respond form ids", () => {
  it("names a day's block and a slot's button", () => {
    expect(dayBlockId("2026-10-06", 1)).toBe("day_2026-10-06_1");
    expect(slotActionId(1791302400)).toBe("toggle_slot:1791302400");
  });

  it("matches every slot button and nothing else", () => {
    expect(SLOT_ACTION.test(slotActionId(1791302400))).toBe(true);
    expect(SLOT_ACTION.test("toggle_slot:")).toBe(false);
    expect(SLOT_ACTION.test("toggle_none")).toBe(false);
    expect(SLOT_ACTION.test("x_toggle_slot:1")).toBe(false);
  });

  it("reads the slot from a button's value, and refuses anything but epoch seconds", () => {
    expect(parseSlotValue("1791302400")).toEqual(new Date("2026-10-06T16:00:00Z"));
    for (const bad of [undefined, "", "abc", "12.5", "-3", "0"])
      expect(parseSlotValue(bad)).toBeNull();
  });

  it("parses private metadata defensively", () => {
    const pollId = "00000000-0000-4000-8000-000000000001";
    expect(parsePrivateMetadata(JSON.stringify({ pollId }))).toEqual({ pollId });
    expect(parsePrivateMetadata(JSON.stringify({ pollId: "nope" }))).toBeNull();
    expect(parsePrivateMetadata("not json")).toBeNull();
    expect(parsePrivateMetadata(undefined)).toBeNull();
  });
});
