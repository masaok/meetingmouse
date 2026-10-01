# Local development

```bash
pnpm install          # installs git hooks too (husky)
cp .env.example .env.local
pnpm dev              # warns about missing env, serves http://localhost:3000
```

## Environment variables

`src/lib/env.ts` validates these at every entry point and names what is missing.

| Variable               | Where to get it                                                                                                                          |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `SLACK_BOT_TOKEN`      | api.slack.com/apps → your app → OAuth & Permissions → Bot User OAuth Token                                                               |
| `SLACK_SIGNING_SECRET` | api.slack.com/apps → your app → Basic Information → Signing Secret                                                                       |
| `DATABASE_URL`         | Vercel → Storage → Neon (or console.neon.tech), the **pooled** connection string                                                         |
| `APP_BASE_URL`         | Optional. The origin people reach the app at. Turns on the [web grid](./WEB_GRID.md); on Vercel the production domain is used when unset |
| `NGROK_AUTH_TOKEN`     | Optional. dashboard.ngrok.com, for `pnpm dev:tunnel`                                                                                     |

After linking (`vercel link`), `vercel env pull .env.local` fills the first three.

## Creating the Slack app

api.slack.com/apps → Create New App → From a manifest → paste `manifest.json`. For local
work replace the three `https://www.meetingmouse.net/...` URLs with your tunnel URL, or let
`pnpm dev:tunnel` rewrite them (it restores the file on exit).

## Exercising the route without Slack

`scripts/slack-sign.ts` signs a payload the way Slack does and POSTs it:

```bash
pnpm slack:sign --command /when --text "Sprint planning"
pnpm slack:sign --payload tests/fixtures/payloads/respond_button.json
pnpm slack:sign --url https://<preview>.vercel.app/api/slack/events --command /when
```

With a real bot token this exercises the listener end to end. Without one, set
`SLACK_TOKEN_VERIFICATION=off` in `.env.local` so Bolt skips its `auth.test` call on first
request; a `200` then proves signature verification, routing and the `ack()`. Listener calls to
the Slack Web API fail on the fake token, and the failure is logged, not hidden. An unsigned
request must return `401`.

## Rendering blocks without Slack

`pnpm render:fixture <name>` prints the block JSON for a fixture poll. Paste it into
[Block Kit Builder](https://app.slack.com/block-kit-builder) to see it. Snapshot tests
cover the same renders.

## Database

```bash
docker run --rm -e POSTGRES_PASSWORD=postgres -p 5432:5432 postgres:17   # or a Neon branch
DATABASE_URL=postgres://postgres:postgres@localhost:5432/postgres pnpm db:migrate
```

## The gate

`pnpm verify` runs what CI runs: typecheck, lint, format check, unit tests, docs links,
feature map, smoke imports, production build. See [Testing](./TESTING.md).
