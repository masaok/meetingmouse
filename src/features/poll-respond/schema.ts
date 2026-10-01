import { z } from "zod";

/** block_id / action_id conventions of the respond modal. Shared by blocks.ts and this parser. */
export const RESPOND = {
  /** `day_<yyyy-mm-dd>_<chunk>` actions blocks, checkboxes with action `slots`, value = epoch seconds. */
  DAY_PREFIX: "day_",
  SLOTS_ACTION: "slots",
  NONE_BLOCK: "none_block",
  NONE_ACTION: "none",
  NONE_VALUE: "none",
} as const;

export const dayBlockId = (localDate: string, chunk: number): string =>
  `${RESPOND.DAY_PREFIX}${localDate}_${chunk}`;

export interface RespondSubmission {
  /** Selected slot starts (UTC). Empty when "none of these" was checked or nothing was ticked. */
  slots: Date[];
  none: boolean;
}

const option = z.object({ value: z.string() });
const Checkboxes = z.object({ selected_options: z.array(option).nullish() });
const StateSchema = z.record(z.string(), z.record(z.string(), Checkboxes.passthrough()));

const MetadataSchema = z.object({ pollId: z.string().uuid() });

export function parsePrivateMetadata(raw: string | undefined): { pollId: string } | null {
  try {
    const parsed = MetadataSchema.safeParse(JSON.parse(raw ?? ""));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

/** Parses `view.state.values` of the respond modal. Unknown blocks are ignored. */
export function parseRespondSubmission(values: unknown): RespondSubmission {
  const state = StateSchema.safeParse(values);
  if (!state.success) return { slots: [], none: false };
  const seconds = new Set<number>();
  let none = false;
  for (const [blockId, actions] of Object.entries(state.data)) {
    if (blockId === RESPOND.NONE_BLOCK) {
      none = (actions[RESPOND.NONE_ACTION]?.selected_options ?? []).some(
        (o) => o.value === RESPOND.NONE_VALUE,
      );
      continue;
    }
    if (!blockId.startsWith(RESPOND.DAY_PREFIX)) continue;
    for (const o of actions[RESPOND.SLOTS_ACTION]?.selected_options ?? []) {
      const n = Number(o.value);
      if (Number.isInteger(n) && n > 0) seconds.add(n);
    }
  }
  if (none) return { slots: [], none: true };
  return {
    slots: [...seconds].sort((a, b) => a - b).map((s) => new Date(s * 1000)),
    none: false,
  };
}
