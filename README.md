# Meeting Mouse

[![CI](https://github.com/masaok/meetingmouse/actions/workflows/ci.yml/badge.svg)](https://github.com/masaok/meetingmouse/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)

Find the time everyone is free, right from Slack. `/when Sprint planning` posts an availability
poll in the channel. Everyone marks when they're free, in their own time zone, by dragging
across a grid. The message updates in place with a grid of who is free when and the best times,
and the organizer locks one in with an Add to Google Calendar link.

## How it works

1. **Start a poll.** `/when <title>` or the global shortcut opens a modal: date range, working hours, slot length.
2. **One message.** The app posts a single poll message in the channel.
3. **Everyone responds.** Each person clicks Add my availability and clicks the times that work in a form in Slack, in their own time zone. Each click saves. A host can also serve the [web grid](./docs/WEB_GRID.md), a page for dragging across the same slots.
4. **Live results.** The channel message re-renders after every response: a grid of who is free when, and the best times.
5. **Lock it in.** The organizer picks a time and the thread gets an Add to Google Calendar link.

## Run it yourself

You need Node from `.nvmrc`, pnpm, a Slack workspace where you can create an app, and a
[Neon](https://neon.tech) Postgres database (the runtime uses Neon's serverless HTTP driver;
the free tier is enough).

```bash
pnpm install                 # also installs the git hooks
cp .env.example .env.local   # then fill in the three variables below
pnpm db:migrate              # applies drizzle/*.sql to DATABASE_URL
pnpm dev                     # http://localhost:3000
pnpm verify                  # everything CI runs
```

1. Create the Slack app at api.slack.com/apps from `manifest.json`, with the three URLs pointed at your host or at a tunnel (`pnpm dev:tunnel` rewrites them for you and restores the file on exit).
2. Put `SLACK_BOT_TOKEN`, `SLACK_SIGNING_SECRET` and `DATABASE_URL` in `.env.local`.
3. Install the app to your workspace and run `/when` in a channel.

[Local development](./docs/LOCAL_DEV.md) has the details, including how to exercise the route
with signed payloads and no Slack workspace at all. [Deployment](./docs/DEPLOYMENT.md) covers Vercel.

## How it is built

Slack sends every command, action and event to one route handler. Bolt verifies the signature,
acks within three seconds, and the listener finishes its work under `waitUntil`. Every instant
is stored as UTC and rendered in the reader's time zone.

Code is grouped by feature, and the layers are enforced by ESLint rather than by convention:
`src/domain` is pure functions, renderers never fetch, and UI can never import the database
client or credentials.

```
src/app/api/slack/events/route.ts   the only Slack entry point
src/features/<surface>/             listener · blocks · schema · tests, side by side
src/domain/                         slots, tally, calendar links (pure)
src/slack/                          Block Kit helpers, limits, surface ids
src/db/                             Drizzle schema, client, queries
docs/                               living docs, link-checked in CI
```

Read [Architecture](./docs/ARCHITECTURE.md) for the request lifecycle and the dependency rules,
[Data model](./docs/DATA_MODEL.md) for the tables, and the [Feature map](./docs/FEATURE_MAP.md)
for every Slack surface and how to reproduce it.

Stack: Next.js 16 · `@slack/bolt` + `@vercel/slack-bolt` · Neon Postgres + Drizzle · Vercel.

The same code builds as a library (`pnpm build:lib`) for a host that embeds the poll in its own
app; see [Embedding in another app](./docs/ARCHITECTURE.md#embedding-in-another-app).

## Development

| Command                           | What it does                                                                                         |
| --------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `pnpm verify`                     | Typecheck, lint, format, tests, docs links, feature map, blog check, smoke imports, production build |
| `pnpm test`                       | Unit tests (vitest; PGlite stands in for Postgres)                                                   |
| `pnpm slack:sign --command /when` | Sign and POST a payload the way Slack does                                                           |
| `pnpm render:fixture <name>`      | Print Block Kit JSON for a fixture poll                                                              |
| `pnpm health`                     | Check whether a running instance is worth driving                                                    |
| `pnpm db:generate`                | Regenerate SQL migrations from `src/db/schema.ts`                                                    |
| `pnpm pack:check`                 | Build the library and check the tarball holds only what a host needs                                 |

## Contributing

Issues and pull requests are welcome. Start with [CONTRIBUTING.md](./CONTRIBUTING.md); it is
short. Security reports go through [SECURITY.md](./SECURITY.md), not the issue tracker.

## License

[MIT](./LICENSE).
