import { describe, expect, it } from "vitest";

import { fixture } from "@/slack/fixtures";
import { SLACK_LIMITS } from "@/slack/limits";

import { HOME_LIST_LIMIT, homeView } from "./blocks";

describe("homeView", () => {
  it("renders the empty state", () => {
    const view = homeView({ organized: [], responded: [] });
    expect(view.type).toBe("home");
    expect(view).toMatchSnapshot();
    expect(JSON.stringify(view)).toContain("haven't started a poll yet");
    expect(JSON.stringify(view)).toContain("Nothing yet");
  });

  it("renders items with permalinks, status and channel", () => {
    const open = fixture("three-day").poll;
    const scheduled = fixture("scheduled").poll;
    const view = homeView({
      organized: [{ poll: open, permalink: "https://slack.com/archives/C0000TEST/p1" }],
      responded: [{ poll: scheduled }],
    });
    const text = JSON.stringify(view);
    expect(text).toContain("<https://slack.com/archives/C0000TEST/p1|Sprint planning>");
    expect(text).toContain("🟢 Open");
    expect(text).toContain("✅ Scheduled for <!date^");
    expect(text).toContain("<#C0000TEST>");
  });

  it("caps each list and stays under the block limit with 20 items each", () => {
    const poll = fixture("three-day").poll;
    const items = Array.from({ length: 20 }, (_, i) => ({
      poll: { ...poll, id: `P${i}` },
    }));
    const view = homeView({ organized: items, responded: items });
    expect(view.blocks.length).toBeLessThanOrEqual(SLACK_LIMITS.BLOCKS_PER_MODAL);
    const sections = view.blocks.filter(
      (b) => b.type === "section" && JSON.stringify(b).includes("📅"),
    );
    expect(sections.length).toBe(HOME_LIST_LIMIT * 2);
    expect(JSON.stringify(view)).toContain("…and 10 more");
  });
});
