import type { App } from "@slack/bolt";

import { db } from "@/db/client";
import { listPollsForUser } from "@/db/queries";
import type { Poll } from "@/domain/types";
import type { Feature, FeatureContext } from "@/features/types";
import { log } from "@/lib/log";
import { slackErrorCode } from "@/lib/respond";
import { EVENT_APP_HOME_OPENED } from "@/slack/ids";

import { HOME_LIST_LIMIT, homeView, type HomeItem } from "./blocks";

type PermalinkClient = {
  chat: {
    getPermalink: (args: {
      channel: string;
      message_ts: string;
    }) => Promise<{ permalink?: string }>;
  };
};

/** Resolve permalinks for the first few polls; a failure omits the link rather than the poll. */
export async function withPermalinks(
  client: PermalinkClient,
  polls: Poll[],
): Promise<HomeItem[]> {
  return Promise.all(
    polls.slice(0, HOME_LIST_LIMIT).map(async (poll): Promise<HomeItem> => {
      if (!poll.messageTs) return { poll };
      try {
        const res = await client.chat.getPermalink({
          channel: poll.channelId,
          message_ts: poll.messageTs,
        });
        return { poll, permalink: res.permalink };
      } catch (error) {
        log.warn({
          action: "permalink_failed",
          poll_id: poll.id,
          code: slackErrorCode(error),
        });
        return { poll };
      }
    }),
  );
}

export function register(app: App, context: FeatureContext = {}): void {
  const { supportUrl } = context;
  app.event(EVENT_APP_HOME_OPENED, async ({ event, body, client }) => {
    if (event.tab !== "home") return;
    const userId = event.user;
    const teamId = body.team_id;
    try {
      const lists = await listPollsForUser(db, teamId, userId);
      const [organized, responded] = await Promise.all([
        withPermalinks(client, lists.organized),
        withPermalinks(client, lists.responded),
      ]);
      await client.views.publish({
        user_id: userId,
        view: homeView({ organized, responded, supportUrl }),
      });
      log.info({
        action: "home_published",
        user_id: userId,
        organized: lists.organized.length,
        responded: lists.responded.length,
      });
    } catch (error) {
      log.error({
        action: "home_publish_failed",
        user_id: userId,
        code: slackErrorCode(error),
      });
    }
  });
}

export const feature: Feature = { name: "app-home", register };
