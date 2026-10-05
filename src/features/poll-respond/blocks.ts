import type { ActionsBlock, Button, KnownBlock, ModalView } from "@slack/types";

import type { PollStatus } from "@/domain/constants";
import { formatInTz, groupByLocalDate } from "@/domain/slots";
import type { Poll } from "@/domain/types";
import { epochSeconds } from "@/slack/format";
import {
  ACTION_GRID_LINK,
  ACTION_TOGGLE_NONE,
  CALLBACK_RESPOND_MODAL,
} from "@/slack/ids";
import { timeButtonsPerRow } from "@/slack/limits";

import { dayBlockId, slotActionId } from "./schema";

const plain = (text: string) => ({ type: "plain_text" as const, text, emoji: true });
const TITLE = "Add my availability";

/** Opened immediately on button click so the trigger_id is consumed inside its 3 s window. */
export function loadingView(): ModalView {
  return {
    type: "modal",
    callback_id: CALLBACK_RESPOND_MODAL,
    title: plain(TITLE),
    close: plain("Cancel"),
    blocks: [
      { type: "section", text: { type: "mrkdwn", text: "⏳ Loading your times…" } },
    ],
  };
}

export function unavailableView(
  reason: "closed" | "scheduled" | "missing" | "error",
): ModalView {
  const text = {
    closed: "🔒 This poll is closed. Thanks anyway!",
    scheduled: "✅ This poll has been scheduled. Check the channel message for the time.",
    missing: "This poll no longer exists.",
    error: "Something went wrong loading the poll. Please try again.",
  }[reason];
  return {
    type: "modal",
    callback_id: CALLBACK_RESPOND_MODAL,
    title: plain(TITLE),
    close: plain("Close"),
    blocks: [{ type: "section", text: { type: "mrkdwn", text } }],
  };
}

export const unavailableReason = (status: PollStatus): "closed" | "scheduled" =>
  status === "scheduled" ? "scheduled" : "closed";

export interface RespondModalInput {
  poll: Poll;
  /** Every slot of the poll, ascending UTC. */
  slots: Date[];
  /** Responder's IANA zone: labels and day grouping use it. */
  tz: string;
  /** Slot starts the responder has chosen. */
  selected: Date[];
  /** True when the responder answered that none of the times work. */
  noneSelected: boolean;
  /** The responder's own link to the web grid, when the host serves one. */
  gridUrl?: string;
}

/** "9am" on the hour, "9:30am" otherwise: short enough for a row of buttons. */
const chipLabel = (slot: Date, tz: string): string =>
  formatInTz(
    slot,
    tz,
    formatInTz(slot, tz, "mm") === "00" ? "ha" : "h:mma",
  ).toLowerCase();

/**
 * One heading per responder-local date, then the time buttons in rows of three. A chosen time
 * is green with a tick. Each click is its own save, so the view has no Save button: the
 * listener flips the slot and redraws this view. A slot can land on a different calendar day
 * than the organizer's; grouping by the responder's date is the point.
 */
export function respondModal(input: RespondModalInput): ModalView {
  const { poll, slots, tz, selected, noneSelected, gridUrl } = input;
  const chosen = new Set(selected.map(epochSeconds));
  const blocks: KnownBlock[] = [
    {
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: `🌐 Times in *${tz}* · click a time to choose it, again to remove it · saved as you go`,
        },
      ],
    },
  ];
  if (gridUrl)
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: "Rather drag across a grid? It opens in your browser and saves as you go.",
      },
      accessory: {
        type: "button",
        action_id: ACTION_GRID_LINK,
        text: plain("Open the grid"),
        url: gridUrl,
      },
    });

  const grouped = [...groupByLocalDate(slots, tz)];
  const perRow = timeButtonsPerRow({
    dayCount: grouped.length,
    maxSlotsInDay: Math.max(0, ...grouped.map(([, daySlots]) => daySlots.length)),
    hasGridLink: Boolean(gridUrl),
  });

  for (const [localDate, daySlots] of grouped) {
    blocks.push({
      type: "section",
      text: { type: "mrkdwn", text: `*${formatInTz(daySlots[0], tz, "EEEE, MMMM d")}*` },
    });
    for (let chunk = 0; chunk * perRow < daySlots.length; chunk++) {
      const part = daySlots.slice(chunk * perRow, (chunk + 1) * perRow);
      const row: ActionsBlock = {
        type: "actions",
        block_id: dayBlockId(localDate, chunk),
        elements: part.map((slot): Button => {
          const seconds = epochSeconds(slot);
          const on = chosen.has(seconds);
          return {
            type: "button",
            action_id: slotActionId(seconds),
            text: plain(`${on ? "✓ " : ""}${chipLabel(slot, tz)}`),
            value: String(seconds),
            ...(on ? { style: "primary" } : {}),
          };
        }),
      };
      blocks.push(row);
    }
  }

  const status =
    chosen.size > 0
      ? `✅ ${chosen.size} ${chosen.size === 1 ? "time" : "times"} chosen`
      : noneSelected
        ? "You answered that none of these times work."
        : "You have not answered yet.";
  blocks.push({ type: "divider" });
  blocks.push({
    type: "actions",
    block_id: "none_block",
    elements: [
      {
        type: "button",
        action_id: ACTION_TOGGLE_NONE,
        text: plain(`${noneSelected ? "✓ " : ""}I can't make any of these`),
        value: poll.id,
        ...(noneSelected ? { style: "danger" } : {}),
      },
    ],
  });
  blocks.push({ type: "context", elements: [{ type: "mrkdwn", text: status }] });

  return {
    type: "modal",
    callback_id: CALLBACK_RESPOND_MODAL,
    private_metadata: JSON.stringify({ pollId: poll.id }),
    title: plain(TITLE),
    close: plain("Done"),
    blocks,
  };
}
