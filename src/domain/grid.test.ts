import { describe, expect, it } from "vitest";

import { gridModel } from "./grid";
import { generateSlots } from "./slots";

const iso = (d: Date | null) => d?.toISOString() ?? null;

describe("gridModel", () => {
  it("puts days in columns and times of day in rows", () => {
    const slots = generateSlots({
      dates: ["2026-10-13", "2026-10-14"],
      fromMinutes: 540,
      toMinutes: 630,
      slotMinutes: 30,
      tz: "America/Los_Angeles",
    });
    const model = gridModel(slots, "America/Los_Angeles");

    expect(model.days.map((d) => d.date)).toEqual(["2026-10-13", "2026-10-14"]);
    expect(model.rows.map((r) => r.time)).toEqual(["09:00", "09:30", "10:00"]);
    expect(model.cells.map((row) => row.map(iso))).toEqual([
      ["2026-10-13T16:00:00.000Z", "2026-10-14T16:00:00.000Z"],
      ["2026-10-13T16:30:00.000Z", "2026-10-14T16:30:00.000Z"],
      ["2026-10-13T17:00:00.000Z", "2026-10-14T17:00:00.000Z"],
    ]);
  });

  it("regroups the same slots by the viewer's days and times", () => {
    const slots = generateSlots({
      dates: ["2026-10-13"],
      fromMinutes: 16 * 60,
      toMinutes: 17 * 60,
      slotMinutes: 30,
      tz: "America/Los_Angeles",
    });
    const model = gridModel(slots, "Asia/Tokyo");

    expect(model.days.map((d) => d.date)).toEqual(["2026-10-14"]);
    expect(model.rows.map((r) => r.time)).toEqual(["08:00", "08:30"]);
  });

  it("leaves a hole where a day has no slot at a time", () => {
    const [a, b, c] = generateSlots({
      dates: ["2026-10-13", "2026-10-14"],
      fromMinutes: 540,
      toMinutes: 600,
      slotMinutes: 30,
      tz: "UTC",
    });
    const model = gridModel([a, b, c], "UTC");

    expect(model.cells.map((row) => row.map(iso))).toEqual([
      ["2026-10-13T09:00:00.000Z", "2026-10-14T09:00:00.000Z"],
      ["2026-10-13T09:30:00.000Z", null],
    ]);
  });
});
