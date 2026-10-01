/**
 * Print the block JSON for a fixture poll, plus the numbers that matter against Slack limits.
 * Paste the JSON into https://app.slack.com/block-kit-builder to see it.
 *
 *   pnpm render:fixture three-day
 *   pnpm render:fixture worst-case --stats
 */
import { fixture, FIXTURE_NAMES, type FixtureName } from "../src/slack/fixtures";
import { messageStats, renderPollMessage } from "../src/slack/pollMessage";

const name = process.argv[2] as FixtureName | undefined;
if (!name || !FIXTURE_NAMES.includes(name)) {
  console.error(`Usage: pnpm render:fixture <${FIXTURE_NAMES.join("|")}> [--stats]`);
  process.exit(2);
}
const message = renderPollMessage(fixture(name));
const stats = messageStats(message);
if (!process.argv.includes("--stats"))
  console.log(JSON.stringify({ blocks: message.blocks }, null, 2));
console.error(
  `blocks: ${stats.blocks}/50  longest section: ${stats.longestSection}/3000 chars  table: ${stats.tableRows}/100 rows, ${stats.tableColumns}/20 columns, ${stats.tableChars}/10000 chars`,
);
