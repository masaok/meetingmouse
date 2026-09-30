import { z } from "zod";

import { POLL_LIMITS, SLOT_MINUTES, type SlotMinutes } from "@/domain/constants";
import { slotsPerDay } from "@/domain/slots";

/** block_id / action_id pairs of the create modal. Shared by blocks.ts and this parser. */
export const INPUT = {
  TITLE: { block: "title_block", action: "title" },
  DATES: { block: "dates_block", action: "dates" },
  FROM: { block: "from_block", action: "from" },
  TO: { block: "to_block", action: "to" },
  SLOT: { block: "slot_block", action: "slot" },
  CHANNEL: { block: "channel_block", action: "channel" },
} as const;

export interface CreatePollInput {
  title: string;
  /** yyyy-mm-dd in the creator's zone. */
  dates: string[];
  fromMinutes: number;
  toMinutes: number;
  slotMinutes: SlotMinutes;
  channelId: string;
}

export type ParseResult =
  { ok: true; value: CreatePollInput } | { ok: false; errors: Record<string, string> };

const option = z.object({ value: z.string() });
const StateSchema = z.object({
  [INPUT.TITLE.block]: z.object({
    [INPUT.TITLE.action]: z.object({ value: z.string().nullish() }),
  }),
  [INPUT.DATES.block]: z.object({
    [INPUT.DATES.action]: z.object({ selected_options: z.array(option).nullish() }),
  }),
  [INPUT.FROM.block]: z.object({
    [INPUT.FROM.action]: z.object({ selected_option: option.nullish() }),
  }),
  [INPUT.TO.block]: z.object({
    [INPUT.TO.action]: z.object({ selected_option: option.nullish() }),
  }),
  [INPUT.SLOT.block]: z.object({
    [INPUT.SLOT.action]: z.object({ selected_option: option.nullish() }),
  }),
  [INPUT.CHANNEL.block]: z.object({
    [INPUT.CHANNEL.action]: z.object({ selected_conversation: z.string().nullish() }),
  }),
});

const DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Parses `view.state.values` of the create modal. Errors are keyed by block_id so they can
 * be returned as `response_action: "errors"`.
 */
export function parseCreatePollSubmission(values: unknown): ParseResult {
  const state = StateSchema.safeParse(values);
  if (!state.success) {
    return {
      ok: false,
      errors: {
        [INPUT.TITLE.block]: "Something went wrong reading the form. Try again.",
      },
    };
  }
  const v = state.data;
  const errors: Record<string, string> = {};

  const title = (v[INPUT.TITLE.block][INPUT.TITLE.action].value ?? "").trim();
  if (!title) errors[INPUT.TITLE.block] = "Give the poll a title.";
  else if (title.length > POLL_LIMITS.MAX_TITLE_CHARS)
    errors[INPUT.TITLE.block] =
      `Keep the title under ${POLL_LIMITS.MAX_TITLE_CHARS} characters.`;

  const dates = [
    ...new Set(
      (v[INPUT.DATES.block][INPUT.DATES.action].selected_options ?? []).map(
        (o) => o.value,
      ),
    ),
  ]
    .filter((d) => DATE.test(d))
    .sort();
  if (dates.length === 0) errors[INPUT.DATES.block] = "Pick at least one date.";
  else if (dates.length > POLL_LIMITS.MAX_DAYS)
    errors[INPUT.DATES.block] = `Pick at most ${POLL_LIMITS.MAX_DAYS} dates.`;

  const fromMinutes = Number(
    v[INPUT.FROM.block][INPUT.FROM.action].selected_option?.value ?? NaN,
  );
  const toMinutes = Number(
    v[INPUT.TO.block][INPUT.TO.action].selected_option?.value ?? NaN,
  );
  const slotRaw = Number(
    v[INPUT.SLOT.block][INPUT.SLOT.action].selected_option?.value ?? NaN,
  );
  const slotMinutes = SLOT_MINUTES.find((m) => m === slotRaw);

  if (!Number.isFinite(fromMinutes)) errors[INPUT.FROM.block] = "Pick a start time.";
  if (!Number.isFinite(toMinutes)) errors[INPUT.TO.block] = "Pick an end time.";
  if (!slotMinutes) errors[INPUT.SLOT.block] = "Pick a slot length.";

  if (Number.isFinite(fromMinutes) && Number.isFinite(toMinutes) && slotMinutes) {
    if (toMinutes <= fromMinutes) {
      errors[INPUT.TO.block] = "End time must be after start time.";
    } else {
      const perDay = slotsPerDay(fromMinutes, toMinutes, slotMinutes);
      if (perDay === 0) errors[INPUT.TO.block] = "That window is shorter than one slot.";
      else if (perDay > POLL_LIMITS.MAX_SLOTS_PER_DAY)
        errors[INPUT.TO.block] =
          `That window has ${perDay} slots per day; the maximum is ${POLL_LIMITS.MAX_SLOTS_PER_DAY}. Shorten the window or use longer slots.`;
    }
  }

  const channelId =
    v[INPUT.CHANNEL.block][INPUT.CHANNEL.action].selected_conversation ?? "";
  if (!channelId) errors[INPUT.CHANNEL.block] = "Pick a channel to post the poll in.";

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return {
    ok: true,
    value: {
      title,
      dates,
      fromMinutes,
      toMinutes,
      slotMinutes: slotMinutes as SlotMinutes,
      channelId,
    },
  };
}
