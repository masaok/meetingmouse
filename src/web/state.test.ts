import { describe, expect, it } from "vitest";

import { fixture } from "@/slack/fixtures";

import { gridState } from "./state";

const snapshot = fixture("three-day");
const [first] = snapshot.slots;
const [a, b, c] = snapshot.participants;
const key = String(first.getTime() / 1000);
const free = (userId: string, slotStart: Date) => ({ userId, slotStart });
const poll = {
  ...snapshot,
  participants: [a, b, c],
  availability: [free(a.userId, first), free(b.userId, first)],
};

describe("gridState", () => {
  it("labels the grid in the viewer's zone", () => {
    const state = gridState(poll, {
      userId: "U9",
      displayName: "nine",
      tz: "America/Los_Angeles",
    });
    expect(state.days).toEqual([
      { label: "Oct 6", weekday: "Tue" },
      { label: "Oct 7", weekday: "Wed" },
      { label: "Oct 8", weekday: "Thu" },
    ]);
    expect(state.rows[0]).toEqual({ label: "9:00 AM", onHour: true });
    expect(state.rows[1]).toEqual({ label: "9:30 AM", onHour: false });
    expect(state.endLabel).toBe("5:00 PM");
    expect(state.cells[0][0]).toBe(first.getTime() / 1000);
  });

  it("keeps the viewer's slots apart from everyone else's", () => {
    const state = gridState(poll, { userId: a.userId, displayName: "me", tz: "UTC" });
    expect(state.me).toEqual({ name: "me", responded: true, slots: [Number(key)] });
    expect(state.others[key]).toEqual([b.displayName]);
    expect(state.othersTotal).toBe(2);
  });

  it("counts every other respondent for a viewer who has not responded", () => {
    const state = gridState(poll, { userId: "U9", displayName: "nine", tz: "UTC" });
    expect(state.me).toEqual({ name: "nine", responded: false, slots: [] });
    expect(state.others[key]).toEqual([a.displayName, b.displayName]);
    expect(state.othersTotal).toBe(3);
  });
});
