import type { InputBlock, ModalView, MultiStaticSelect } from "@slack/types";
import { describe, expect, it } from "vitest";

import { POLL_LIMITS } from "@/domain/constants";
import { FIXTURE_NOW, FIXTURE_TZ } from "@/slack/fixtures";
import { CALLBACK_CREATE_POLL_MODAL } from "@/slack/ids";
import { SLACK_LIMITS } from "@/slack/limits";

import { createPollModal, dateLabel, timeLabel } from "./blocks";
import { INPUT } from "./schema";

/** The dates multi-select of a create modal, or undefined. */
function datesSelect(v: ModalView): MultiStaticSelect | undefined {
  const block = v.blocks.find(
    (b) => b.type === "input" && b.block_id === INPUT.DATES.block,
  ) as InputBlock | undefined;
  const el = block?.element;
  return el?.type === "multi_static_select" ? el : undefined;
}

describe("createPollModal", () => {
  const view = createPollModal({
    title: "Sprint planning",
    channelId: "C123",
    tz: FIXTURE_TZ,
    now: FIXTURE_NOW,
  });

  it("matches the snapshot", () => {
    expect(view).toMatchSnapshot();
  });

  it("uses the callback id and carries the channel", () => {
    expect(view.callback_id).toBe(CALLBACK_CREATE_POLL_MODAL);
    expect(JSON.parse(view.private_metadata ?? "{}")).toEqual({ channelId: "C123" });
    expect(view.title.text.length).toBeLessThanOrEqual(SLACK_LIMITS.MODAL_TITLE_CHARS);
    expect(view.blocks.length).toBeLessThanOrEqual(SLACK_LIMITS.BLOCKS_PER_MODAL);
  });

  it("offers the next 21 dates labeled in the creator's zone", () => {
    const el = datesSelect(view);
    expect(el?.options?.length).toBe(POLL_LIMITS.DATE_PICKER_DAYS);
    expect(el?.options?.[0]).toEqual({
      text: { type: "plain_text", text: "Tue, Oct 6", emoji: true },
      value: "2026-10-06",
    });
    expect(el?.max_selected_items).toBe(POLL_LIMITS.MAX_DAYS);
    for (const o of el?.options ?? []) {
      expect(o.text.text.length).toBeLessThanOrEqual(SLACK_LIMITS.OPTION_TEXT_CHARS);
    }
  });

  it("labels times as wall-clock, independent of zone", () => {
    expect(timeLabel(540)).toBe("9:00 AM");
    expect(timeLabel(1380)).toBe("11:00 PM");
    expect(dateLabel("2026-11-01")).toBe("Sun, Nov 1");
  });

  it("omits the initial title and channel when absent (shortcut path)", () => {
    const v = createPollModal({ tz: "Asia/Tokyo", now: FIXTURE_NOW });
    expect(JSON.stringify(v)).not.toContain("initial_value");
    expect(JSON.stringify(v)).not.toContain("initial_conversation");
    // 16:00Z on Oct 6 is already Oct 7 in Tokyo
    expect(datesSelect(v)?.options?.[0]?.value).toBe("2026-10-07");
  });
});
