# Feature map

Every Slack surface, its ids, where it lives, and how to reproduce it without guessing.
`pnpm featuremap:check` fails CI if a surface id in `src/` is missing from this file, so
add a row when you add a surface (see [AGENTS.md](../AGENTS.md#adding-a-slack-surface)).

Ids in code are named constants in `src/slack/ids.ts`: `COMMAND_*`, `SHORTCUT_*`, `ACTION_*`, `CALLBACK_*`, `EVENT_*`.

## Surfaces

| Surface                                                                                    | Id                  | Listener                                                                                    | Blocks                                                                                       | Data                                                                         | Reproduce                                                                                                                                     |
| ------------------------------------------------------------------------------------------ | ------------------- | ------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Slash command (its alias `/mouse` opens the same form); the text `help` answers with usage | `/meet`             | `src/features/poll-create/listener.ts`                                                      | `poll-create/blocks.ts` (create modal)                                                       | `slack_users` (tz cache)                                                     | `pnpm slack:sign --command /meet --text "Sprint planning"`; usage instead of the form: `pnpm slack:sign --command /meet --text help`          |
| Global shortcut                                                                            | `create_poll`       | `src/features/poll-create/listener.ts`                                                      | `poll-create/blocks.ts`                                                                      | `slack_users`                                                                | `pnpm slack:sign --payload tests/fixtures/payloads/create_poll_shortcut.json`                                                                 |
| Create modal submit                                                                        | `create_poll_modal` | `src/features/poll-create/listener.ts`                                                      | `src/slack/pollMessage.ts` (initial)                                                         | `polls`, `poll_slots` via `createPoll`, `setMessageTs`                       | `pnpm slack:sign --payload tests/fixtures/payloads/create_poll_modal.json`                                                                    |
| Add my availability button                                                                 | `respond_button`    | `src/features/poll-respond/listener.ts`                                                     | `poll-respond/blocks.ts` (loading → modal grouped by responder-local date)                   | `getPollSnapshot`, `getUserAvailability`, `slack_users`                      | `pnpm slack:sign --payload tests/fixtures/payloads/respond_button.json`                                                                       |
| Open the grid (link button)                                                                | `grid_link`         | `src/features/poll-respond/listener.ts` (ack only; it is a URL button)                      | `poll-respond/blocks.ts` (a line above the form, shown when the host serves the web grid)    | ,                                                                            | `pnpm test src/features/poll-respond/listener.test.ts -t "grid link"`; the page itself: `pnpm grid:preview`                                   |
| Respond form (the modal)                                                                   | `respond_modal`     | `src/features/poll-respond/listener.ts` (a view with no submit; opened by `respond_button`) | `poll-respond/blocks.ts` (a row of time buttons per responder-local date)                    | `getPollSnapshot`, `getUserAvailability`, `slack_users`                      | `pnpm test src/features/poll-respond/blocks.test.ts`                                                                                          |
| Time button in the form                                                                    | `toggle_slot`       | `src/features/poll-respond/listener.ts` (action ids are `toggle_slot:<epoch seconds>`)      | `poll-respond/blocks.ts`, then `src/slack/pollMessage.ts` via `lib/refresh.ts`               | `toggleSlot`, `getUserAvailability`, then `chat.update`                      | `pnpm slack:sign --payload tests/fixtures/payloads/respond_toggle_slot.json`                                                                  |
| I can't make any of these                                                                  | `toggle_none`       | `src/features/poll-respond/listener.ts`                                                     | `poll-respond/blocks.ts`, then `src/slack/pollMessage.ts` via `lib/refresh.ts`               | `saveResponse` with no slots, or `removeResponse` to withdraw                | `pnpm test src/features/poll-respond/listener.test.ts -t "none"`                                                                              |
| Organizer overflow menu                                                                    | `organizer_menu`    | `src/features/poll-organize/listener.ts` (organizer-only, checked server-side)              | `poll-organize/blocks.ts` (pick-time modal)                                                  | `getPoll`, `getPollSnapshot`, `setStatus`, `deletePoll`, `chat.delete`       | `pnpm slack:sign --payload tests/fixtures/payloads/organizer_menu_close.json` (also `organizer_menu_pick.json`, `organizer_menu_delete.json`) |
| Pick final time submit                                                                     | `pick_time_modal`   | `src/features/poll-organize/listener.ts`                                                    | `src/slack/pollMessage.ts` via `lib/refresh.ts`; thread reply from `poll-organize/blocks.ts` | `setStatus(scheduled, slot)`, then `chat.update` + thread `chat.postMessage` | `pnpm slack:sign --payload tests/fixtures/payloads/pick_time_modal.json`                                                                      |
| Add to Google Calendar                                                                     | `gcal_link`         | `src/features/poll-organize/listener.ts` (ack only; it is a URL button)                     | `src/slack/pollMessage.ts`                                                                   | ,                                                                            | `pnpm render:fixture scheduled`                                                                                                               |
| App Home opened                                                                            | `app_home_opened`   | `src/features/app-home/listener.ts` (home tab only)                                         | `app-home/blocks.ts`                                                                         | `listPollsForUser`, `chat.getPermalink`, `views.publish`                     | `pnpm slack:sign --json tests/fixtures/payloads/app_home_opened.json`                                                                         |

Every id is a constant in `src/slack/ids.ts`. The poll message itself is rendered by
`src/slack/pollMessage.ts` from a `PollSnapshot`; fixtures for it live in `src/slack/fixtures.ts`
(`empty`, `three-day`, `worst-case`, `closed`, `scheduled`, `many-participants`).

## Web pages

The homepage, the web grid and the blog are routes, not Slack surfaces, so the id check does
not cover them. The blog's routes and reproduce commands are in [Blog](./BLOG.md#surfaces).

| Page           | Route      | File                       | Reproduce                        |
| -------------- | ---------- | -------------------------- | -------------------------------- |
| Privacy policy | `/privacy` | `src/app/privacy/page.tsx` | `curl -s localhost:3000/privacy` |
| Support        | `/support` | `src/app/support/page.tsx` | `curl -s localhost:3000/support` |

Both describe the hosted service at app.meetingmouse.net, not a self-hosted copy. The facts
they state (support address, retention period, plan limit, every stored column) are in
`src/lib/hosted.ts`. `src/lib/hosted.test.ts` fails when a column is added to the core's tables
without a line there. The hosted app's own table and its retention and plan limit are not in
this repository, so a change to them has to be copied here by hand.

## Reproducing a report

1. Find the surface above from the words in the report ("the button", "the modal that lists times").
2. Run the **Reproduce** column against a local `pnpm dev` (see [Local development](./LOCAL_DEV.md#exercising-the-route-without-slack)).
3. For rendering bugs, render the fixture: `pnpm render:fixture <name>` prints the block JSON; paste it into [Block Kit Builder](https://app.slack.com/block-kit-builder).
4. Write the failing test next to the feature (`*.test.ts`) before fixing.
