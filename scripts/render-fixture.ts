/**
 * Print the block JSON for a fixture poll, plus the numbers that matter against Slack limits.
 * Paste the JSON into https://app.slack.com/block-kit-builder to see it.
 *
 *   pnpm render:fixture three-day
 *   pnpm render:fixture worst-case --stats
 *   pnpm render:fixture three-day --modal respond   # the availability form for that poll
 *   pnpm render:fixture three-day --modal create    # the create form, titled like that poll
 */
import { createPollModal } from "../src/features/poll-create/blocks";
import { respondModal } from "../src/features/poll-respond/blocks";
import {
  fixture,
  FIXTURE_NAMES,
  FIXTURE_NOW,
  FIXTURE_TZ,
  type FixtureName,
} from "../src/slack/fixtures";
import { messageStats, renderPollMessage } from "../src/slack/pollMessage";

const MODALS = ["respond", "create"] as const;

const usage = (): never => {
  console.error(
    `Usage: pnpm render:fixture <${FIXTURE_NAMES.join("|")}> [--stats | --modal <${MODALS.join("|")}>]`,
  );
  process.exit(2);
};

const name = process.argv[2] as FixtureName | undefined;
if (!name || !FIXTURE_NAMES.includes(name)) usage();
const snapshot = fixture(name as FixtureName);

const modalFlag = process.argv.indexOf("--modal");
if (modalFlag !== -1) {
  const modal = process.argv[modalFlag + 1] as (typeof MODALS)[number] | undefined;
  if (!modal || !MODALS.includes(modal)) usage();
  const view =
    modal === "respond"
      ? respondModal({
          poll: snapshot.poll,
          slots: snapshot.slots,
          tz: FIXTURE_TZ,
          selected: [],
          noneSelected: false,
        })
      : createPollModal({ title: snapshot.poll.title, tz: FIXTURE_TZ, now: FIXTURE_NOW });
  console.log(JSON.stringify(view, null, 2));
} else {
  const message = renderPollMessage(snapshot);
  const stats = messageStats(message);
  if (!process.argv.includes("--stats"))
    console.log(JSON.stringify({ blocks: message.blocks }, null, 2));
  console.error(
    `blocks: ${stats.blocks}/50  longest section: ${stats.longestSection}/3000 chars  table: ${stats.tableRows}/100 rows, ${stats.tableColumns}/20 columns, ${stats.tableChars}/10000 chars`,
  );
}
