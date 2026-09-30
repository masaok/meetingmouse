import { z } from "zod";

/** block_id / action_id of the pick-time modal. Shared by blocks.ts and this parser. */
export const PICK = { block: "slot_block", action: "slot" } as const;

const BLOCK_PREFIX = "poll_actions_";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The poll message's actions block is `poll_actions_<pollId>`; recover the id, or null. */
export function pollIdFromBlockId(blockId: string | undefined): string | null {
  if (!blockId?.startsWith(BLOCK_PREFIX)) return null;
  const id = blockId.slice(BLOCK_PREFIX.length);
  return UUID.test(id) ? id : null;
}

const MetadataSchema = z.object({ pollId: z.string().uuid() });

export function parsePrivateMetadata(raw: string | undefined): { pollId: string } | null {
  try {
    const parsed = MetadataSchema.safeParse(JSON.parse(raw ?? ""));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

const StateSchema = z.object({
  [PICK.block]: z.object({
    [PICK.action]: z.object({
      selected_option: z.object({ value: z.string() }).nullish(),
    }),
  }),
});

/** Selected slot start (UTC) from the pick-time modal, or null when nothing usable was chosen. */
export function parsePickSubmission(values: unknown): Date | null {
  const state = StateSchema.safeParse(values);
  if (!state.success) return null;
  const raw = state.data[PICK.block][PICK.action].selected_option?.value;
  const seconds = Number(raw);
  if (!Number.isInteger(seconds) || seconds <= 0) return null;
  return new Date(seconds * 1000);
}
