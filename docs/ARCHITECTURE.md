# Architecture

Meet Mouse is a Slack app: an availability poll that lives in one channel message and
updates in place. Nobody leaves Slack. The web app at meetmouse.net is a static homepage
plus a single route handler that receives every Slack request.

## Request path

```mermaid
flowchart LR
  Slack([Slack]) -- signed POST --> Route["src/app/api/slack/events/route.ts"]
  Route --> Receiver["VercelReceiver: verify signature, ack within 3 s"]
  Receiver -- waitUntil --> Listener["src/features/*/listener.ts"]
  Listener --> Schema["schema.ts: zod parses view.state.values"]
  Listener --> Domain["src/domain: slots, tally, gcal (pure)"]
  Listener --> Queries["src/db/queries.ts: Neon over HTTP"]
  Listener --> Blocks["blocks.ts + src/slack: Block Kit (pure)"]
  Blocks -- chat.update, views.open --> Slack
```

Arrows into `src/domain` and the block builders only ever carry data; ESLint rejects an import
of the database, Bolt or env from either. The rules are in [Dependency rules](#dependency-rules).

## Stack

| Concern       | Choice                                                                                                   |
| ------------- | -------------------------------------------------------------------------------------------------------- |
| Framework     | Next.js 16 App Router, TypeScript strict                                                                 |
| Slack         | `@slack/bolt` 5 + `@vercel/slack-bolt` (`VercelReceiver`, `createHandler`)                               |
| Hosting       | Vercel, Fluid Compute, Node.js runtime (never Edge)                                                      |
| Database      | Neon Postgres via `@neondatabase/serverless` (HTTP driver) + `drizzle-orm`; `drizzle-kit` SQL migrations |
| Validation    | `zod` for `view.state.values` and env                                                                    |
| Dates         | `date-fns` + `date-fns-tz`. Every instant is stored as UTC.                                              |
| Tests         | `vitest`                                                                                                 |
| Lint / format | `eslint` (boundaries below) + `prettier` (sorted imports, sorted Tailwind classes)                       |

## Request lifecycle

1. Slack POSTs to `/api/slack/events` (commands, interactivity, events all share the URL).
2. `src/app/api/slack/events/route.ts` asserts env, then hands the request to Bolt via `createHandler`.
3. `VercelReceiver` verifies the signature, **acks within 3 s**, and runs the rest of the listener under `waitUntil`.
4. The feature listener (`src/features/*/listener.ts`) fetches from `src/db/queries.ts`, calls pure `src/domain` functions, builds blocks with its `blocks.ts`, and calls the Slack Web API.

Consequence: anything after `ack()` is background work. It must be idempotent and must
surface errors to the user ephemerally (see [Testing](./TESTING.md#error-surfacing)).

## Directory layout

```
src/
  app/                      Next.js routes: homepage + api/slack/events/route.ts
  bolt/app.ts               App + VercelReceiver; registers features. server-only.
  features/                 One directory per Slack surface, colocated:
    poll-create/            listener.ts · blocks.ts · schema.ts · *.test.ts
    poll-respond/
    poll-organize/
    app-home/
    index.ts                registerFeatures(app)
  domain/                   Pure logic: constants, types, slots, tally, gcal. No I/O.
  slack/                    Shared Slack knowledge: limits.ts, format.ts, block helpers.
  db/                       schema.ts (Drizzle), client.ts (server-only), queries.ts
  lib/                      env.ts (preflight), users.ts (users.info cache), log.ts
drizzle/                    Numbered SQL migrations generated from schema.ts
scripts/                    Verification and dev tooling (see Local development)
tests/                      Cross-cutting tests + proof-of-failure fixtures
docs/                       These living documents
```

**Why by feature, not by type.** Someone fixing "the respond modal shows the wrong day"
opens one directory and finds the listener, the block builder, the payload schema and the
tests together. Grouping by type (`listeners/*.ts`, `blocks/*.ts`) spreads that one change
across four directories.

## Dependency rules

Enforced by `no-restricted-imports` in `eslint.config.mjs`; a violation fails `pnpm lint` and CI.

| From                             | May not import                                                         | Why                                                     |
| -------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------- |
| `src/domain/**`                  | `@slack/*`, `next`, `@/db`, `@/bolt`, `@/slack`, `@/features`, `@/lib` | Pure functions: dates in, data out. Trivially testable. |
| `src/slack/**`                   | `@/db`, `@/bolt`, `@/features`                                         | Renders what it is handed; never fetches.               |
| `src/features/**/blocks*.ts`     | `@/db`, `@/bolt`                                                       | Same: block builders are renderers.                     |
| `src/app/**/*.tsx`, `components` | `@/db`, `@/bolt`, `@/lib/env`                                          | UI never reaches credentials.                           |

`src/db/client.ts` and `src/bolt/app.ts` start with `import "server-only"`, so an accidental
client import is a build error, not a review comment.

## Time zones

- Every slot is a UTC instant (`timestamptz`). Slot identity is its epoch seconds.
- **Channel message:** times use Slack's `<!date^{epoch}^{format}|{fallback}>` token, so each viewer sees their own local time. See `src/slack/format.ts`.
- **Respond modal:** option labels cannot use date tokens reliably, so labels are built server-side in the responder's zone (from `users.info` → `user.tz`, cached in `slack_users`). Slots are grouped by the responder's _local_ date; a slot can land on a different calendar day than the organizer's.
- DST: `generateSlots` skips nonexistent local times and de-duplicates repeated ones.

## Slack limits that shape the design

Constants in `src/slack/limits.ts`; poll limits in `src/domain/constants.ts`; the derivation is
asserted in `src/slack/limits.test.ts`.

| Limit                      | Value | Consequence                                                 |
| -------------------------- | ----- | ----------------------------------------------------------- |
| Checkbox options / element | 10    | Each day's slots split into ≤10-option inputs               |
| Blocks / modal             | 100   | Polls capped at 14 days × 24 slots                          |
| Blocks / message           | 50    | Heatmap is one section per day, not one block per slot      |
| Section text               | 3000  | Compact rows; fall back to top rows plus a note if exceeded |
| `trigger_id` lifetime      | ~3 s  | `views.open` a loading view first, DB work after            |
