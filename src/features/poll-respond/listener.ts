import type { App } from "@slack/bolt";
import type { ModalView } from "@slack/types";
import type { WebClient } from "@slack/web-api";

import { db } from "@/db/client";
import {
  getPollSnapshot,
  getUserAvailability,
  removeResponse,
  saveResponse,
  toggleSlot,
} from "@/db/queries";
import type { PollSnapshot } from "@/domain/types";
import type { Feature, FeatureContext } from "@/features/types";
import { log } from "@/lib/log";
import { refreshPollMessage } from "@/lib/refresh";
import { slackErrorCode } from "@/lib/respond";
import { getUserProfile, type UserProfile } from "@/lib/users";
import { epochSeconds } from "@/slack/format";
import { ACTION_GRID_LINK, ACTION_RESPOND_BUTTON, ACTION_TOGGLE_NONE } from "@/slack/ids";

import { loadingView, respondModal, unavailableReason, unavailableView } from "./blocks";
import { parsePrivateMetadata, parseSlotValue, SLOT_ACTION } from "./schema";

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

/** Fetch, then swap the loading view for the form. */
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

/** A click inside the open form, as Bolt hands it to an action listener. */
interface FormClick {
  body: { user: { id: string }; team?: { id: string } | null; view?: unknown };
  client: WebClient;
}

/** What a click did to the responder's answer. `answered` is false once it is withdrawn. */
type Change = (
  snapshot: PollSnapshot,
  who: { userId: string; profile: UserProfile },
) => Promise<{ answered: boolean; what: string } | null>;

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

  /**
   * Every click in the form is its own save: apply the change, redraw the view from what the
   * database now holds, then re-render the channel message. Slack has already been acked.
   */
  async function applyClick({ body, client }: FormClick, change: Change): Promise<void> {
    const view = body.view as { id?: string; private_metadata?: string } | undefined;
    const meta = parsePrivateMetadata(view?.private_metadata);
    const viewId = view?.id;
    if (!meta || !viewId) return;
    const { pollId } = meta;
    const userId = body.user.id;
    const teamId = body.team?.id ?? "";
    const update: ViewUpdate = (next) =>
      client.views.update({ view_id: viewId, view: next });
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
      const profile = await getUserProfile(db, client, teamId, userId);
      const done = await change(snapshot, { userId, profile });
      if (!done) return;
      const selected = await getUserAvailability(db, pollId, userId);
      await update(
        respondModal({
          poll: snapshot.poll,
          slots: snapshot.slots,
          tz: profile.tz,
          selected,
          noneSelected: done.answered && selected.length === 0,
          gridUrl: grid?.urlFor({ pollId, teamId, userId }),
        }),
      );
      const refresh = await refreshPollMessage(db, client, pollId);
      log.info({
        action: "response_saved",
        poll_id: pollId,
        user_id: userId,
        change: done.what,
        slots: selected.length,
        refresh,
      });
    } catch (error) {
      const code = slackErrorCode(error);
      log.error({
        action: "response_save_failed",
        poll_id: pollId,
        user_id: userId,
        code,
      });
      await update(unavailableView("error")).catch(() => undefined);
    }
  }

  app.action(SLOT_ACTION, async ({ ack, action, body, client }) => {
    await ack();
    const slot = parseSlotValue(action.type === "button" ? action.value : undefined);
    await applyClick({ body, client }, async (snapshot, { userId, profile }) => {
      // A button from a form opened before the poll was recreated names a slot that is gone.
      if (!slot || !snapshot.slots.some((s) => epochSeconds(s) === epochSeconds(slot)))
        return null;
      await toggleSlot(db, { pollId: snapshot.poll.id, userId, ...profile, slot });
      return { answered: true, what: "toggle_slot" };
    });
  });

  app.action(ACTION_TOGGLE_NONE, async ({ ack, body, client }) => {
    await ack();
    await applyClick({ body, client }, async (snapshot, { userId, profile }) => {
      const pollId = snapshot.poll.id;
      const none =
        snapshot.participants.some((p) => p.userId === userId) &&
        !snapshot.availability.some((a) => a.userId === userId);
      if (none) {
        await removeResponse(db, pollId, userId);
        return { answered: false, what: "withdraw" };
      }
      await saveResponse(db, { pollId, userId, ...profile, slots: [] });
      return { answered: true, what: "none" };
    });
  });
}

export const feature: Feature = { name: "poll-respond", register };
