# Poll message

The poll message is the single channel message that shows the title, best times, an
everyone-free line, the availability grid, who responded, and the action buttons. It is
re-rendered in place after every response and organizer action.

## Sub-features

- `message-best` top 3 slots by count, ties broken by earliest, `✅` when everyone is free.
- `message-everyone` contiguous ranges where every participant is free.
- `message-heatmap` one table: a column per creator-local day, a row per time, and in each cell a square (`🟩` everyone, `🟨` half or more, `🟧` a few, `⬜` nobody) plus the headcount. A legend line follows it.
- `message-respondents` mention list capped at 20 with `+N more`.
- `message-closed` no Add button, "Poll closed" in the context line.
- `message-scheduled` "Scheduled for <date>" with an Add to Google Calendar button.
- `message-limits` ≤50 blocks, ≤3000 chars per section, and a table of ≤100 rows, ≤20 columns and ≤10,000 chars for 14 days × 24 slots.

## How to get to it (user POV)

- It is the message `/meet` posts; it updates itself after each **Add my availability** save.
- Times in it render in each viewer's own time zone (Slack date tokens).

## Driving it with slack-sign

Preconditions:

- None beyond the repo; rendering is pure.

- **Render a fixture.** Run `pnpm render:fixture three-day --stats`. stderr prints `blocks: 8/50  longest section: 232/3000 chars  table: 17/100 rows, 4/20 columns, 1157/10000 chars`; stdout is the block JSON.
- **See it.** Paste the JSON into `https://app.slack.com/block-kit-builder`; the grid shows cells such as `🟨 2` under a Best times list. Save a screenshot under the scratch directory.
- **Worst case.** Run `pnpm render:fixture worst-case --stats` → `blocks: 8/50  longest section: 234/3000 chars  table: 25/100 rows, 15/20 columns, 7381/10000 chars`.
- **Scaling.** Run `pnpm render:fixture many-participants --stats` → 25 participants, `+5 more`.
- **All renders.** Run `pnpm test src/slack/pollMessage.test.ts`. `Tests 9 passed`; snapshots in `src/slack/__snapshots__/`.
- **Live update.** Run `pnpm test src/lib/refresh.test.ts` → `chat.update` with fresh aggregates; `message_not_found` tolerated.

## Gotchas

- `{date_short_pretty}` renders as "Today"/"Tomorrow" in Slack; the fallback text in the token is what tests see.
- Columns and rows are grouped in the organizer's zone; a viewer in another zone can see a column whose rows straddle their midnight. That is expected.
- The table's 10,000-char limit is Slack's own count. `tableChars` is our estimate (text, emoji names, date fallbacks); the worst-case fixture was accepted by `chat.postEphemeral` and `chat.update`.
- A section over 3000 chars falls back to rows with availability only, plus a note; check `longest section` before blaming Slack.
