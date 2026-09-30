import type { Checkboxes, KnownBlock, ModalView, PlainTextOption } from "@slack/types";

import type { PollStatus } from "@/domain/constants";
import { formatInTz, groupByLocalDate, slotEnd } from "@/domain/slots";
import type { Poll } from "@/domain/types";
import { epochSeconds } from "@/slack/format";
import { CALLBACK_RESPOND_MODAL } from "@/slack/ids";
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
}

/**
 * One header per responder-local date, then ≤10-option checkbox inputs. A slot can land on a
 * different calendar day than the organizer's; grouping by the responder's date is the point.
 */
export function respondModal(input: RespondModalInput): ModalView {
  const { poll, slots, tz, selected, noneSelected } = input;
  const selectedSeconds = new Set(selected.map(epochSeconds));
  const blocks: KnownBlock[] = [
    {
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: `Times in *${tz}*. Tick every slot that works for you.${selected.length > 0 ? " Your previous answer is pre-filled." : ""}`,
        },
      ],
    },
  ];

  for (const [localDate, daySlots] of groupByLocalDate(slots, tz)) {
    blocks.push({
      type: "header",
      text: plain(formatInTz(daySlots[0], tz, "EEEE, MMM d")),
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
      const options: PlainTextOption[] = part.map((s) => ({
        text: plain(
          `${formatInTz(s, tz, "h:mm a")} – ${formatInTz(slotEnd(s, poll.slotMinutes), tz, "h:mm a")}`,
        ),
        value: String(epochSeconds(s)),
      }));
      const initial = options.filter((o) => selectedSeconds.has(Number(o.value)));
      const element: Checkboxes = {
        type: "checkboxes",
        action_id: RESPOND.SLOTS_ACTION,
        options,
        ...(initial.length > 0 ? { initial_options: initial } : {}),
      };
      blocks.push({
        type: "input",
        optional: true,
        block_id: dayBlockId(localDate, chunk),
        label: plain(chunk === 0 ? "Times" : "Times (continued)"),
        element,
      });
    }
  }

  const noneOption: PlainTextOption = {
    text: plain("I can't make any of these"),
    value: RESPOND.NONE_VALUE,
  };
  blocks.push({ type: "divider" });
  blocks.push({
    type: "input",
    optional: true,
    block_id: RESPOND.NONE_BLOCK,
    label: plain("None of these work?"),
    element: {
      type: "checkboxes",
      action_id: RESPOND.NONE_ACTION,
      options: [noneOption],
      ...(noneSelected ? { initial_options: [noneOption] } : {}),
    },
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
