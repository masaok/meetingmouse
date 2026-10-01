# Respond

Respond lets a participant click **Add my availability**, tick the slots that work in their own
time zone (or "I can't make any of these"), save, and see the channel message update.

## Sub-features

- `respond-open` the button opens a loading view immediately, then the real modal.
- `respond-local` slots are grouped by the responder's local date, one row per slot: a checkbox, the start time and the slot length, and under it how many of the people who answered are free. At most 10 rows per group, in actions blocks, so no row has a label.
- `respond-prefill` a previous answer is pre-ticked; "none" is pre-ticked when it was chosen before.
- `respond-save` submit replaces the user's availability in one statement and refreshes the message.
- `respond-grid` when the host serves the web grid, a line above the form offers **Open the grid** (a signed link for that person); see `docs/WEB_GRID.md`.
- `respond-closed` a closed/scheduled poll shows an explanation instead of the form, on open and on submit.

## How to get to it (user POV)

- Click **Add my availability** on a poll message.

## Driving it with slack-sign

Preconditions:

- `pnpm health` green. For the DB path, `src/db/queries.test.ts` (PGlite) is the offline oracle.

- **Button opens the loading view first.** Run `pnpm slack:sign --payload tests/fixtures/payloads/respond_button.json`. Status `200`; offline log shows `views.open` attempted before any DB read, then `respond_modal_failed` with the fake-token code. The ordering itself is asserted by `pnpm test src/features/poll-respond/listener.test.ts -t "before touching"`.
- **Local-date grouping.** Run `pnpm test src/features/poll-respond/blocks.test.ts`. `Tests 11 passed`; the Tokyo case shows one PDT day split into `day_2026-10-06_0` (4 options) and `day_2026-10-07_0/_1` (10 + 10).
- **Worst case fits the modal.** Same test file, "14-day × 24-slot" case: ≤100 blocks, every checkbox ≤10 options, 336 options total.
- **Submit saves and refreshes.** Run `pnpm slack:sign --payload tests/fixtures/payloads/respond_modal.json`. Status `200`; live log `action: 'response_saved'` with `slots`, `refresh: 'updated'`; cross-check `select user_id, count(*) from availability where poll_id = '<id>' group by 1`.
- **Replace-all semantics.** Run `pnpm test src/db/queries.test.ts -t saveResponse`. Add 3, replace with 2 (1 overlapping) → exactly 2 rows; `[]` keeps the participant and removes rows; a foreign slot throws and leaves prior rows intact.
- **Grid link.** `pnpm test src/features/poll-respond/listener.test.ts -t "web grid"` → the form opens with the viewer's own URL on the link button above it.
- **Ticks are acked.** Same file, `-t "acks a tick"`: the checkboxes are in actions blocks, so Slack reports every tick and the listener answers it.
- **The grid page.** `pnpm grid:preview`, open two of the printed links, drag on the left grid: "Saved" appears, the right grid darkens, the other window follows within 5 s, and the terminal prints `chat.update`.
- **Closed mid-flight.** `pnpm test src/features/poll-respond/listener.test.ts -t "closed meanwhile"` → `response_action: update`, no save.

## Gotchas

- The checkboxes are in actions blocks, not input blocks. Slack still returns their state in `view.state.values` on Save, keyed by the same `block_id` and `action_id`, which is what `parseRespondSubmission` reads.
- The counts under each time are from when the form opened. They do not update while it is open.
- `initial_options` must be the same objects as `options` or Slack rejects the view; the blocks test asserts identity.
- Unknown slot values in a submission are dropped silently (a stale modal after the poll was recreated); the count in the log tells you.
- The respond payload fixture's slot values are epoch seconds for 2026-10-06 16:00Z and 16:30Z; a different poll needs different values.
