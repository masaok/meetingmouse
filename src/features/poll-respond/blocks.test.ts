import type { ActionsBlock, Button, SectionBlock } from "@slack/types";
import { describe, expect, it } from "vitest";

import { POLL_LIMITS } from "@/domain/constants";
import { generateSlots, upcomingDates } from "@/domain/slots";
import { fixture, FIXTURE_NOW, FIXTURE_TZ } from "@/slack/fixtures";
import { epochSeconds } from "@/slack/format";
import { ACTION_TOGGLE_NONE, CALLBACK_RESPOND_MODAL } from "@/slack/ids";
import { SLACK_LIMITS } from "@/slack/limits";

import { loadingView, respondModal, unavailableView } from "./blocks";
import { dayBlockId, SLOT_ACTION, slotActionId } from "./schema";

type View = ReturnType<typeof respondModal>;

/** The rows of time buttons: every actions block except the one holding "none of these". */
const dayRows = (view: View) =>
  view.blocks
    .filter((b): b is ActionsBlock => b.type === "actions")
    .filter((b) => b.block_id?.startsWith("day_"))
    .map((b) => ({ block_id: b.block_id, buttons: b.elements as Button[] }));
const noneButton = (view: View) =>
  view.blocks
    .filter((b): b is ActionsBlock => b.type === "actions")
    .flatMap((b) => b.elements as Button[])
    .find((b) => b.action_id === ACTION_TOGGLE_NONE);
const dayHeadings = (view: View) =>
  view.blocks
    .filter((b): b is SectionBlock => b.type === "section")
    .map((b) => b.text?.text ?? "")
    .filter((text) => text.startsWith("*"));
const statusLine = (view: View) => JSON.stringify(view.blocks.at(-1));

const form = (overrides: Partial<Parameters<typeof respondModal>[0]> = {}) => {
  const s = fixture("three-day");
  return respondModal({
    poll: s.poll,
    slots: s.slots,
    tz: FIXTURE_TZ,
    selected: [],
    noneSelected: false,
    ...overrides,
  });
};

