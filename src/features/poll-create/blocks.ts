import type { KnownBlock, ModalView, PlainTextOption } from "@slack/types";

import { DEFAULT_SLOT_MINUTES, POLL_LIMITS, SLOT_MINUTES } from "@/domain/constants";
import { formatInTz, upcomingDates } from "@/domain/slots";
import { CALLBACK_CREATE_POLL_MODAL } from "@/slack/ids";

import { INPUT } from "./schema";

export interface CreatePollModalInput {
  /** Pre-filled from `/meet <title>`. */
  title?: string;
  /** Channel the command was run in; pre-selected. Absent for the global shortcut. */
  channelId?: string;
  /** Creator's IANA zone, for date labels. */
  tz: string;
  now: Date;
}

const plain = (text: string): PlainTextOption["text"] => ({
  type: "plain_text",
  text,
  emoji: true,
});
const opt = (text: string, value: string): PlainTextOption => ({
  text: plain(text),
  value,
});

/** "9:00 AM" for minutes-from-midnight. Zone-independent: it is a wall-clock label. */
export const timeLabel = (minutes: number): string =>
  formatInTz(
    new Date(Date.UTC(2000, 0, 1, Math.floor(minutes / 60), minutes % 60)),
    "UTC",
    "h:mm a",
  );

/** "Tue, Sep 30" for a yyyy-mm-dd. Zone-independent for the same reason. */
export const dateLabel = (date: string): string =>
  formatInTz(new Date(`${date}T12:00:00Z`), "UTC", "EEE, MMM d");

function timeOptions(): PlainTextOption[] {
  const out: PlainTextOption[] = [];
  for (
    let m = POLL_LIMITS.WINDOW_MIN_MINUTES;
    m <= POLL_LIMITS.WINDOW_MAX_MINUTES;
    m += 30
  ) {
    out.push(opt(timeLabel(m), String(m)));
  }
  return out;
}

export function createPollModal(input: CreatePollModalInput): ModalView {
  const dates = upcomingDates(input.now, input.tz, POLL_LIMITS.DATE_PICKER_DAYS);
  const times = timeOptions();
  const find = (minutes: number) => times.find((t) => t.value === String(minutes));

  const blocks: KnownBlock[] = [
    {
      type: "input",
      block_id: INPUT.TITLE.block,
      label: plain("Title"),
      element: {
        type: "plain_text_input",
        action_id: INPUT.TITLE.action,
        max_length: POLL_LIMITS.MAX_TITLE_CHARS,
        placeholder: plain("Sprint planning"),
        ...(input.title
          ? { initial_value: input.title.slice(0, POLL_LIMITS.MAX_TITLE_CHARS) }
          : {}),
      },
    },
    {
      type: "input",
      block_id: INPUT.DATES.block,
      label: plain("Dates"),
      hint: plain(`Up to ${POLL_LIMITS.MAX_DAYS} dates, shown in ${input.tz}.`),
      element: {
        type: "multi_static_select",
        action_id: INPUT.DATES.action,
        max_selected_items: POLL_LIMITS.MAX_DAYS,
        placeholder: plain("Pick dates"),
        options: dates.map((d) => opt(dateLabel(d), d)),
      },
    },
    {
      type: "input",
      block_id: INPUT.FROM.block,
      label: plain("From"),
      element: {
        type: "static_select",
        action_id: INPUT.FROM.action,
        options: times,
        initial_option: find(POLL_LIMITS.DEFAULT_FROM_MINUTES),
      },
    },
    {
      type: "input",
      block_id: INPUT.TO.block,
      label: plain("To"),
      element: {
        type: "static_select",
        action_id: INPUT.TO.action,
        options: times,
        initial_option: find(POLL_LIMITS.DEFAULT_TO_MINUTES),
      },
    },
    {
      type: "input",
      block_id: INPUT.SLOT.block,
      label: plain("Slot length"),
      element: {
        type: "radio_buttons",
        action_id: INPUT.SLOT.action,
        options: SLOT_MINUTES.map((m) => opt(`${m} min`, String(m))),
        initial_option: opt(`${DEFAULT_SLOT_MINUTES} min`, String(DEFAULT_SLOT_MINUTES)),
      },
    },
    {
      type: "input",
      block_id: INPUT.CHANNEL.block,
      label: plain("Post to"),
      element: {
        type: "conversations_select",
        action_id: INPUT.CHANNEL.action,
        default_to_current_conversation: true,
        // Gives the submission a response_url for that channel, so we can reply ephemerally
        // even when the bot is not a member.
        response_url_enabled: true,
        filter: { include: ["public", "private"], exclude_bot_users: true },
        ...(input.channelId ? { initial_conversation: input.channelId } : {}),
      },
    },
  ];

  return {
    type: "modal",
    callback_id: CALLBACK_CREATE_POLL_MODAL,
    private_metadata: JSON.stringify({ channelId: input.channelId ?? null }),
    title: plain("New availability poll"),
    submit: plain("Post poll"),
    close: plain("Cancel"),
    blocks,
  };
}
