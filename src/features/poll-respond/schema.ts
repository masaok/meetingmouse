import { z } from "zod";

import { ACTION_TOGGLE_SLOT } from "@/slack/ids";

/** `day_<yyyy-mm-dd>_<chunk>`: the block of time buttons for one local day. */
export const dayBlockId = (localDate: string, chunk: number): string =>
  `day_${localDate}_${chunk}`;

/** A time button's action id. Slack wants each one in a block to differ, so it names the slot. */
export const slotActionId = (epochSeconds: number): string =>
  `${ACTION_TOGGLE_SLOT}:${epochSeconds}`;

/** Matches every `slotActionId`. */
export const SLOT_ACTION = new RegExp(`^${ACTION_TOGGLE_SLOT}:\\d+$`);

const MetadataSchema = z.object({ pollId: z.string().uuid() });

export function parsePrivateMetadata(raw: string | undefined): { pollId: string } | null {
  try {
    const parsed = MetadataSchema.safeParse(JSON.parse(raw ?? ""));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

/** The slot a time button stands for, from its `value`. Null for anything but epoch seconds. */
export function parseSlotValue(value: string | undefined): Date | null {
  const seconds = Number(value);
  return value && Number.isInteger(seconds) && seconds > 0
    ? new Date(seconds * 1000)
    : null;
}
