import type { InputBlock, StaticSelect } from "@slack/types";
import { describe, expect, it } from "vitest";

import { POLL_LIMITS } from "@/domain/constants";
import { bestTimes, tally } from "@/domain/tally";
import { fixture } from "@/slack/fixtures";
import { epochSeconds } from "@/slack/format";
import { CALLBACK_PICK_TIME_MODAL } from "@/slack/ids";
import { SLACK_LIMITS } from "@/slack/limits";

import { pickCandidates, pickTimeModal, scheduledAnnouncement } from "./blocks";
import { PICK } from "./schema";

const select = (view: ReturnType<typeof pickTimeModal>): StaticSelect => {
  const block = view.blocks.find(
    (b) => b.type === "input" && b.block_id === PICK.block,
  ) as InputBlock;
  return block.element as StaticSelect;
};

describe("pickTimeModal", () => {
  const snapshot = fixture("three-day");

  it("matches the snapshot", () => {
    expect(pickTimeModal(snapshot)).toMatchSnapshot();
  });

  it("lists the best times with counts, best first", () => {
    const view = pickTimeModal(snapshot);
    expect(view.callback_id).toBe(CALLBACK_PICK_TIME_MODAL);
    expect(JSON.parse(view.private_metadata ?? "{}")).toEqual({
      pollId: snapshot.poll.id,
    });
    expect(view.title.text.length).toBeLessThanOrEqual(SLACK_LIMITS.MODAL_TITLE_CHARS);
    const options = select(view).options ?? [];
    const best = bestTimes(
      tally(snapshot.slots, snapshot.availability),
      POLL_LIMITS.PICK_CANDIDATES,
    );
    expect(options.map((o) => o.value)).toEqual(
      best.map((t) => String(epochSeconds(t.slot))),
    );
    expect(options[0].text.text).toMatch(/— \d\/4$/);
    expect(options[0].text.text).toContain(`— ${best[0].count}/4`);
    for (const o of options) {
      expect(o.text.text.length).toBeLessThanOrEqual(SLACK_LIMITS.OPTION_TEXT_CHARS);
    }
  });

  it("falls back to the first slots when nobody responded", () => {
    const empty = fixture("empty");
    const options = pickCandidates(empty);
    expect(options.length).toBe(POLL_LIMITS.PICK_CANDIDATES);
    expect(options.map((o) => o.value)).toEqual(
      empty.slots
        .slice(0, POLL_LIMITS.PICK_CANDIDATES)
        .map((s) => String(epochSeconds(s))),
    );
    expect(options[0].text.text).toBe("Tue, Oct 6 9:00 AM — 0/0");
  });
});

describe("scheduledAnnouncement", () => {
  it("mentions participants, states the time, and links Google Calendar", () => {
    const snapshot = fixture("three-day");
    const text = scheduledAnnouncement(snapshot, snapshot.slots[2]);
    for (const p of snapshot.participants) expect(text).toContain(`<@${p.userId}>`);
    expect(text).toContain("<!date^");
    expect(text).toContain("calendar.google.com/calendar/render?action=TEMPLATE");
    expect(text).toContain("Sprint planning");
  });

  it("caps mentions at 30", () => {
    const many = fixture("many-participants");
    const withMore = {
      ...many,
      participants: [...many.participants, ...many.participants].map((p, i) => ({
        ...p,
        userId: `U${i}`,
      })),
    };
    const text = scheduledAnnouncement(withMore, many.slots[0]);
    expect(text.match(/<@U\d+>/g)?.length).toBe(30);
    expect(text).toContain("+20 more");
  });
});
