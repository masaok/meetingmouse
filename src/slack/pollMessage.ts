import type { ActionsBlockElement, KnownBlock, PlainTextOption } from "@slack/types";

import { POLL_LIMITS } from "@/domain/constants";
import { gcalUrl } from "@/domain/gcal";
import { formatInTz, groupByLocalDate, slotEnd } from "@/domain/slots";
import { bestTimes, fullOverlapRanges, tally } from "@/domain/tally";
import type { PollSnapshot, SlotTally } from "@/domain/types";

import { dateToken, truncate, userMention } from "./format";
import {
  ACTION_GCAL_LINK,
  ACTION_ORGANIZER_MENU,
  ACTION_RESPOND_BUTTON,
  ORGANIZER_MENU,
} from "./ids";
import { SLACK_LIMITS } from "./limits";

const FULL = "🟩";
const EMPTY = "⬜";
const MAX_SQUARES = 10;
const MAX_NAMED_RESPONDENTS = 20;

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

  const byDay = groupByLocalDate(slots, poll.creatorTz);
  const tallyBySlot = new Map(tallies.map((t) => [t.slot.getTime(), t]));
  for (const [, daySlots] of byDay) {
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: dayText(daySlots, tallyBySlot, total, poll.creatorTz),
      },
    });
  }

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

interface Row {
  start: Date;
  count: number;
}

/**
 * One section per day. Rows with zero availability are collapsed into ranges. If the text would
 * exceed the section limit, only rows with availability are kept, plus a note.
 */
function dayText(
  daySlots: Date[],
  tallyBySlot: Map<number, SlotTally>,
  total: number,
  tz: string,
): string {
  const first = daySlots[0];
  const header = `*${dateToken(first, "{date_short_pretty}", formatInTz(first, tz, "EEE, MMM d"))}*`;
  const rows: Row[] = daySlots.map((s) => ({
    start: s,
    count: tallyBySlot.get(s.getTime())?.count ?? 0,
  }));

  const full = `${header}\n${collapseRows(rows, total, tz).join("\n")}`;
  if (full.length <= SLACK_LIMITS.SECTION_TEXT_CHARS) return full;

  const withVotes = rows.filter((r) => r.count > 0);
  const omitted = rows.length - withVotes.length;
  const compact = `${header}\n${collapseRows(withVotes, total, tz).join("\n")}\n_${omitted} slots with no availability hidden_`;
  return compact.length <= SLACK_LIMITS.SECTION_TEXT_CHARS
    ? compact
    : truncate(compact, SLACK_LIMITS.SECTION_TEXT_CHARS);
}

function collapseRows(rows: Row[], total: number, tz: string): string[] {
  const out: string[] = [];
  let i = 0;
  while (i < rows.length) {
    if (rows[i].count === 0) {
      let j = i;
      while (j + 1 < rows.length && rows[j + 1].count === 0) j++;
      if (j > i) {
        out.push(`${timeToken(rows[i].start, tz)}–${timeToken(rows[j].start, tz)} —`);
      } else {
        out.push(`${timeToken(rows[i].start, tz)} —`);
      }
      i = j + 1;
      continue;
    }
    out.push(
      `${timeToken(rows[i].start, tz)} ${bar(rows[i].count, total)} ${rows[i].count}`,
    );
    i++;
  }
  return out;
}

const timeToken = (d: Date, tz: string) =>
  dateToken(d, "{time}", formatInTz(d, tz, "h:mm a"));

/** N squares where N = participants (cap 10; beyond 10 the bar is scaled to the fraction). */
export function bar(count: number, total: number): string {
  if (total <= 0) return "";
  const width = Math.min(total, MAX_SQUARES);
  const filled = total <= MAX_SQUARES ? count : Math.round((count / total) * MAX_SQUARES);
  return FULL.repeat(filled) + EMPTY.repeat(Math.max(0, width - filled));
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
} {
  let longest = 0;
  for (const b of message.blocks) {
    if (b.type === "section" && b.text?.text)
      longest = Math.max(longest, b.text.text.length);
  }
  return { blocks: message.blocks.length, longestSection: longest };
}