describe("respondModal", () => {
  it("matches the snapshot for a three-day poll viewed from Tokyo with a prior answer", () => {
    const s = fixture("three-day");
    const view = form({ tz: "Asia/Tokyo", selected: [s.slots[0], s.slots[3]] });
    expect(view).toMatchSnapshot();
    expect(view.callback_id).toBe(CALLBACK_RESPOND_MODAL);
    expect(JSON.parse(view.private_metadata ?? "{}")).toEqual({ pollId: s.poll.id });
  });

  it("is a row of buttons per day, one per slot, with no Save", () => {
    const s = fixture("three-day");
    const view = form();
    const rows = dayRows(view);

    expect(dayHeadings(view)).toEqual(["*Tue 10/6*", "*Wed 10/7*", "*Thu 10/8*"]);
    expect(rows.map((r) => r.buttons.length)).toEqual([16, 16, 16]);
    expect(rows[0].buttons.slice(0, 3).map((b) => b.text.text)).toEqual([
      "9am",
      "9:30am",
      "10am",
    ]);
    expect(rows[0].buttons[0]).toMatchObject({
      action_id: slotActionId(epochSeconds(s.slots[0])),
      value: String(epochSeconds(s.slots[0])),
    });
    expect(view.submit).toBeUndefined();
    expect(view.close?.text).toBe("Done");
    expect(view.blocks.filter((b) => b.type === "input")).toEqual([]);
  });

  it("keeps one day's times together so the modal can wrap them evenly", () => {
    const slots = generateSlots({
      dates: ["2026-10-09"],
      fromMinutes: 18 * 60,
      toMinutes: 22 * 60,
      slotMinutes: 60,
      tz: FIXTURE_TZ,
    });
    const view = form({ poll: fixture("empty").poll, slots });
    expect(dayRows(view).map((r) => r.buttons.map((b) => b.text.text))).toEqual([
      ["6pm", "7pm", "8pm", "9pm"],
    ]);
  });

  it("marks the chosen times green with a tick and counts them", () => {
    const s = fixture("three-day");
    const view = form({ selected: [s.slots[1], s.slots[2]] });
    const firstFour = dayRows(view)[0].buttons.slice(0, 4);

    expect(firstFour.map((b) => [b.text.text, b.style])).toEqual([
      ["9am", undefined],
      ["✓ 9:30am", "primary"],
      ["✓ 10am", "primary"],
      ["10:30am", undefined],
    ]);
    expect(statusLine(view)).toContain("2 times chosen");
    expect(statusLine(form({ selected: [s.slots[1]] }))).toContain("1 time chosen");
  });

  it("says so when nothing is answered yet, and when the answer is none of these", () => {
    expect(statusLine(form())).toContain("You have not answered yet");
    expect(noneButton(form())).toMatchObject({
      text: { text: "I can't make any of these" },
    });
    expect(noneButton(form())?.style).toBeUndefined();

    const none = form({ noneSelected: true });
    expect(statusLine(none)).toContain("none of these times work");
    expect(noneButton(none)).toMatchObject({
      style: "danger",
      text: { text: "✓ I can't make any of these" },
    });
  });

  it("groups by the responder's local date, so one creator day can span two local days", () => {
    // 6:00–18:00 PDT = 13:00Z–01:00Z = 22:00–10:00 JST: 4 slots on the first JST date, 20 on the next.
    const slots = generateSlots({
      dates: upcomingDates(FIXTURE_NOW, FIXTURE_TZ, 1),
      fromMinutes: 6 * 60,
      toMinutes: 18 * 60,
      slotMinutes: 30,
      tz: FIXTURE_TZ,
    });
    const view = form({ poll: fixture("empty").poll, slots, tz: "Asia/Tokyo" });

    expect(dayHeadings(view)).toEqual(["*Tue 10/6*", "*Wed 10/7*"]);
    expect(dayRows(view).map((r) => [r.block_id, r.buttons.length])).toEqual([
      [dayBlockId("2026-10-06", 0), 4],
      [dayBlockId("2026-10-07", 0), 20],
    ]);
    expect(
      dayRows(view).find((r) => r.block_id === dayBlockId("2026-10-07", 0))?.buttons[0]
        .text.text,
    ).toBe("12am");
  });

  it("stays inside Slack limits for the 14-day × 24-slot worst case in another zone", () => {
    const s = fixture("worst-case");
    const view = form({
      poll: s.poll,
      slots: s.slots,
      tz: "Asia/Kolkata",
      selected: s.slots,
    });
    expect(view.blocks.length).toBeLessThanOrEqual(SLACK_LIMITS.BLOCKS_PER_MODAL);
    expect(view.title.text.length).toBeLessThanOrEqual(SLACK_LIMITS.MODAL_TITLE_CHARS);
    let buttons = 0;
    for (const row of dayRows(view)) {
      expect(row.buttons.length).toBeLessThanOrEqual(SLACK_LIMITS.ACTIONS_ELEMENTS);
      const ids = row.buttons.map((b) => b.action_id);
      expect(new Set(ids).size).toBe(ids.length);
      for (const b of row.buttons) {
        expect(SLOT_ACTION.test(b.action_id ?? "")).toBe(true);
        expect(b.text.text.length).toBeLessThanOrEqual(SLACK_LIMITS.OPTION_TEXT_CHARS);
      }
      buttons += row.buttons.length;
    }
    expect(buttons).toBe(POLL_LIMITS.MAX_DAYS * POLL_LIMITS.MAX_SLOTS_PER_DAY);
  });

  it("offers the web grid as a link above the form when the host serves it", () => {
    const withGrid = form({ gridUrl: "https://host.test/grid/abc" });
    const link = withGrid.blocks[1] as SectionBlock;
    expect(link.accessory?.type === "button" && link.accessory.url).toBe(
      "https://host.test/grid/abc",
    );
    expect(JSON.stringify(form().blocks)).not.toContain("Open the grid");
  });

  it("has small loading and unavailable views", () => {
    expect(loadingView().blocks.length).toBe(1);
    expect(JSON.stringify(unavailableView("scheduled"))).toContain("scheduled");
    expect(loadingView().submit).toBeUndefined();
  });
});
