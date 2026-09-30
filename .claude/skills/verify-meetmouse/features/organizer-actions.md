# Organizer actions

Organizer actions let the poll's creator pick a final time (announced in a thread with an Add to
Google Calendar link), close the poll, or delete it. Anyone else who tries gets "Only the
organizer can do that." Phase 5; see `docs/ROADMAP.md`.

## Sub-features

- `organize-authz` every action checks `body.user.id === poll.creator_id` server-side.
- `organize-pick` a modal lists the top 10 slots with counts; submit sets `scheduled`, updates the message, posts a thread reply mentioning respondents with the gcal link.
- `organize-close` sets `closed`; the message loses its Add button.
- `organize-delete` deletes the Slack message and the poll row.

## How to get to it (user POV)

- Click the `⋯` overflow on the poll message → **Pick final time** / **Close poll** / **Delete poll** → confirm.

## Driving it with slack-sign

Preconditions:

- Phase 5 merged (until then every step here is `unreachable: not implemented`).

- **Non-organizer denied.** Run `pnpm slack:sign --payload tests/fixtures/payloads/organizer_menu_close.json` with `user.id` edited to a non-creator. Status `200`; log `action: 'organizer_denied'`; no `setStatus`.
- **Close.** Same fixture with the creator id. Log `action: 'poll_closed'`; `pnpm render:fixture closed --stats` shows the closed render; cross-check `select status from polls where id = …` → `closed`.
- **Pick.** Run `pnpm slack:sign --payload tests/fixtures/payloads/pick_time_modal.json`. Log `action: 'poll_scheduled'` with `final_slot_start`; live: a thread reply under the poll message containing `calendar.google.com`.
- **Delete.** Fixture with `delete_poll`; log `action: 'poll_deleted'`; `select count(*) from polls where id = …` → `0`.

## Gotchas

- The overflow menu is visible to everyone; authorization is server-side, so a denial in the log with a 200 status is the correct outcome for a non-organizer.
- A scheduled poll cannot be closed or picked again; expect an ephemeral explanation, not a second announcement.
