# Testing

## The gate

`pnpm verify` locally; the same jobs run in CI on every PR and are required to merge.

| CI job                      | Command(s)                                                                     | Proves                                                                                   |
| --------------------------- | ------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------- |
| Types, lint, format         | `pnpm typecheck` `pnpm lint` `pnpm format:check`                               | Route types regenerated then checked; boundaries hold; formatted                         |
| Unit tests                  | `pnpm test`                                                                    | Domain, renderers, parsers, and every custom check's failure fixture                     |
| Migrations apply from empty | `pnpm db:generate && git diff --exit-code` `pnpm db:migrate` ×2                | SQL matches `schema.ts`; applies to empty Postgres 17; idempotent                        |
| Production build            | `pnpm build`                                                                   | Prerender, bundling, server/client boundaries                                            |
| Smoke imports               | `pnpm smoke`                                                                   | Real entry points import under production conditions                                     |
| Docs links                  | `pnpm docs:check` `pnpm featuremap:check` `pnpm prose:check` `pnpm blog:check` | No broken links or anchors; every surface id documented; prose rules; blog content rules |
| Package                     | `pnpm pack:check` `pnpm smoke:pack`                                            | Tarball holds only the library; a scratch host installs and runs it                      |

Hooks are deliberately small: pre-commit formats staged files (~1 s); pre-push typechecks.
Read-only variants only in automation (`lint`, `format:check`); `lint:fix` and `format` are for humans.

## Guardrails (hard, not advisory)

| Rule                                              | Enforced by                    |
| ------------------------------------------------- | ------------------------------ |
| `domain/` is pure; renderers don't fetch          | ESLint `no-restricted-imports` |
| Credentials never reach the client                | `server-only` + ESLint         |
| Every surface id is in the feature map            | `pnpm featuremap:check` (CI)   |
| Docs links and anchors resolve                    | `pnpm docs:check` (CI)         |
| Prose has no long dashes or curly quotes          | `pnpm prose:check` (CI + hook) |
| Blog posts match the schema and the keyword map   | `pnpm blog:check` (CI)         |
| Poll limits fit Slack limits                      | `src/slack/limits.test.ts`     |
| Worst-case renders fit block and char limits      | `blocks.test.ts` per feature   |
| Migrations match `schema.ts` and apply from empty | CI job                         |
| pnpm only                                         | `preinstall: only-allow pnpm`  |

If you find yourself leaving the same review comment twice, add a row here and a rule that enforces it.

## Driving the app

`pnpm health` says whether a running instance is worth driving (env names, homepage, unsigned
POST → 401, DB, Slack). The `verify-meetmouse` skill has the Launch / Doctor / Drive / Evidence /
Cleanup contract and one recipe file per feature under `.claude/skills/verify-meetmouse/features/`.

## What a unit test covers here

- `src/domain/*.test.ts`: slot generation across DST, tallies, best times, everyone-free ranges, gcal URL.
- `src/features/*/blocks.test.ts`: snapshot of block JSON, plus block-count and char-limit assertions for the 14-day × 24-slot worst case.
- `src/features/*/schema.test.ts`: zod parsers for `view.state.values`, each validation rule.
- `tests/checks.test.ts`: proof-of-failure for `check-docs` and `check-feature-map`.

## Error surfacing

Everything after `ack()` runs under `waitUntil`. A thrown error there is logged by Bolt but
invisible to the user. Feature listeners therefore wrap their work and post an ephemeral
"Something went wrong" with the error code when the Slack API rejects a call. `message_not_found`
on `chat.update` (message deleted manually) is handled, not fatal.

## Manual QA checklist (dev workspace)

- [ ] Slash command in a public channel the bot hasn't joined
- [ ] Slash command in a private channel (expect the invite prompt)
- [ ] Slash command in a DM (ephemeral "use in a channel")
- [ ] Global shortcut path with the channel picker
- [ ] Responder in a tz where a slot crosses midnight
- [ ] Poll spanning the DST change
- [ ] Two people answering within the same second
- [ ] "Can't make any" response shows up in the respondent count
- [ ] Organizer closes, then someone clicks an old Add button
- [ ] Deleting the Slack message manually (no crash on `message_not_found`)

Live-workspace and live-database suites are never required checks; they run on demand.
