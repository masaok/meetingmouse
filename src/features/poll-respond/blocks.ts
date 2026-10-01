import type { Checkboxes, KnownBlock, ModalView, Option } from "@slack/types";

import type { PollStatus, SlotMinutes } from "@/domain/constants";
import { formatInTz, groupByLocalDate } from "@/domain/slots";
import type { Poll } from "@/domain/types";
import { epochSeconds } from "@/slack/format";
import { ACTION_GRID_LINK, CALLBACK_RESPOND_MODAL } from "@/slack/ids";
import { SLACK_LIMITS } from "@/slack/limits";

import { dayBlockId, RESPOND } from "./schema";

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
  /** Slot starts the responder has already selected. */
  selected: Date[];
  /** True when the responder previously answered "none of these". */
  noneSelected: boolean;
  /** How many people are free in each slot so far, keyed by epoch seconds. Absent means nobody. */
  counts?: ReadonlyMap<number, number>;
  /** How many people have answered so far. */
  responded?: number;
  /** The responder's own link to the web grid, when the host serves one. */
  gridUrl?: string;
}

const DURATION: Record<SlotMinutes, string> = { 15: "15 min", 30: "30 min", 60: "1 h" };

/**
 * One header per responder-local date, then a row per slot: a checkbox, the start time and
 * the slot's length, and under it how many people are free so far. The checkboxes sit in
 * actions blocks, which carry no label, in groups of at most ten. A slot can land on a
 * different calendar day than the organizer's; grouping by the responder's date is the point.
 */
export function respondModal(input: RespondModalInput): ModalView {
  const {
    poll,
    slots,
    tz,
    selected,
    noneSelected,
    counts,
    responded = 0,
    gridUrl,
  } = input;
  const selectedSeconds = new Set(selected.map(epochSeconds));
  const answered =
    responded === 0
      ? "Nobody has answered yet"
      : `${responded} ${responded === 1 ? "person has" : "people have"} answered`;
  const blocks: KnownBlock[] = [
    {
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: `🌐 Times in *${tz}* · ${answered}${selected.length > 0 ? " · your previous answer is ticked" : ""}`,
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

  for (const [localDate, daySlots] of groupByLocalDate(slots, tz)) {
    blocks.push({
      type: "header",
      text: plain(formatInTz(daySlots[0], tz, "EEEE, MMMM d")),
    });
    for (
      let chunk = 0;
      chunk * SLACK_LIMITS.CHECKBOX_OPTIONS < daySlots.length;
      chunk++
    ) {
      const part = daySlots.slice(
        chunk * SLACK_LIMITS.CHECKBOX_OPTIONS,
        (chunk + 1) * SLACK_LIMITS.CHECKBOX_OPTIONS,
      );
      const options: Option[] = part.map((s) => {
        const free = counts?.get(epochSeconds(s)) ?? 0;
        return {
          text: {
            type: "mrkdwn",
            text: `*${formatInTz(s, tz, "h:mm a")}*  ·  ${DURATION[poll.slotMinutes]}`,
          },
          ...(responded > 0
            ? { description: plain(`👥 ${free} of ${responded} free`) }
            : {}),
          value: String(epochSeconds(s)),
        };
      });
      const initial = options.filter((o) => selectedSeconds.has(Number(o.value)));
      const element: Checkboxes = {
        type: "checkboxes",
        action_id: RESPOND.SLOTS_ACTION,
        options,
        ...(initial.length > 0 ? { initial_options: initial } : {}),
      };
      blocks.push({
        type: "actions",
        block_id: dayBlockId(localDate, chunk),
        elements: [element],
      });
    }
  }

  const noneOption: Option = {
    text: { type: "mrkdwn", text: "*I can't make any of these*" },
    description: plain("Overrides anything ticked above"),
    value: RESPOND.NONE_VALUE,
  };
  blocks.push({ type: "divider" });
  blocks.push({
    type: "actions",
    block_id: RESPOND.NONE_BLOCK,
    elements: [
      {
        type: "checkboxes",
        action_id: RESPOND.NONE_ACTION,
        options: [noneOption],
        ...(noneSelected ? { initial_options: [noneOption] } : {}),
      },
    ],
  });

  return {
    type: "modal",
    callback_id: CALLBACK_RESPOND_MODAL,
    private_metadata: JSON.stringify({ pollId: poll.id }),
    title: plain(TITLE),
    submit: plain("Save"),
    close: plain("Cancel"),
    blocks,
  };
}
