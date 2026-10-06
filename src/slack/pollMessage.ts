import type {
  ActionsBlockElement,
  KnownBlock,
  PlainTextOption,
  RichTextBlock,
  RichTextElement,
  TableBlock,
} from "@slack/types";

import { POLL_LIMITS } from "@/domain/constants";
import { gcalUrl } from "@/domain/gcal";
import { gridModel } from "@/domain/grid";
import { formatInTz, slotEnd } from "@/domain/slots";
import { bestTimes, fullOverlapRanges, tally } from "@/domain/tally";
import type { PollSnapshot, SlotTally } from "@/domain/types";

import { dateToken, epochSeconds, truncate, userMention } from "./format";
import {
  ACTION_GCAL_LINK,
  ACTION_ORGANIZER_MENU,
  ACTION_RESPOND_BUTTON,
  ORGANIZER_MENU,
} from "./ids";
import { SLACK_LIMITS } from "./limits";

const MAX_NAMED_RESPONDENTS = 20;

/** How much of the group is free in a slot. One colored square per level. */
const HEAT = {
  none: { emoji: "white_large_square", glyph: "⬜", label: "nobody" },
  few: { emoji: "large_orange_square", glyph: "🟧", label: "a few" },
  most: { emoji: "large_yellow_square", glyph: "🟨", label: "half or more" },
  all: { emoji: "large_green_square", glyph: "🟩", label: "everyone" },
} as const;
type HeatLevel = keyof typeof HEAT;

const LEGEND = (["all", "most", "few", "none"] as const)
  .map((level) => `${HEAT[level].glyph} ${HEAT[level].label}`)
  .join(" · ");

export interface PollMessage {
  /** Notification / fallback text. */
  text: string;
  blocks: KnownBlock[];
}

