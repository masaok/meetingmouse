# Create a poll

Create poll lets an organizer start an availability poll from `/meet` or the global shortcut,
fill in title, dates, daily window, slot length and channel, and see the first poll message
posted in the channel.

## Sub-features

- `create-command` `/meet [title]` opens the modal with the title and current channel pre-filled.
- `create-dm` `/meet` in a 1:1 or group DM answers with an ephemeral hint and opens no modal.
- `create-shortcut` the "Find a meeting time" global shortcut opens the modal with no channel.
- `create-validate` the modal rejects To ≤ From, more than 24 slots per day, more than 14 dates, missing title or channel.
- `create-post` submit inserts the poll and slots and posts the initial message; `message_ts` is stored.
- `create-not-in-channel` posting to a channel the bot cannot post in deletes the poll and sends the invite hint.

## How to get to it (user POV)

- Type `/meet Sprint planning` in any channel.
- Slack search bar → Shortcuts → **Find a meeting time**.

## Driving it with slack-sign

Preconditions:

- `pnpm health` green. Offline mode is enough for everything but the visible message.

- **Command opens the modal.** Run `pnpm slack:sign --command /meet --text "Sprint planning"`. Status `200`; dev log has `action: 'when_command'` then (offline) a logged `views.open` failure on the fake token, which proves the listener reached the API call.
- **DM is refused.** Run `pnpm slack:sign --command /meet --channel D0000TEST`. Status `200`; the body is the hint ("I can't post a poll in a direct message..."); log `action: 'when_command_dm'` and no `views.open` call.
- **Shortcut opens the modal.** Run `pnpm slack:sign --payload tests/fixtures/payloads/create_poll_shortcut.json`. Status `200`; log `action: 'create_poll_shortcut'`.
- **Modal shape.** Run `pnpm test src/features/poll-create/blocks.test.ts`. `Tests 5 passed`; the snapshot in `__snapshots__/` shows 21 date options, 6:00 to 23:00 times, 15/30/60 radios, the channel select with `response_url_enabled`.
- **Validation.** Run `pnpm test src/features/poll-create/schema.test.ts`. `Tests 7 passed`, one per rule.
- **Submit persists and posts.** Run `pnpm slack:sign --payload tests/fixtures/payloads/create_poll_modal.json`. Status `200`. Offline: log `action: 'poll_create_failed'` with `code` from the fake token, and the poll row is deleted (the listener's cleanup path). Live: log `action: 'poll_created'` with `poll_id`, and a message in `C0000TEST`'s real equivalent; cross-check `select id, message_ts, status from polls order by created_at desc limit 1`.
- **Not in channel.** Run `pnpm test src/features/poll-create/listener.test.ts -t not_in_channel`. The test asserts `deletePoll` and the invite hint via `response_url`.

## Gotchas

- `/meet` is the command the copy names. `/mouse` is an alias registered by the same loop over `COMMANDS` in `src/slack/ids.ts`, and the manifest lists both. The app shipped with `/when`; it was removed in 0.12.0. Another Slack app that registers `/meet` in the same workspace takes it over if it was installed later; `/mouse` still works.
- A DM is recognized by a channel id starting with `D`, or the channel name `directmessage` or `mpdm-…`. From a DM, the global shortcut still works: it has no channel and the picker offers only channels.
- The modal's date labels are in the creator's `users.info` tz (cached in `slack_users`); a stale cache shows yesterday's dates after a tz change.
- A window that leaves a partial trailing slot (9:00 to 9:45 with 30-min slots) yields one slot; that is by design (`slotsPerDay` floors).
- `trigger_id` expires in 3 s: the listener calls `users.info` (cached) before `views.open`; if the cache misses and Slack is slow, the modal can fail to open. Look for `trigger_expired` in the log.
