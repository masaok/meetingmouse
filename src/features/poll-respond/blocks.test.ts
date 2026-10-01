import type { ActionsBlock, Checkboxes, HeaderBlock, SectionBlock } from "@slack/types";
import { describe, expect, it } from "vitest";

import { POLL_LIMITS } from "@/domain/constants";
import { generateSlots, upcomingDates } from "@/domain/slots";
import { fixture, FIXTURE_NOW, FIXTURE_TZ } from "@/slack/fixtures";
import { epochSeconds } from "@/slack/format";
import { CALLBACK_RESPOND_MODAL } from "@/slack/ids";
import { SLACK_LIMITS } from "@/slack/limits";

import { loadingView, respondModal, unavailableView } from "./blocks";
import { dayBlockId, RESPOND } from "./schema";

/** The form's checkbox groups: actions blocks holding one checkboxes element each. */
const checkboxGroups = (blocks: ReturnType<typeof respondModal>["blocks"]) =>
  blocks
    .filter((b): b is ActionsBlock => b.type === "actions")
    .map((b) => ({ block_id: b.block_id, element: b.elements[0] as Checkboxes }));

describe("respondModal", () => {
  it("matches the snapshot for a three-day poll viewed from Tokyo with a prior answer", () => {
    const s = fixture("three-day");
    const view = respondModal({
      poll: s.poll,
      slots: s.slots,
      tz: "Asia/Tokyo",
      selected: [s.slots[0], s.slots[3]],
      noneSelected: false,
    });
    expect(view).toMatchSnapshot();
    expect(view.callback_id).toBe(CALLBACK_RESPOND_MODAL);
    expect(JSON.parse(view.private_metadata ?? "{}")).toEqual({ pollId: s.poll.id });
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
    const view = respondModal({
      poll: fixture("empty").poll,
      slots,
      tz: "Asia/Tokyo",
      selected: [],
      noneSelected: false,
    });
    const headers = view.blocks
      .filter((b) => b.type === "header")
      .map((b) => (b as HeaderBlock).text.text);
    expect(headers).toEqual(["Tuesday, October 6", "Wednesday, October 7"]);
    const inputs = checkboxGroups(view.blocks).filter((b) =>
      b.block_id?.startsWith(RESPOND.DAY_PREFIX),
    );
    expect(inputs.map((b) => [b.block_id, b.element.options.length])).toEqual([
      [dayBlockId("2026-10-06", 0), 4],
      [dayBlockId("2026-10-07", 0), 10],
      [dayBlockId("2026-10-07", 1), 10],
    ]);
    expect(inputs[1].element.options[0].text.text).toBe("*12:00 AM*  ·  30 min");
  });

  it("has no input blocks, so no row carries a label or an (optional) tag", () => {
    const s = fixture("three-day");
    const view = respondModal({
      poll: s.poll,
      slots: s.slots,
      tz: FIXTURE_TZ,
      selected: [],
      noneSelected: false,
    });
    expect(view.blocks.filter((b) => b.type === "input")).toEqual([]);
    expect(JSON.stringify(view.blocks)).not.toContain("Times (continued)");
  });

  it("shows under each time how many of the people who answered are free", () => {
    const s = fixture("three-day");
    const [first, second] = s.slots;
    const view = respondModal({
      poll: s.poll,
      slots: s.slots,
      tz: FIXTURE_TZ,
      selected: [],
      noneSelected: false,
      counts: new Map([[epochSeconds(first), 3]]),
      responded: 4,
    });
    const [day] = checkboxGroups(view.blocks);
    expect(day.element.options[0].text.text).toBe("*9:00 AM*  ·  30 min");
    expect(day.element.options[0].description?.text).toBe("👥 3 of 4 free");
    expect(day.element.options[1].value).toBe(String(epochSeconds(second)));
    expect(day.element.options[1].description?.text).toBe("👥 0 of 4 free");
    expect(JSON.stringify(view.blocks[0])).toContain("4 people have answered");
  });

  it("leaves the counts off when nobody has answered yet", () => {
    const s = fixture("empty");
    const view = respondModal({
      poll: s.poll,
      slots: s.slots,
      tz: FIXTURE_TZ,
      selected: [],
      noneSelected: false,
    });
    const [day] = checkboxGroups(view.blocks);
    expect(day.element.options[0].description).toBeUndefined();
    expect(JSON.stringify(view.blocks[0])).toContain("Nobody has answered yet");
  });

  it("names the slot length the way a person would", () => {
    const s = fixture("empty");
    const text = (slotMinutes: 15 | 30 | 60) =>
      checkboxGroups(
        respondModal({
          poll: { ...s.poll, slotMinutes },
          slots: s.slots,
          tz: FIXTURE_TZ,
          selected: [],
          noneSelected: false,
        }).blocks,
      )[0].element.options[0].text.text;
    expect(text(15)).toBe("*9:00 AM*  ·  15 min");
    expect(text(60)).toBe("*9:00 AM*  ·  1 h");
  });

  it("offers the web grid as a link above the form when the host serves it", () => {
    const s = fixture("three-day");
    const input = {
      poll: s.poll,
      slots: s.slots,
      tz: FIXTURE_TZ,
      selected: [],
      noneSelected: false,
    };
    const withGrid = respondModal({ ...input, gridUrl: "https://host.test/grid/abc" });
    const link = withGrid.blocks[1] as SectionBlock;
    expect(link.accessory?.type === "button" && link.accessory.url).toBe(
      "https://host.test/grid/abc",
    );
    expect(withGrid.submit?.text).toBe("Save");
    expect(JSON.stringify(respondModal(input).blocks)).not.toContain("Open the grid");
  });

  it("stays inside Slack limits for the 14-day × 24-slot worst case in another zone", () => {
    const s = fixture("worst-case");
    const view = respondModal({
      poll: s.poll,
      slots: s.slots,
      tz: "Asia/Kolkata",
      selected: s.slots,
      noneSelected: false,
    });
    expect(view.blocks.length).toBeLessThanOrEqual(SLACK_LIMITS.BLOCKS_PER_MODAL);
    expect(view.title.text.length).toBeLessThanOrEqual(SLACK_LIMITS.MODAL_TITLE_CHARS);
    const inputs = checkboxGroups(view.blocks);
    let options = 0;
    for (const b of inputs) {
      expect(b.element.options.length).toBeLessThanOrEqual(SLACK_LIMITS.CHECKBOX_OPTIONS);
      for (const o of b.element.options) {
        expect(o.text.text.length).toBeLessThanOrEqual(SLACK_LIMITS.OPTION_TEXT_CHARS);
        expect(o.value?.length ?? 0).toBeLessThanOrEqual(SLACK_LIMITS.OPTION_VALUE_CHARS);
      }
      options += b.block_id === RESPOND.NONE_BLOCK ? 0 : b.element.options.length;
    }
    expect(options).toBe(POLL_LIMITS.MAX_DAYS * POLL_LIMITS.MAX_SLOTS_PER_DAY);
  });

  it("pre-fills the saved selection with option objects identical to the options", () => {
    const s = fixture("three-day");
    const selected = [s.slots[1], s.slots[2]];
    const view = respondModal({
      poll: s.poll,
      slots: s.slots,
      tz: FIXTURE_TZ,
      selected,
      noneSelected: false,
    });
    const first = checkboxGroups(view.blocks)[0];
    expect(first.element.initial_options?.map((o) => o.value)).toEqual(
      selected.map((d) => String(epochSeconds(d))),
    );
    for (const init of first.element.initial_options ?? [])
      expect(first.element.options).toContainEqual(init);
    expect(JSON.stringify(view.blocks[0])).toContain("your previous answer is ticked");
  });

  it("pre-checks 'none of these' when the participant previously chose it", () => {
    const s = fixture("three-day");
    const view = respondModal({
      poll: s.poll,
      slots: s.slots,
      tz: FIXTURE_TZ,
      selected: [],
      noneSelected: true,
    });
    const none = checkboxGroups(view.blocks).find(
      (b) => b.block_id === RESPOND.NONE_BLOCK,
    );
    expect(none?.element.initial_options?.[0]?.value).toBe(RESPOND.NONE_VALUE);
  });

  it("has small loading and unavailable views", () => {
    expect(loadingView().blocks.length).toBe(1);
    expect(JSON.stringify(unavailableView("scheduled"))).toContain("scheduled");
    expect(loadingView().submit).toBeUndefined();
  });
});
