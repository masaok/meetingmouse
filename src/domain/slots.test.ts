import { describe, expect, it } from "vitest";

import { POLL_LIMITS } from "./constants";
import {
  formatInTz,
  generateSlots,
  groupByLocalDate,
  isValidTz,
  slotEnd,
  slotsPerDay,
  upcomingDates,
} from "./slots";

const LA = "America/Los_Angeles";
const TOKYO = "Asia/Tokyo";

const unique = (dates: Date[]) => new Set(dates.map((d) => d.getTime())).size;

describe("generateSlots", () => {
  it("builds a plain day of 30-minute slots in local time", () => {
    const slots = generateSlots({
      dates: ["2026-09-30"],
      fromMinutes: 9 * 60,
      toMinutes: 11 * 60,
      slotMinutes: 30,
      tz: LA,
    });
    expect(slots.map((d) => d.toISOString())).toEqual([
      "2026-09-30T16:00:00.000Z",
      "2026-09-30T16:30:00.000Z",
      "2026-09-30T17:00:00.000Z",
      "2026-09-30T17:30:00.000Z",
    ]);
  });

  it("US fall-back (2026-11-01) yields no duplicate instants", () => {
    const slots = generateSlots({
      dates: ["2026-11-01"],
      fromMinutes: 0,
      toMinutes: 4 * 60,
      slotMinutes: 30,
      tz: LA,
    });
    // Wall clock 00:00–03:30 is 8 labels; 01:00 and 01:30 occur twice but map to one instant each.
    expect(slots).toHaveLength(8);
    expect(unique(slots)).toBe(8);
    const times = slots.map((d) => d.getTime());
    expect(times).toEqual([...times].sort((a, b) => a - b));
  });

  it("US spring-forward (2026-03-08) skips the nonexistent 02:00 hour", () => {
    const slots = generateSlots({
      dates: ["2026-03-08"],
      fromMinutes: 1 * 60,
      toMinutes: 4 * 60,
      slotMinutes: 30,
      tz: LA,
    });
    const labels = slots.map((d) => formatInTz(d, LA, "HH:mm"));
    expect(labels).toEqual(["01:00", "01:30", "03:00", "03:30"]);
  });

  it("generates the 14-day × 24-slot maximum", () => {
    const dates = upcomingDates(
      new Date("2026-10-05T12:00:00Z"),
      LA,
      POLL_LIMITS.MAX_DAYS,
    );
    const slots = generateSlots({
      dates,
      fromMinutes: 6 * 60,
      toMinutes: 18 * 60,
      slotMinutes: 30,
      tz: LA,
    });
    expect(slots).toHaveLength(POLL_LIMITS.MAX_DAYS * POLL_LIMITS.MAX_SLOTS_PER_DAY);
    expect(unique(slots)).toBe(336);
  });

  it("yields nothing when the window is empty or inverted", () => {
    const base = { dates: ["2026-09-30"], slotMinutes: 30 as const, tz: LA };
    expect(generateSlots({ ...base, fromMinutes: 600, toMinutes: 600 })).toEqual([]);
    expect(generateSlots({ ...base, fromMinutes: 600, toMinutes: 540 })).toEqual([]);
  });

  it("drops a trailing partial slot that would overrun the window", () => {
    const slots = generateSlots({
      dates: ["2026-09-30"],
      fromMinutes: 9 * 60,
      toMinutes: 9 * 60 + 45,
      slotMinutes: 30,
      tz: LA,
    });
    expect(slots).toHaveLength(1);
  });
});

describe("groupByLocalDate", () => {
  it("puts an LA evening slot on the next local date in Tokyo", () => {
    const [slot] = generateSlots({
      dates: ["2026-09-30"],
      fromMinutes: 18 * 60,
      toMinutes: 18 * 60 + 30,
      slotMinutes: 30,
      tz: LA,
    });
    expect([...groupByLocalDate([slot], LA).keys()]).toEqual(["2026-09-30"]);
    expect([...groupByLocalDate([slot], TOKYO).keys()]).toEqual(["2026-10-01"]);
  });

  it("orders keys and values ascending regardless of input order", () => {
    const a = new Date("2026-10-01T16:00:00Z");
    const b = new Date("2026-10-02T16:00:00Z");
    const c = new Date("2026-10-01T17:00:00Z");
    const groups = groupByLocalDate([b, c, a], LA);
    expect([...groups.keys()]).toEqual(["2026-10-01", "2026-10-02"]);
    expect(groups.get("2026-10-01")).toEqual([a, c]);
  });
});

describe("upcomingDates", () => {
  it("crosses a month boundary", () => {
    expect(upcomingDates(new Date("2026-09-29T12:00:00Z"), LA, 4)).toEqual([
      "2026-09-29",
      "2026-09-30",
      "2026-10-01",
      "2026-10-02",
    ]);
  });

  it("starts from today in the given zone, not UTC", () => {
    // 2026-09-30T03:00Z is still Sep 29 in Los Angeles but already Sep 30 in Tokyo.
    const now = new Date("2026-09-30T03:00:00Z");
    expect(upcomingDates(now, LA, 1)).toEqual(["2026-09-29"]);
    expect(upcomingDates(now, TOKYO, 1)).toEqual(["2026-09-30"]);
  });

  it("spans the fall-back day without skipping or repeating a date", () => {
    expect(upcomingDates(new Date("2026-10-31T12:00:00Z"), LA, 3)).toEqual([
      "2026-10-31",
      "2026-11-01",
      "2026-11-02",
    ]);
  });
});

describe("helpers", () => {
  it("slotsPerDay floors and never goes negative", () => {
    expect(slotsPerDay(9 * 60, 17 * 60, 30)).toBe(16);
    expect(slotsPerDay(9 * 60, 9 * 60 + 45, 30)).toBe(1);
    expect(slotsPerDay(17 * 60, 9 * 60, 30)).toBe(0);
  });

  it("slotEnd adds the slot length", () => {
    expect(slotEnd(new Date("2026-09-30T16:00:00Z"), 60).toISOString()).toBe(
      "2026-09-30T17:00:00.000Z",
    );
  });

  it("isValidTz accepts IANA names and rejects garbage", () => {
    expect(isValidTz(LA)).toBe(true);
    expect(isValidTz("Mars/Olympus_Mons")).toBe(false);
  });
});