/** The poll message, rendered from a snapshot. Pure: hand it data, get blocks. */
export function renderPollMessage(snapshot: PollSnapshot): PollMessage {
  const { poll, slots, participants, availability } = snapshot;
  const total = participants.length;
  const tallies = tally(slots, availability);
  const blocks: KnownBlock[] = [];

  blocks.push({
    type: "header",
    text: {
      type: "plain_text",
      text: truncate(`📅 ${poll.title}`, SLACK_LIMITS.HEADER_TEXT_CHARS),
      emoji: true,
    },
  });

  const statusLine =
    poll.status === "closed"
      ? "🔒 Poll closed"
      : poll.status === "scheduled"
        ? "✅ Scheduled"
        : "";
  blocks.push({
    type: "context",
    elements: [
      {
        type: "mrkdwn",
        text: [
          `Organized by ${userMention(poll.creatorId)}`,
          `${total} responded`,
          "times shown in your time zone",
          statusLine,
        ]
          .filter(Boolean)
          .join(" · "),
      },
    ],
  });

  if (poll.status === "scheduled" && poll.finalSlotStart) {
    const start = poll.finalSlotStart;
    const end = slotEnd(start, poll.slotMinutes);
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*✅ Scheduled for ${dateToken(start, "{date_short_pretty} {time}", formatInTz(start, poll.creatorTz, "EEE, MMM d h:mm a zzz"))}*`,
      },
      accessory: {
        type: "button",
        action_id: ACTION_GCAL_LINK,
        text: { type: "plain_text", text: "Add to Google Calendar", emoji: true },
        url: gcalUrl({ title: poll.title, start, end }),
      },
    });
  } else {
    blocks.push({
      type: "section",
      text: { type: "mrkdwn", text: bestTimesText(tallies, total, poll.creatorTz) },
    });
    const ranges = fullOverlapRanges(tallies, total, poll.slotMinutes);
    if (ranges.length > 0) {
      const list = ranges
        .slice(0, 5)
        .map(
          (r) =>
            `${dateToken(r.start, "{date_short_pretty} {time}", formatInTz(r.start, poll.creatorTz, "EEE MMM d h:mm a"))}–${dateToken(r.end, "{time}", formatInTz(r.end, poll.creatorTz, "h:mm a"))}`,
        )
        .join(", ");
      blocks.push({
        type: "section",
        text: { type: "mrkdwn", text: `*Everyone free:* ${list}` },
      });
    }
  }

  blocks.push({ type: "divider" });

  blocks.push(gridTable(slots, tallies, total, poll.creatorTz));
  if (total > 0)
    blocks.push({ type: "context", elements: [{ type: "mrkdwn", text: LEGEND }] });

  if (total > 0) {
    const named = participants
      .slice(0, MAX_NAMED_RESPONDENTS)
      .map((p) => userMention(p.userId));
    const more = total - named.length;
    blocks.push({
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: `Responded: ${named.join(", ")}${more > 0 ? ` +${more} more` : ""}`,
        },
      ],
    });
  }

  const actions = actionElements(poll.id, poll.status);
  if (actions.length > 0)
    blocks.push({
      type: "actions",
      block_id: `poll_actions_${poll.id}`,
      elements: actions,
    });

  return { text: `📅 ${poll.title} — availability poll`, blocks };
}

function bestTimesText(tallies: SlotTally[], total: number, tz: string): string {
  const best = bestTimes(tallies, POLL_LIMITS.BEST_TIMES);
  if (best.length === 0)
    return "*Best times*\nNo responses yet. Click *Add my availability* to be first.";
  const lines = best.map((t, i) => {
    const token = dateToken(
      t.slot,
      "{date_short_pretty} {time}",
      formatInTz(t.slot, tz, "EEE MMM d h:mm a"),
    );
    const all = t.count === total ? " ✅" : "";
    return `${i + 1}. ${token} — ${t.count}/${total}${all}`;
  });
  return `*Best times*\n${lines.join("\n")}`;
}

export function heatLevel(count: number, total: number): HeatLevel {
  if (count <= 0 || total <= 0) return "none";
  if (count >= total) return "all";
  return count * 2 >= total ? "most" : "few";
}

const cell = (...elements: RichTextElement[]): RichTextBlock => ({
  type: "rich_text",
  elements: [{ type: "rich_text_section", elements }],
});

/**
 * The group's availability as one table: a column per day, a row per time of day, and in each
 * cell a square for how much of the group is free plus the headcount. Days and times are
 * grouped in the organizer's zone; the labels are date elements, so each viewer reads them in
 * their own. The day header reads "Mon Oct 5": Slack has no short weekday token, so the weekday
 * is text in the organizer's zone and `{date_short}` supplies the viewer's date. `{date_long}`
 * spells out "Monday, October 5th". A day that lacks a time (a daylight-saving change) gets a
 * blank cell.
 */
function gridTable(
  slots: Date[],
  tallies: SlotTally[],
  total: number,
  tz: string,
): TableBlock {
  const countBySlot = new Map(tallies.map((t) => [t.slot.getTime(), t.count]));
  const { days, rows, cells } = gridModel(slots, tz);
  const blank = cell({ type: "text", text: " " });

  const header = days.map(({ first }) =>
    cell(
      { type: "text", text: `${formatInTz(first, tz, "EEE")} `, style: { bold: true } },
      {
        type: "date",
        timestamp: epochSeconds(first),
        format: "{date_short}",
        fallback: formatInTz(first, tz, "MMM d"),
        style: { bold: true },
      },
    ),
  );
  const body = rows.map(({ sample }, r) => {
    const label = cell({
      type: "date",
      timestamp: epochSeconds(sample),
      format: "{time}",
      fallback: formatInTz(sample, tz, "h:mm a"),
    });
    const heat = cells[r].map((slot) => {
      if (!slot) return blank;
      const count = countBySlot.get(slot.getTime()) ?? 0;
      const square: RichTextElement = {
        type: "emoji",
        name: HEAT[heatLevel(count, total)].emoji,
      };
      return count > 0 ? cell(square, { type: "text", text: ` ${count}` }) : cell(square);
    });
    return [label, ...heat];
  });

  return {
    type: "table",
    column_settings: [
      { align: "right" },
      // Left, not center: a centered square shifts when a count sits beside it.
      ...days.map(() => ({ align: "left" as const })),
    ],
    rows: [[blank, ...header], ...body],
  };
}

function actionElements(
  pollId: string,
  status: PollSnapshot["poll"]["status"],
): ActionsBlockElement[] {
  const elements: ActionsBlockElement[] = [];
  if (status === "open") {
    elements.push({
      type: "button",
      action_id: ACTION_RESPOND_BUTTON,
      style: "primary",
      text: { type: "plain_text", text: "Add my availability", emoji: true },
      value: pollId,
    });
  }
  const options: PlainTextOption[] = [];
  if (status !== "scheduled") {
    options.push({
      text: { type: "plain_text", text: "Pick final time" },
      value: ORGANIZER_MENU.PICK,
    });
  }
  if (status === "open") {
    options.push({
      text: { type: "plain_text", text: "Close poll" },
      value: ORGANIZER_MENU.CLOSE,
    });
  }
  options.push({
    text: { type: "plain_text", text: "Delete poll" },
    value: ORGANIZER_MENU.DELETE,
  });
  elements.push({
    type: "overflow",
    action_id: ACTION_ORGANIZER_MENU,
    options,
    confirm: {
      title: { type: "plain_text", text: "Organizer action" },
      text: { type: "mrkdwn", text: "Only the organizer can do this. Continue?" },
      confirm: { type: "plain_text", text: "Continue" },
      deny: { type: "plain_text", text: "Cancel" },
    },
  });
  return elements;
}

/** Guard used by tests and the fixture renderer. */
export function messageStats(message: PollMessage): {
  blocks: number;
  longestSection: number;
  tableRows: number;
  tableColumns: number;
  tableChars: number;
} {
  let longest = 0;
  let tableRows = 0;
  let tableColumns = 0;
  let tableChars = 0;
  for (const b of message.blocks) {
    if (b.type === "section" && b.text?.text)
      longest = Math.max(longest, b.text.text.length);
    if (b.type === "table") {
      tableRows = b.rows.length;
      tableColumns = Math.max(...b.rows.map((row) => row.length));
      tableChars = b.rows.flat().reduce((sum, c) => sum + cellChars(c), 0);
    }
  }
  return {
    blocks: message.blocks.length,
    longestSection: longest,
    tableRows,
    tableColumns,
    tableChars,
  };
}

/** The visible text of a table cell: its text, emoji names and date fallbacks. */
function cellChars(c: TableBlock["rows"][number][number]): number {
  if (c.type !== "rich_text") return c.text.length;
  let chars = 0;
  for (const section of c.elements) {
    if (section.type !== "rich_text_section") continue;
    for (const e of section.elements) {
      if (e.type === "text") chars += e.text.length;
      else if (e.type === "emoji") chars += e.name.length;
      else if (e.type === "date") chars += (e.fallback ?? "").length;
    }
  }
  return chars;
}
