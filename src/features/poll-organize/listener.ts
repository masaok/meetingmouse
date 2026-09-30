import type { App } from "@slack/bolt";

import { db } from "@/db/client";
import { deletePoll, getPoll, getPollSnapshot, setStatus } from "@/db/queries";
import type { Poll } from "@/domain/types";
import { log } from "@/lib/log";
import { refreshPollMessage } from "@/lib/refresh";
import { slackErrorCode } from "@/lib/respond";
import { epochSeconds } from "@/slack/format";
import {
  ACTION_GCAL_LINK,
  ACTION_ORGANIZER_MENU,
  CALLBACK_PICK_TIME_MODAL,
  ORGANIZER_MENU,
  type OrganizerMenuValue,
} from "@/slack/ids";

import { pickTimeModal, scheduledAnnouncement } from "./blocks";
import {
  parsePickSubmission,
  parsePrivateMetadata,
  PICK,
  pollIdFromBlockId,
} from "./schema";

export const ORGANIZER_ONLY = "Only the organizer can do that.";
export const ALREADY_SCHEDULED =
  "This poll is already scheduled. Delete it to start over.";

const MENU_VALUES = new Set<string>(Object.values(ORGANIZER_MENU));

export function register(app: App): void {
  app.action(ACTION_ORGANIZER_MENU, async ({ ack, action, body, client, respond }) => {
    await ack();
    if (action.type !== "overflow") return;
    const value = action.selected_option?.value;
    const pollId = pollIdFromBlockId(action.block_id);
    const userId = body.user.id;
    const triggerId = "trigger_id" in body ? body.trigger_id : undefined;
    if (!pollId || !value || !MENU_VALUES.has(value)) return;
    const choice = value as OrganizerMenuValue;
    const ephemeral = (text: string) =>
      respond({ response_type: "ephemeral", replace_original: false, text }).catch(
        () => undefined,
      );

    try {
      const poll = await getPoll(db, pollId);
      if (!poll) {
        await ephemeral("This poll no longer exists.");
        return;
      }
      if (poll.creatorId !== userId) {
        log.info({
          action: "organizer_denied",
          poll_id: pollId,
          user_id: userId,
          choice,
        });
        await ephemeral(ORGANIZER_ONLY);
        return;
      }
      if (poll.status === "scheduled" && choice !== ORGANIZER_MENU.DELETE) {
        await ephemeral(ALREADY_SCHEDULED);
        return;
      }

      switch (choice) {
        case ORGANIZER_MENU.PICK: {
          if (!triggerId) return;
          const snapshot = await getPollSnapshot(db, pollId);
          if (!snapshot) return;
          await client.views.open({
            trigger_id: triggerId,
            view: pickTimeModal(snapshot),
          });
          log.info({ action: "pick_time_opened", poll_id: pollId, user_id: userId });
          return;
        }
        case ORGANIZER_MENU.CLOSE: {
          await setStatus(db, pollId, "closed");
          const refresh = await refreshPollMessage(db, client, pollId);
          log.info({ action: "poll_closed", poll_id: pollId, user_id: userId, refresh });
          return;
        }
        case ORGANIZER_MENU.DELETE: {
          await deleteMessage(client, poll);
          await deletePoll(db, pollId);
          log.info({ action: "poll_deleted", poll_id: pollId, user_id: userId });
          return;
        }
      }
    } catch (error) {
      const code = slackErrorCode(error);
      log.error({
        action: "organizer_action_failed",
        poll_id: pollId,
        user_id: userId,
        choice,
        code,
      });
      await ephemeral(`Something went wrong (\`${code}\`). Please try again.`);
    }
  });

  app.view(CALLBACK_PICK_TIME_MODAL, async ({ ack, view, body, client }) => {
    const meta = parsePrivateMetadata(view.private_metadata);
    const userId = body.user.id;
    const errors = (text: string) =>
      ack({ response_action: "errors", errors: { [PICK.block]: text } });
    if (!meta) {
      await errors("This poll no longer exists.");
      return;
    }
    const snapshot = await getPollSnapshot(db, meta.pollId);
    if (!snapshot) {
      await errors("This poll no longer exists.");
      return;
    }
    if (snapshot.poll.creatorId !== userId) {
      log.info({
        action: "organizer_denied",
        poll_id: meta.pollId,
        user_id: userId,
        choice: "pick_submit",
      });
      await errors(ORGANIZER_ONLY);
      return;
    }
    if (snapshot.poll.status === "scheduled") {
      await errors(ALREADY_SCHEDULED);
      return;
    }
    const start = parsePickSubmission(view.state.values);
    const known = new Set(snapshot.slots.map(epochSeconds));
    if (!start || !known.has(epochSeconds(start))) {
      await errors("Pick one of the listed times.");
      return;
    }
    await ack();

    try {
      await setStatus(db, meta.pollId, "scheduled", start);
      const refresh = await refreshPollMessage(db, client, meta.pollId);
      if (snapshot.poll.messageTs) {
        await client.chat.postMessage({
          channel: snapshot.poll.channelId,
          thread_ts: snapshot.poll.messageTs,
          text: scheduledAnnouncement(snapshot, start),
          unfurl_links: false,
        });
      }
      log.info({
        action: "poll_scheduled",
        poll_id: meta.pollId,
        user_id: userId,
        final_slot_start: start.toISOString(),
        refresh,
      });
    } catch (error) {
      const code = slackErrorCode(error);
      log.error({
        action: "poll_schedule_failed",
        poll_id: meta.pollId,
        user_id: userId,
        code,
      });
      await client.chat
        .postEphemeral({
          channel: snapshot.poll.channelId,
          user: userId,
          text: `Something went wrong scheduling the poll (\`${code}\`). Please try again.`,
        })
        .catch(() => undefined);
    }
  });

  // URL buttons still send an action; Slack expects an ack.
  app.action(ACTION_GCAL_LINK, async ({ ack }) => {
    await ack();
  });
}

/** Delete the poll message; a message already gone by hand is fine. */
async function deleteMessage(
  client: {
    chat: { delete: (args: { channel: string; ts: string }) => Promise<unknown> };
  },
  poll: Poll,
): Promise<void> {
  if (!poll.messageTs) return;
  try {
    await client.chat.delete({ channel: poll.channelId, ts: poll.messageTs });
  } catch (error) {
    if (slackErrorCode(error) !== "message_not_found") throw error;
    log.warn({
      action: "poll_message_gone",
      poll_id: poll.id,
      channel_id: poll.channelId,
    });
  }
}
