import { describe, expect, it } from "vitest";

import { POLL_LIMITS } from "@/domain/constants";

import { fixture } from "./fixtures";
import { ACTION_GCAL_LINK, ACTION_ORGANIZER_MENU, ACTION_RESPOND_BUTTON } from "./ids";
import { SLACK_LIMITS } from "./limits";
import { bar, messageStats, renderPollMessage } from "./pollMessage";

const actionIds = (blocks: ReturnType<typeof renderPollMessage>["blocks"]) =>
  blocks.flatMap((b) =>
    b.type === "actions"
      ? b.elements.map((e) => ("action_id" in e ? e.action_id : undefined))
      : [],
  );

describe("renderPollMessage", () => {
  it("renders an open poll with no responses", () => {
    const m = renderPollMessage(fixture("empty"));
    expect(m.blocks[0]).toMatchObject({ type: "header" });
    expect(JSON.stringify(m.blocks)).toContain("No responses yet");
    expect(actionIds(m.blocks)).toEqual([ACTION_RESPOND_BUTTON, ACTION_ORGANIZER_MENU]);
    // 3 creator-local days → 3 day sections
    expect(m.blocks.filter((b) => b.type === "section").length).toBe(1 + 3);
  });

  it("matches the snapshot for a three-day poll with responses", () => {
    expect(renderPollMessage(fixture("three-day"))).toMatchSnapshot();
  });

  it("counts a 'none of these' participant as responded", () => {
    const m = renderPollMessage(fixture("three-day"));
    const context = m.blocks[1];
    expect(context.type === "context" && JSON.stringify(context)).toContain(
      "4 responded",
    );
  });

  it("stays within Slack limits for the 14-day × 24-slot worst case", () => {
    const m = renderPollMessage(fixture("worst-case"));
    const stats = messageStats(m);
    expect(stats.blocks).toBeLessThanOrEqual(SLACK_LIMITS.BLOCKS_PER_MESSAGE);
    expect(stats.longestSection).toBeLessThanOrEqual(SLACK_LIMITS.SECTION_TEXT_CHARS);
    expect(m.blocks.filter((b) => b.type === "section").length).toBe(
      1 + POLL_LIMITS.MAX_DAYS,
    );
    for (const b of m.blocks) {
      if (b.type === "header")
        expect(b.text.text.length).toBeLessThanOrEqual(SLACK_LIMITS.HEADER_TEXT_CHARS);
    }
  });

  it("caps the respondent list and scales the bar beyond 10 participants", () => {
    const m = renderPollMessage(fixture("many-participants"));
    const respondents = m.blocks.find(
      (b) => b.type === "context" && JSON.stringify(b).includes("Responded:"),
    );
    expect(JSON.stringify(respondents)).toContain("+5 more");
    expect(bar(25, 25)).toBe("🟩".repeat(10));
    expect(bar(5, 25)).toBe("🟩🟩" + "⬜".repeat(8));
    expect(bar(2, 4)).toBe("🟩🟩⬜⬜");
    expect(bar(0, 0)).toBe("");
  });

  it("collapses runs of empty slots", () => {
    const m = renderPollMessage(fixture("empty"));
    const day = m.blocks.find(
      (b) => b.type === "section" && b.text?.text.startsWith("*<!date"),
    );
    expect(day && day.type === "section" && day.text?.text.split("\n").length).toBe(2); // header + one collapsed range
  });

  it("removes the respond button when closed and shows the calendar link when scheduled", () => {
    const closed = renderPollMessage(fixture("closed"));
    expect(actionIds(closed.blocks)).toEqual([ACTION_ORGANIZER_MENU]);
    expect(JSON.stringify(closed.blocks[1])).toContain("Poll closed");

    const scheduled = renderPollMessage(fixture("scheduled"));
    expect(actionIds(scheduled.blocks)).toEqual([ACTION_ORGANIZER_MENU]);
    const section = scheduled.blocks[2];
    expect(
      section.type === "section" &&
        section.accessory?.type === "button" &&
        section.accessory.action_id,
    ).toBe(ACTION_GCAL_LINK);
    expect(JSON.stringify(section)).toContain("calendar.google.com");
  });
});
