---
name: verify-meetmouse
description: Drive Meeting Mouse the way Slack does and prove behavior with evidence. Use before reporting any change as done, before every PR, when the user says "ship it" or "does it work", and as the harness for reproducing bug reports. Sections are Launch, Doctor, Drive, Evidence, Cleanup, Helpers; per-feature recipes live in features/.
---

# Verify Meeting Mouse

Meeting Mouse has no browser UI to drive: its surface is Slack. Slack sends signed HTTP POSTs to
`/api/slack/events`; the app answers within 3 s, then calls the Slack Web API in the background.
So the harness is **signed payloads in, HTTP status + structured log lines + Block Kit JSON out**,
plus a real Postgres (PGlite in tests, Neon in a workspace). Read `features/README.md` for the
map, then the feature file that matches what you are verifying.

Two modes:

| Mode        | When                                | Slack API calls                                  | DB                        |
| ----------- | ----------------------------------- | ------------------------------------------------ | ------------------------- |
| **offline** | no workspace, CI, most local work   | fail on the fake token and are logged (expected) | none, or a local Postgres |
| **live**    | `.env.local` has real tokens + Neon | real                                             | Neon branch               |

Offline proves routing, signature verification, `ack()`, parsing, rendering and DB writes.
Only live proves what a person sees in Slack. Say which mode your evidence came from.

## Launch

```bash
pnpm install
cp .env.example .env.local            # offline: leave the fake values, add SLACK_TOKEN_VERIFICATION=off
pnpm dev                              # http://localhost:3000, warns about missing env
```

Ready when `curl -s -o /dev/null -w '%{http_code}' localhost:3000/` prints `200`. A second
instance: `pnpm exec next dev -p 3111` and pass `--url http://localhost:3111/api/slack/events`
to every drive command. Teardown: stop the `next dev` you started (its PID), never `pkill next`.

## Doctor

```bash
pnpm health                           # or DOCTOR_URL=http://localhost:3111 pnpm health
```

Read-only. Reports env presence (names only), homepage 200, unsigned POST → **401** (500 means
the server has no env; 404 means the route is missing), DB `select 1` (skipped for localhost
fakes), Slack `auth.test` (skipped in offline mode). Run it before the first drive and again
after any drive that surprised you. Do not drive an instance whose doctor is red.

## Drive

Every command below is literal. The harness is `scripts/slack-sign.ts`:

```bash
pnpm slack:sign --command /when --text "Sprint planning"          # slash command (form body)
pnpm slack:sign --payload tests/fixtures/payloads/<name>.json     # interactivity (payload=…)
pnpm slack:sign --json tests/fixtures/payloads/app_home_opened.json  # Events API (JSON body)
pnpm render:fixture <empty|three-day|worst-case|closed|scheduled|many-participants> [--stats]
pnpm test <path>                                                  # PGlite-backed DB tests, renderers, parsers
```

Fixture payloads carry the ids in `src/slack/ids.ts`; edit a copy under the scratch directory
when you need other values (poll ids, users, timestamps). Signature is computed from
`SLACK_SIGNING_SECRET` in `.env.local`, so the same command works against a preview URL.

## Evidence

What counts as proof, per kind of change:

- **Routing/listener:** the exact command, the HTTP status, and the JSON log line from the dev
  server (`action: '<name>'`, `poll_id`, `user_id`). A 200 alone is not proof that the listener ran.
- **Renderer:** `pnpm render:fixture … --stats` output (`blocks: n/50  longest section: n/3000`)
  and, for anything visual, a Block Kit Builder paste (`https://app.slack.com/block-kit-builder`)
  with a screenshot saved under the scratch directory.
- **Parser/validation:** the test file path and its `Tests n passed` line; every rule has a test.
- **Data:** a PGlite test that reads the value back (`src/db/queries.test.ts` pattern), or for
  live mode a read-only query against the Neon branch (`select … from polls where id = …`).
- **Live Slack:** a screenshot of the channel message or modal with the workspace name visible,
  plus the same read-only DB cross-check.

Standards: exercise the real path (a signed payload through the route), not the function under
it; capture the action and the resulting state, not only the final screen; verify side effects
(rows written, `chat.update` attempted) next to what is visible; mocks only at the Slack Web API
boundary. Proof artifacts survive cleanup; name where they are.

## Cleanup

Stop the dev server you started. Remove copies of fixtures you edited. Keep evidence. In live
mode, delete test polls with the organizer's **Delete poll** action (it removes the message and
the row) rather than by hand.

## Helpers

| Script                      | Invocation                                                                        |
| --------------------------- | --------------------------------------------------------------------------------- |
| `scripts/slack-sign.ts`     | `pnpm slack:sign …` (see Drive)                                                   |
| `scripts/render-fixture.ts` | `pnpm render:fixture <name> [--stats]`                                            |
| `scripts/doctor.ts`         | `pnpm health`                                                                     |
| `scripts/log-decision.sh`   | `scripts/log-decision.sh <phase> "<decision>" "<reason>" "<evidence>" "<result>"` |

## The gate

`pnpm verify` runs what CI requires (typecheck, lint, format, tests, docs, feature map, smoke
imports, no-env build). Run it last and quote its summary lines. If anything is red, say so first.
