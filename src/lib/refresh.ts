import type { WebClient } from "@slack/web-api";

import type { Db } from "@/db/queries";
import { getPollSnapshot } from "@/db/queries";
import { renderPollMessage } from "@/slack/pollMessage";

import { log } from "./log";
import { slackErrorCode } from "./respond";

/** The only Slack method this helper needs; keeps fakes small. */
export type ChatUpdater = { chat: Pick<WebClient["chat"], "update"> };

export type RefreshResult = "updated" | "no_poll" | "no_message" | "message_gone";

/**
 * Re-render the poll message from fresh aggregates and `chat.update` it in place.
 * Reads happen after the caller's write committed, so concurrent submits converge on
 * complete data (last writer wins on the update, but every render is complete).
 * A message deleted by hand (`message_not_found`) is logged, not thrown.
 */
export async function refreshPollMessage(
  db: Db,
  client: ChatUpdater,
  pollId: string,
): Promise<RefreshResult> {
  const snapshot = await getPollSnapshot(db, pollId);
  if (!snapshot) return "no_poll";
  const { poll } = snapshot;
  if (!poll.messageTs) return "no_message";
  const message = renderPollMessage(snapshot);
  try {
    await client.chat.update({
      channel: poll.channelId,
      ts: poll.messageTs,
      text: message.text,
      blocks: message.blocks,
    });
    return "updated";
  } catch (error) {
    const code = slackErrorCode(error);
    if (code === "message_not_found") {
      log.warn({
        action: "poll_message_gone",
        poll_id: pollId,
        channel_id: poll.channelId,
      });
      return "message_gone";
    }
    throw error;
  }
}
