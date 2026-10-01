import type { App } from "@slack/bolt";

import { db } from "@/db/client";
import { createPoll, deletePoll, setMessageTs } from "@/db/queries";
import { generateSlots } from "@/domain/slots";
import type { Feature } from "@/features/types";
import { log } from "@/lib/log";
import { respondViaUrl, slackErrorCode } from "@/lib/respond";
import { getUserProfile } from "@/lib/users";
import { CALLBACK_CREATE_POLL_MODAL, COMMANDS, SHORTCUT_CREATE_POLL } from "@/slack/ids";
import { renderPollMessage } from "@/slack/pollMessage";

import { createPollModal } from "./blocks";
import { parseCreatePollSubmission } from "./schema";

export const INVITE_HINT =
  "I can't post in that channel yet. Invite me with `/invite @Meeting Mouse` and run `/meet` again.";

export const DM_HINT =
  "I can't post a poll in a direct message. Run `/meet` in a channel instead.";

/** The answer to `/meet help`. Plain words for what exists today; see README "How it works". */
export const HELP_TEXT = [
  "*Meeting Mouse finds a time that works for everyone.*",
  "• `/meet [title]` opens a form to start an availability poll in a channel. The title is optional: `/meet Sprint planning` fills it in, and plain `/meet` leaves it for you to type. `/mouse` and `/when` do the same.",
  "• The *Find a meeting time* shortcut, in Slack's search bar under Shortcuts, opens the same form.",
  "• I post one poll message in the channel. Each person clicks *Add my availability* and clicks the times that work, shown in their own time zone. Each click saves, and the message updates with who is free when.",
  "• The organizer picks a time from the poll's menu, and the thread gets an Add to Google Calendar link.",
].join("\n");

/** Exactly the word "help", any case, surrounding whitespace ignored. A longer title is a title. */
const isHelpRequest = (text: string): boolean => text.trim().toLowerCase() === "help";

/** A 1:1 or group DM. The bot cannot post there and the modal's channel picker excludes both. */
const isDirectMessage = (command: {
  channel_id: string;
  channel_name: string;
}): boolean =>
  command.channel_id.startsWith("D") ||
  command.channel_name === "directmessage" ||
  command.channel_name.startsWith("mpdm-");

function registerCommand(app: App, name: (typeof COMMANDS)[number]): void {
  app.command(name, async ({ ack, command, client }) => {
    if (isHelpRequest(command.text)) {
      // Before the DM check: usage is worth reading wherever it was asked for.
      await ack(HELP_TEXT);
      log.info({
        action: "when_command_help",
        command: name,
        user_id: command.user_id,
        channel_id: command.channel_id,
      });
      return;
    }
    if (isDirectMessage(command)) {
      // The ack itself carries the reply: Slack shows a command's ack text ephemerally.
      await ack(DM_HINT);
      log.info({
        action: "when_command_dm",
        command: name,
        user_id: command.user_id,
        channel_id: command.channel_id,
      });
      return;
    }
    await ack();
    const profile = await getUserProfile(db, client, command.team_id, command.user_id);
    await client.views.open({
      trigger_id: command.trigger_id,
      view: createPollModal({
        title: command.text.trim() || undefined,
        channelId: command.channel_id,
        tz: profile.tz,
        now: new Date(),
      }),
    });
    log.info({
      action: "when_command",
      command: name,
      user_id: command.user_id,
      channel_id: command.channel_id,
    });
  });
}

export function register(app: App): void {
  // `/meet` and its aliases open the same form.
  for (const name of COMMANDS) registerCommand(app, name);

  app.shortcut(SHORTCUT_CREATE_POLL, async ({ ack, shortcut, client }) => {
    await ack();
    const teamId = shortcut.team?.id ?? "";
    const profile = await getUserProfile(db, client, teamId, shortcut.user.id);
    await client.views.open({
      trigger_id: shortcut.trigger_id,
      view: createPollModal({ tz: profile.tz, now: new Date() }),
    });
    log.info({ action: "create_poll_shortcut", user_id: shortcut.user.id });
  });

  app.view(CALLBACK_CREATE_POLL_MODAL, async ({ ack, view, body, client }) => {
    const parsed = parseCreatePollSubmission(view.state.values);
    if (!parsed.ok) {
      await ack({ response_action: "errors", errors: parsed.errors });
      return;
    }
    await ack();

    const input = parsed.value;
    const teamId = body.team?.id ?? view.team_id;
    const userId = body.user.id;
    // Present when a conversations_select has response_url_enabled; not in Bolt's type yet.
    const responseUrls = (
      body as { response_urls?: { channel_id: string; response_url: string }[] }
    ).response_urls;
    const responseUrl = responseUrls?.find(
      (r) => r.channel_id === input.channelId,
    )?.response_url;
    const notify = async (text: string) => {
      if (responseUrl) await respondViaUrl(responseUrl, text);
      else
        await client.chat
          .postEphemeral({ channel: input.channelId, user: userId, text })
          .catch(() => undefined);
    };

    const profile = await getUserProfile(db, client, teamId, userId);
    const slots = generateSlots({ ...input, tz: profile.tz });
    if (slots.length === 0) {
      await notify(
        "No usable time slots in that window (a DST change may have removed them). Try different times.",
      );
      return;
    }

    const poll = await createPoll(db, {
      teamId,
      channelId: input.channelId,
      creatorId: userId,
      title: input.title,
      creatorTz: profile.tz,
      slotMinutes: input.slotMinutes,
      slots,
    });

    try {
      const message = renderPollMessage({
        poll,
        slots,
        participants: [],
        availability: [],
      });
      const posted = await client.chat.postMessage({
        channel: input.channelId,
        text: message.text,
        blocks: message.blocks,
        unfurl_links: false,
      });
      if (!posted.ts) throw new Error("chat.postMessage returned no ts");
      await setMessageTs(db, poll.id, posted.ts);
      log.info({
        action: "poll_created",
        poll_id: poll.id,
        user_id: userId,
        channel_id: input.channelId,
        slots: slots.length,
      });
    } catch (error) {
      await deletePoll(db, poll.id);
      const code = slackErrorCode(error);
      log.error({
        action: "poll_create_failed",
        poll_id: poll.id,
        user_id: userId,
        code,
      });
      if (code === "not_in_channel" || code === "channel_not_found")
        await notify(INVITE_HINT);
      else
        await notify(
          `Something went wrong posting the poll (\`${code}\`). Please try again.`,
        );
    }
  });
}

export const feature: Feature = { name: "poll-create", register };
