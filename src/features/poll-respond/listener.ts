import type { App } from "@slack/bolt";
import type { ModalView } from "@slack/types";
import type { WebClient } from "@slack/web-api";

import { db } from "@/db/client";
import { getPollSnapshot, getUserAvailability, saveResponse } from "@/db/queries";
import { tally } from "@/domain/tally";
import type { Feature, FeatureContext } from "@/features/types";
import { log } from "@/lib/log";
import { refreshPollMessage } from "@/lib/refresh";
import { slackErrorCode } from "@/lib/respond";
import { getUserProfile } from "@/lib/users";
import { epochSeconds } from "@/slack/format";
import {
  ACTION_GRID_LINK,
  ACTION_RESPOND_BUTTON,
  CALLBACK_RESPOND_MODAL,
} from "@/slack/ids";

import { loadingView, respondModal, unavailableReason, unavailableView } from "./blocks";
import { parsePrivateMetadata, parseRespondSubmission, RESPOND } from "./schema";

type ViewUpdate = (view: ModalView) => Promise<unknown>;
type Respond = (message: {
  response_type: "ephemeral";
  replace_original: false;
  text: string;
}) => Promise<unknown>;

interface Opening {
  pollId: string;
  userId: string;
  teamId: string;
  client: WebClient;
  update: ViewUpdate;
  respond?: Respond;
  /** The viewer's link to the web grid, when the host serves one. */
  gridUrl?: string;
}

/** Fetch, then swap the loading view for the checkbox form. */
async function showRespondView(opening: Opening): Promise<void> {
  const { pollId, userId, teamId, client, update, respond, gridUrl } = opening;
  try {
    const snapshot = await getPollSnapshot(db, pollId);
    if (!snapshot) {
      await update(unavailableView("missing"));
      return;
    }
    if (snapshot.poll.status !== "open") {
      await update(unavailableView(unavailableReason(snapshot.poll.status)));
      return;
    }
    const [profile, selected] = await Promise.all([
      getUserProfile(db, client, teamId, userId),
      getUserAvailability(db, pollId, userId),
    ]);
    const noneSelected =
      selected.length === 0 && snapshot.participants.some((p) => p.userId === userId);
    await update(
      respondModal({
        poll: snapshot.poll,
        slots: snapshot.slots,
        tz: profile.tz,
        selected,
        noneSelected,
        counts: new Map(
          tally(snapshot.slots, snapshot.availability).map((t) => [
            epochSeconds(t.slot),
            t.count,
          ]),
        ),
        responded: snapshot.participants.length,
        gridUrl,
      }),
    );
    log.info({
      action: "respond_modal_opened",
      poll_id: pollId,
      user_id: userId,
      tz: profile.tz,
    });
  } catch (error) {
    const code = slackErrorCode(error);
    log.error({
      action: "respond_modal_failed",
      poll_id: pollId,
      user_id: userId,
      code,
    });
    await update(unavailableView("error")).catch(() => undefined);
    await respond?.({
      response_type: "ephemeral",
      replace_original: false,
      text: `Something went wrong opening the poll (\`${code}\`).`,
    }).catch(() => undefined);
  }
}

export function register(app: App, context: FeatureContext = {}): void {
  const { grid } = context;

  app.action(ACTION_RESPOND_BUTTON, async ({ ack, action, body, client, respond }) => {
    await ack();
    const pollId = action.type === "button" ? action.value : undefined;
    const userId = body.user.id;
    const teamId = body.team?.id ?? "";
    const triggerId = "trigger_id" in body ? body.trigger_id : undefined;
    if (!pollId || !triggerId) return;

    // Consume the trigger_id immediately; everything after can take longer than 3 s.
    const opened = await client.views.open({
      trigger_id: triggerId,
      view: loadingView(),
    });
    const viewId = opened.view?.id;
    if (!viewId) return;
    await showRespondView({
      pollId,
      userId,
      teamId,
      client,
      respond,
      update: (view) => client.views.update({ view_id: viewId, view }),
      gridUrl: grid?.urlFor({ pollId, teamId, userId }),
    });
  });

  // A URL button still sends an action; it only needs the ack.
  app.action(ACTION_GRID_LINK, async ({ ack }) => {
    await ack();
  });

  // The form's checkboxes sit in actions blocks, so every tick is reported. The answer is read
  // from the view's state on Save; a tick only needs the ack.
  for (const actionId of [RESPOND.SLOTS_ACTION, RESPOND.NONE_ACTION])
    app.action(actionId, async ({ ack }) => {
      await ack();
    });

  app.view(CALLBACK_RESPOND_MODAL, async ({ ack, view, body, client }) => {
    const meta = parsePrivateMetadata(view.private_metadata);
    if (!meta) {
      await ack({ response_action: "update", view: unavailableView("missing") });
      return;
    }
    const userId = body.user.id;
    const teamId = body.team?.id ?? view.team_id;
    // Before ack on purpose: a closed poll must answer as the ack itself (rule 6's one exception).
    const snapshot = await getPollSnapshot(db, meta.pollId);
    if (!snapshot) {
      await ack({ response_action: "update", view: unavailableView("missing") });
      return;
    }
    if (snapshot.poll.status !== "open") {
      await ack({
        response_action: "update",
        view: unavailableView(unavailableReason(snapshot.poll.status)),
      });
      return;
    }
    await ack();

    const submission = parseRespondSubmission(view.state.values);
    const known = new Set(snapshot.slots.map(epochSeconds));
    const slots = submission.slots.filter((s) => known.has(epochSeconds(s)));

    try {
      const profile = await getUserProfile(db, client, teamId, userId);
      await saveResponse(db, {
        pollId: meta.pollId,
        userId,
        tz: profile.tz,
        displayName: profile.displayName,
        slots,
      });
      const result = await refreshPollMessage(db, client, meta.pollId);
      log.info({
        action: "response_saved",
        poll_id: meta.pollId,
        user_id: userId,
        slots: slots.length,
        none: submission.none,
        refresh: result,
      });
    } catch (error) {
      const code = slackErrorCode(error);
      log.error({
        action: "response_save_failed",
        poll_id: meta.pollId,
        user_id: userId,
        code,
      });
      await client.chat
        .postEphemeral({
          channel: snapshot.poll.channelId,
          user: userId,
          text: `Your availability was not saved (\`${code}\`). Please try again.`,
        })
        .catch(() => undefined);
    }
  });
}

export const feature: Feature = { name: "poll-respond", register };
