import { describe, expect, it } from "vitest";

import { POLL_LIMITS } from "@/domain/constants";

import { fixture } from "./fixtures";
import { ACTION_GCAL_LINK, ACTION_ORGANIZER_MENU, ACTION_RESPOND_BUTTON } from "./ids";
import { SLACK_LIMITS } from "./limits";
import { heatLevel, messageStats, renderPollMessage } from "./pollMessage";

type Blocks = ReturnType<typeof renderPollMessage>["blocks"];

/** The grid as plain text, one string per cell: date fallbacks, emoji names and text joined. */
const gridText = (blocks: Blocks): string[][] => {
  const table = blocks.find((b) => b.type === "table");
  if (table?.type !== "table") throw new Error("the message has no table");
  return table.rows.map((row) =>
    row.map((c) =>
      c.type === "rich_text"
        ? c.elements
            .flatMap((section) =>
              section.type === "rich_text_section" ? section.elements : [],
            )
            .map((e) =>
              e.type === "text"
                ? e.text
                : e.type === "emoji"
                  ? e.name
                  : e.type === "date"
                    ? e.fallback
                    : "",
            )
            .join("")
        : c.text,
    ),
  );
};

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
    expect(m.blocks.filter((b) => b.type === "table").length).toBe(1);
  });

  it("lays the poll out as a grid: a column per day, a row per time", () => {
    const grid = gridText(renderPollMessage(fixture("empty")).blocks);
    expect(grid[0]).toEqual([" ", "Tue 10/6", "Wed 10/7", "Thu 10/8"]);
    expect(grid.map((row) => row[0])).toEqual([
      " ",
      "9:00 AM",
      "9:30 AM",
      "10:00 AM",
      "10:30 AM",
      "11:00 AM",
      "11:30 AM",
      "12:00 PM",
      "12:30 PM",
      "1:00 PM",
      "1:30 PM",
      "2:00 PM",
      "2:30 PM",
      "3:00 PM",
      "3:30 PM",
      "4:00 PM",
      "4:30 PM",
    ]);
    expect(grid[1].slice(1)).toEqual([
      "white_large_square",
      "white_large_square",
      "white_large_square",
    ]);
  });

  it("puts a square and the headcount in each cell that has availability", () => {
    const snapshot = fixture("three-day");
    const [first, second] = snapshot.slots;
    const [a, b, c] = snapshot.participants;
    const free = (userId: string, slotStart: Date) => ({
      pollId: snapshot.poll.id,
      userId,
      slotStart,
    });
    const grid = gridText(
      renderPollMessage({
        ...snapshot,
        participants: [a, b, c],
        availability: [
          free(a.userId, first),
          free(b.userId, first),
          free(c.userId, first),
          free(a.userId, second),
        ],
      }).blocks,
    );
    expect(grid[1][1]).toBe("large_green_square 3");
    expect(grid[2][1]).toBe("large_orange_square 1");
    expect(grid[3][1]).toBe("white_large_square");
  });

  it("starts every square at the same edge, with or without a count beside it", () => {
    const table = renderPollMessage(fixture("three-day")).blocks.find(
      (b) => b.type === "table",
    );
    if (table?.type !== "table") throw new Error("the message has no table");
    // Centering puts a lone square to the right of a square that has a count next to it.
    expect(table.column_settings).toEqual([
      { align: "right" },
      { align: "left" },
      { align: "left" },
      { align: "left" },
    ]);
  });

  it("grades a slot by how much of the group is free", () => {
    expect(heatLevel(0, 4)).toBe("none");
    expect(heatLevel(1, 4)).toBe("few");
    expect(heatLevel(2, 4)).toBe("most");
    expect(heatLevel(3, 4)).toBe("most");
    expect(heatLevel(4, 4)).toBe("all");
    expect(heatLevel(1, 1)).toBe("all");
    expect(heatLevel(0, 0)).toBe("none");
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
    expect(stats.tableRows).toBe(1 + POLL_LIMITS.MAX_SLOTS_PER_DAY);
    expect(stats.tableColumns).toBe(1 + POLL_LIMITS.MAX_DAYS);
    expect(stats.tableRows).toBeLessThanOrEqual(SLACK_LIMITS.TABLE_ROWS);
    expect(stats.tableColumns).toBeLessThanOrEqual(SLACK_LIMITS.TABLE_COLUMNS);
    expect(stats.tableChars).toBeLessThanOrEqual(SLACK_LIMITS.TABLE_CHARS);
    for (const b of m.blocks) {
      if (b.type === "header")
        expect(b.text.text.length).toBeLessThanOrEqual(SLACK_LIMITS.HEADER_TEXT_CHARS);
    }
  });

  it("caps the respondent list", () => {
    const m = renderPollMessage(fixture("many-participants"));
    const respondents = m.blocks.find(
      (b) => b.type === "context" && JSON.stringify(b).includes("Responded:"),
    );
    expect(JSON.stringify(respondents)).toContain("+5 more");
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
