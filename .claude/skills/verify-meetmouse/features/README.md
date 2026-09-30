# Meet Mouse verification map

Maintained source for proving user-facing behavior. Read this index, then the feature file
that matches what you are verifying. Surface ids are indexed in `docs/FEATURE_MAP.md` (CI
checks that every id in `src/` appears there); these files hold the recipes.

## Baseline preconditions

- `pnpm dev` is up and `pnpm doctor` is green (see `../SKILL.md`).
- Offline mode unless `.env.local` holds real tokens; say which mode evidence came from.
- Fixture payloads under `tests/fixtures/payloads/` use team `T0000TEST`, user `U0000TEST`,
  channel `C0000TEST`, poll `00000000-0000-4000-8000-000000000001`.
- Never drive an instance this run did not start.

## Driving conventions

- Every command is literal; keep flags and quoted names unchanged.
- Signed HTTP goes through `pnpm slack:sign`; rendering through `pnpm render:fixture`; data
  through PGlite tests or a read-only Neon query.
- Restore fixture files after editing a copy; never edit the committed fixtures in place.

## Proof and skip reporting

- Route proof = command + HTTP status + the JSON log line with `action`.
- Render proof = `--stats` line (+ Block Kit screenshot when visual).
- Data proof = a read-back, never the write's return value.
- Report an unreachable path with the command attempted and the unmet precondition
  (no workspace, no Neon). Never report a path verified through a different one.

## Feature entry contract

Each file: H1, one paragraph, then exactly these H2s in order: `Sub-features`,
`How to get to it (user POV)`, `Driving it with slack-sign`, `Gotchas`.

## Features

- [Create a poll](./create-poll.md): `/when`, the global shortcut, the create modal, validation, the first message.
- [Poll message](./poll-message.md): heatmap, best times, everyone-free, closed and scheduled renders, limits.
- [Respond](./respond.md): the Add my availability button, the local-time modal, saving, live update.
- [Organizer actions](./organizer-actions.md): pick final time, close, delete, thread announcement (phase 5).
- [App Home](./app-home.md): the home tab lists (phase 6).
