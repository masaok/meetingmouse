# Feature map

Every Slack surface, its ids, where it lives, and how to reproduce it without guessing.
`pnpm featuremap:check` fails CI if a surface id in `src/` is missing from this file, so
add a row when you add a surface (see [AGENTS.md](../AGENTS.md#adding-a-slack-surface)).

Ids in code are named constants in `src/slack/ids.ts`: `COMMAND_*`, `SHORTCUT_*`, `ACTION_*`, `CALLBACK_*`, `EVENT_*`.

## Surfaces

| Surface                    | Id                  | Listener                                                                       | Blocks                                                                                       | Data                                                                         | Reproduce                                                                                                                                     |
| -------------------------- | ------------------- | ------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Slash command              | `/when`             | `src/features/poll-create/listener.ts`                                         | `poll-create/blocks.ts` (create modal)                                                       | `slack_users` (tz cache)                                                     | `pnpm slack:sign --command /when --text "Sprint planning"`                                                                                    |
| Global shortcut            | `create_poll`       | `src/features/poll-create/listener.ts`                                         | `poll-create/blocks.ts`                                                                      | `slack_users`                                                                | `pnpm slack:sign --payload tests/fixtures/payloads/create_poll_shortcut.json`                                                                 |
| Create modal submit        | `create_poll_modal` | `src/features/poll-create/listener.ts`                                         | `src/slack/pollMessage.ts` (initial)                                                         | `polls`, `poll_slots` via `createPoll`, `setMessageTs`                       | `pnpm slack:sign --payload tests/fixtures/payloads/create_poll_modal.json`                                                                    |
| Add my availability button | `respond_button`    | `src/features/poll-respond/listener.ts`                                        | `poll-respond/blocks.ts` (loading → modal grouped by responder-local date)                   | `getPollSnapshot`, `getUserAvailability`, `slack_users`                      | `pnpm slack:sign --payload tests/fixtures/payloads/respond_button.json`                                                                       |
| Respond modal submit       | `respond_modal`     | `src/features/poll-respond/listener.ts` (phase 3)                              | `src/slack/pollMessage.ts`                                                                   | `saveResponse`, then `chat.update`                                           | payload fixture (phase 3)                                                                                                                     |
| Organizer overflow menu    | `organizer_menu`    | `src/features/poll-organize/listener.ts` (organizer-only, checked server-side) | `poll-organize/blocks.ts` (pick-time modal)                                                  | `getPoll`, `getPollSnapshot`, `setStatus`, `deletePoll`, `chat.delete`       | `pnpm slack:sign --payload tests/fixtures/payloads/organizer_menu_close.json` (also `organizer_menu_pick.json`, `organizer_menu_delete.json`) |
| Pick final time submit     | `pick_time_modal`   | `src/features/poll-organize/listener.ts`                                       | `src/slack/pollMessage.ts` via `lib/refresh.ts`; thread reply from `poll-organize/blocks.ts` | `setStatus(scheduled, slot)`, then `chat.update` + thread `chat.postMessage` | `pnpm slack:sign --payload tests/fixtures/payloads/pick_time_modal.json`                                                                      |
| Add to Google Calendar     | `gcal_link`         | `src/features/poll-organize/listener.ts` (ack only; it is a URL button)        | `src/slack/pollMessage.ts`                                                                   | ,                                                                            | `pnpm render:fixture scheduled`                                                                                                               |
| App Home opened            | `app_home_opened`   | `src/features/app-home/listener.ts` (home tab only)                            | `app-home/blocks.ts`                                                                         | `listPollsForUser`, `chat.getPermalink`, `views.publish`                     | `pnpm slack:sign --json tests/fixtures/payloads/app_home_opened.json`                                                                         |

Every id is a constant in `src/slack/ids.ts`. The poll message itself is rendered by
`src/slack/pollMessage.ts` from a `PollSnapshot`; fixtures for it live in `src/slack/fixtures.ts`
(`empty`, `three-day`, `worst-case`, `closed`, `scheduled`, `many-participants`).

## Reproducing a report

1. Find the surface above from the words in the report ("the button", "the modal that lists times").
2. Run the **Reproduce** column against a local `pnpm dev` (see [Local development](./LOCAL_DEV.md#exercising-the-route-without-slack)).
3. For rendering bugs, render the fixture: `pnpm render:fixture <name>` prints the block JSON; paste it into [Block Kit Builder](https://app.slack.com/block-kit-builder).
4. Write the failing test next to the feature (`*.test.ts`) before fixing.
