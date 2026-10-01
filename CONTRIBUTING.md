# Contributing

Thanks for helping make Meeting Mouse better. This page is the human process. The code is
described in [docs/](./docs/README.md) and the agent guardrails in [AGENTS.md](./AGENTS.md).

## Before you start

- Open an issue for anything bigger than a typo, so the shape is agreed before the code exists.
- Set up with [Local development](./docs/LOCAL_DEV.md). `pnpm install` also installs the git hooks.

## Branches, commits, pull requests

- One branch per issue: `issue-N-short-name`. Never commit to `main`.
- Conventional Commits: `feat(respond): …`, `fix(create): …`, `docs: …`. Imperative subject, 72 characters or fewer.
- One issue per PR where possible, with `Closes #N`. The template asks Why / Scope / Blast radius / Verification; say how you verified and whether the evidence came from offline or live mode.
- Run `pnpm verify` before pushing. Hooks format staged files and typecheck on push; they are the preview, CI is the gate. All seven required checks must be green.

## Changes with an extra step

- **Schema:** edit `src/db/schema.ts`, run `pnpm db:generate`, commit `drizzle/`. Never `drizzle-kit push`.
- **Slack surfaces:** follow "Adding a Slack surface" in [AGENTS.md](./AGENTS.md#adding-a-slack-surface). Every id gets a constant in `src/slack/ids.ts` and a row in `docs/FEATURE_MAP.md`; CI checks both.
- **Manifest:** changes to `manifest.json` must be re-applied by hand at api.slack.com/apps. Say so in the PR.
- **Behavior:** change the living doc in `docs/` in the same PR. Links and anchors are checked in CI.

## Bugs and security issues

- Bugs: use the issue template and include the reproduce command (`pnpm slack:sign …` or a payload fixture under `tests/fixtures/payloads/`).
- Security: see [SECURITY.md](./SECURITY.md). Please do not open a public issue.
