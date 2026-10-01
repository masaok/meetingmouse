# Respond

Respond lets a participant click **Add my availability**, click the times that work in their own
time zone (or "I can't make any of these"), and see the channel message update after each click.

## Sub-features

- `respond-open` the button opens a loading view immediately, then the form.
- `respond-local` slots are grouped by the responder's local date: a bold day line, then a row of buttons, one per slot, labelled `9am` or `9:30am`. At most 25 buttons per row.
- `respond-prefill` a chosen time is green with a tick; the last line counts the chosen times.
- `respond-save` a click flips that one slot in one statement, redraws the form and refreshes the message. There is no Save button.
- `respond-none` **I can't make any of these** records an answer with no times; clicking it again withdraws the answer.
- `respond-grid` when the host serves the web grid, a line above the form offers **Open the grid** (a signed link for that person); see `docs/WEB_GRID.md`.
- `respond-closed` a closed/scheduled poll shows an explanation instead of the form, on open and on a click.

## How to get to it (user POV)

- Click **Add my availability** on a poll message.

## Driving it with slack-sign

Preconditions:

- `pnpm health` green. For the DB path, `src/db/queries.test.ts` (PGlite) is the offline oracle.

- **Button opens the loading view first.** Run `pnpm slack:sign --payload tests/fixtures/payloads/respond_button.json`. Status `200`; offline log shows `views.open` attempted before any DB read, then `respond_modal_failed` with the fake-token code. The ordering itself is asserted by `pnpm test src/features/poll-respond/listener.test.ts -t "before touching"`.
- **Local-date grouping.** Run `pnpm test src/features/poll-respond/blocks.test.ts`. `Tests 8 passed`; the Tokyo case shows one PDT day split into `day_2026-10-06_0` (4 buttons) and `day_2026-10-07_0` (20).
- **Worst case fits the modal.** Same test file, "14-day × 24-slot" case: ≤100 blocks, every row ≤25 buttons with distinct action ids, 336 buttons total.
- **A click saves and refreshes.** Run `pnpm slack:sign --payload tests/fixtures/payloads/respond_toggle_slot.json`. Status `200`; live log `action: 'response_saved'` with `change: 'toggle_slot'`, `slots`, `refresh: 'updated'`; cross-check `select user_id, count(*) from availability where poll_id = '<id>' group by 1`. The order (write, read back, redraw, refresh) is asserted by `pnpm test src/features/poll-respond/listener.test.ts -t "flips that slot"`.
- **Toggle semantics.** Run `pnpm test src/db/queries.test.ts -t toggleSlot`. On, then off; only the named slot and user change; two racing toggles never double the row; a foreign slot throws and writes nothing.
- **None, and withdrawing it.** `pnpm test src/features/poll-respond/listener.test.ts -t "none"` and `-t "withdraws"`.
- **Grid link.** `pnpm test src/features/poll-respond/listener.test.ts -t "web grid"` → the form opens with the viewer's own URL on the link button above it, and keeps it after a click.
- **The grid page.** `pnpm grid:preview`, open two of the printed links, drag on the left grid: "Saved" appears, the right grid darkens, the other window follows within 5 s, and the terminal prints `chat.update`.
- **Closed mid-flight.** `pnpm test src/features/poll-respond/listener.test.ts -t "closed meanwhile"` → the closed view, no write.

## Gotchas

- Each button's `action_id` is `toggle_slot:<epoch seconds>`, because Slack wants the ids in one block to differ. The listener subscribes with a pattern, and reads the slot from the button's `value`.
- A click on a slot that is not in the poll is ignored (a form left open after the poll was recreated).
- Two fast clicks both reach the database. The form can show the earlier of the two until the next click or until it is reopened.
- Unticking the last chosen time leaves an answer with no times, which reads as "none of these". The button at the bottom withdraws it.
- The payload fixture's slot value is epoch seconds for 2026-10-06 16:00Z; a different poll needs a different value.
