import type { ModalView, PlainTextOption } from "@slack/types";

import { POLL_LIMITS } from "@/domain/constants";
import { gcalUrl } from "@/domain/gcal";
import { formatInTz, slotEnd } from "@/domain/slots";
import { bestTimes, tally } from "@/domain/tally";
import type { PollSnapshot } from "@/domain/types";
import { dateToken, epochSeconds, truncate, userMention } from "@/slack/format";
import { CALLBACK_PICK_TIME_MODAL } from "@/slack/ids";
import { SLACK_LIMITS } from "@/slack/limits";

import { PICK } from "./schema";

const plain = (text: string) => ({ type: "plain_text" as const, text, emoji: true });

/**
 * Candidates for the final time: the best slots by count, or the first slots when nobody has
 * responded yet. Labels are in the organizer's zone; the value is the slot's epoch seconds.
 */
export function pickCandidates(snapshot: PollSnapshot): PlainTextOption[] {
  const { poll, slots, participants, availability } = snapshot;
  const total = participants.length;
  const best = bestTimes(tally(slots, availability), POLL_LIMITS.PICK_CANDIDATES);
  const candidates =
    best.length > 0
      ? best
      : slots.slice(0, POLL_LIMITS.PICK_CANDIDATES).map((slot) => ({ slot, count: 0 }));
  return candidates.map(({ slot, count }) => ({
    text: plain(
      truncate(
        `${formatInTz(slot, poll.creatorTz, "EEE, MMM d h:mm a")} — ${count}/${total}`,
        SLACK_LIMITS.OPTION_TEXT_CHARS,
      ),
    ),
    value: String(epochSeconds(slot)),
  }));
}

export function pickTimeModal(snapshot: PollSnapshot): ModalView {
  const { poll } = snapshot;
  return {
    type: "modal",
    callback_id: CALLBACK_PICK_TIME_MODAL,
    private_metadata: JSON.stringify({ pollId: poll.id }),
    title: plain("Pick the final time"),
    submit: plain("Schedule"),
    close: plain("Cancel"),
    blocks: [
      {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: `Times in *${poll.creatorTz}*. Counts are people free out of ${snapshot.participants.length} responded.`,
          },
        ],
      },
      {
        type: "input",
        block_id: PICK.block,
        label: plain("Final time"),
        element: {
          type: "static_select",
          action_id: PICK.action,
          placeholder: plain("Choose a slot"),
          options: pickCandidates(snapshot),
        },
      },
    ],
  };
}

const MAX_MENTIONS = 30;

/** Thread reply announcing the scheduled time, with a Google Calendar link. */
export function scheduledAnnouncement(snapshot: PollSnapshot, start: Date): string {
  const { poll, participants } = snapshot;
  const end = slotEnd(start, poll.slotMinutes);
  const named = participants.slice(0, MAX_MENTIONS).map((p) => userMention(p.userId));
  const more = participants.length - named.length;
  const who =
    named.length > 0 ? `${named.join(" ")}${more > 0 ? ` +${more} more` : ""} ` : "";
  const when = dateToken(
    start,
    "{date_short_pretty} {time}",
    formatInTz(start, poll.creatorTz, "EEE, MMM d h:mm a zzz"),
  );
  const link = gcalUrl({ title: poll.title, start, end });
  return `${who}📅 *${poll.title}* is scheduled for ${when}.\n<${link}|Add to Google Calendar>`;
}
