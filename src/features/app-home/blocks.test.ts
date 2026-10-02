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

  it("ends with a help line that links to the support URL when the host sets one", () => {
    const view = homeView({
      organized: [],
      responded: [],
      supportUrl: "https://example.com/support",
    });
    expect(view.blocks.at(-1)).toEqual({
      type: "context",
      elements: [
        { type: "mrkdwn", text: "Need help? <https://example.com/support|Get support>." },
      ],
    });
  });

  it("says nothing about support when the host sets no URL", () => {
    const bare = homeView({ organized: [], responded: [] });
    expect(homeView({ organized: [], responded: [], supportUrl: undefined })).toEqual(
      bare,
    );
    expect(JSON.stringify(bare)).not.toContain("Need help?");
  });

  it("caps each list and stays under the block limit with 20 items each and a help line", () => {
    const poll = fixture("three-day").poll;
    const items = Array.from({ length: 20 }, (_, i) => ({
      poll: { ...poll, id: `P${i}` },
    }));
    const view = homeView({
      organized: items,
      responded: items,
      supportUrl: "https://example.com/support",
    });
    expect(JSON.stringify(view.blocks.at(-1))).toContain("Need help?");
    expect(view.blocks.length).toBeLessThanOrEqual(SLACK_LIMITS.BLOCKS_PER_MODAL);
    const sections = view.blocks.filter(
      (b) => b.type === "section" && JSON.stringify(b).includes("📅"),
    );
    expect(sections.length).toBe(HOME_LIST_LIMIT * 2);
    expect(JSON.stringify(view)).toContain("…and 10 more");
  });
});
