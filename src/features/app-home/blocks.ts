import type { HomeView, KnownBlock } from "@slack/types";

import { formatInTz } from "@/domain/slots";
import type { Poll } from "@/domain/types";
import { channelMention, dateToken, escapeMrkdwn, truncate } from "@/slack/format";
import { SLACK_LIMITS } from "@/slack/limits";

export interface HomeItem {
  poll: Poll;
  permalink?: string;
}

export interface HomeInput {
  organized: HomeItem[];
  responded: HomeItem[];
}

/** Each list shows at most this many polls, so the view stays far under the block cap. */
export const HOME_LIST_LIMIT = 10;

const plain = (text: string) => ({ type: "plain_text" as const, text, emoji: true });

function status(poll: Poll): string {
  switch (poll.status) {
    case "open":
      return "🟢 Open";
    case "closed":
      return "🔒 Closed";
    case "scheduled":
      return poll.finalSlotStart
        ? `✅ Scheduled for ${dateToken(
            poll.finalSlotStart,
            "{date_short_pretty} {time}",
            formatInTz(poll.finalSlotStart, poll.creatorTz, "EEE, MMM d h:mm a"),
          )}`
        : "✅ Scheduled";
  }
}

function item({ poll, permalink }: HomeItem): KnownBlock {
  const title = escapeMrkdwn(truncate(poll.title, 80));
  const heading = permalink ? `📅 *<${permalink}|${title}>*` : `📅 *${title}*`;
  return {
    type: "section",
    text: {
      type: "mrkdwn",
      text: `${heading}\n${status(poll)} · ${channelMention(poll.channelId)}`,
    },
  };
}

function list(heading: string, items: HomeItem[], empty: string): KnownBlock[] {
  const blocks: KnownBlock[] = [{ type: "header", text: plain(heading) }];
  if (items.length === 0) {
    blocks.push({ type: "context", elements: [{ type: "mrkdwn", text: empty }] });
    return blocks;
  }
  for (const it of items.slice(0, HOME_LIST_LIMIT)) blocks.push(item(it));
  if (items.length > HOME_LIST_LIMIT) {
    blocks.push({
      type: "context",
      elements: [{ type: "mrkdwn", text: `…and ${items.length - HOME_LIST_LIMIT} more` }],
    });
  }
  return blocks;
}

export function homeView(input: HomeInput): HomeView {
  const blocks: KnownBlock[] = [
    { type: "header", text: plain("Meeting Mouse") },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: "Run `/meet` in any channel to start an availability poll. Everyone marks when they're free in their own time zone, and the message updates live.",
      },
    },
    { type: "divider" },
    ...list(
      "Polls you organized",
      input.organized,
      "You haven't started a poll yet. Try `/meet Sprint planning`.",
    ),
    { type: "divider" },
    ...list(
      "Polls you responded to",
      input.responded,
      "Nothing yet. When someone posts a poll, click *Add my availability*.",
    ),
  ];
  if (blocks.length > SLACK_LIMITS.BLOCKS_PER_MODAL) {
    throw new Error(
      `home view has ${blocks.length} blocks; limit is ${SLACK_LIMITS.BLOCKS_PER_MODAL}`,
    );
  }
  return { type: "home", blocks };
}
