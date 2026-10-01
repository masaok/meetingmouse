# Deployment

Meeting Mouse deploys as one Next.js app. The reference host is Vercel (Fluid Compute, Node.js
runtime, never Edge). The only host-specific code is `@vercel/slack-bolt`'s receiver, which
needs `waitUntil` to finish listener work after the 3 s ack.

## Vercel

1. Import the repository into a Vercel project. Pushes to `main` deploy production through the
   Git integration; `vercel --prod` also works.
2. Set the secrets once, for Production and Preview, never in the repository:

```bash
vercel env add SLACK_BOT_TOKEN production
vercel env add SLACK_SIGNING_SECRET production
vercel env add DATABASE_URL production      # or provision Neon: vercel integration add neon
```

3. The production build must succeed with no variables at all; the CI build job runs with none
   on purpose. Env is read lazily at request time, never at import time.

## Slack app URLs

`manifest.json` points every URL at `https://www.meetingmouse.net/api/slack/events`, the hosted
instance. For your own deployment, replace the three URLs with your host before creating the
app from the manifest. After the first production deploy, confirm in api.slack.com/apps that
Slash Commands, Interactivity and Event Subscriptions all show that URL and that Event
Subscriptions verified (green check).

## Migrations in production

Run `pnpm db:migrate` with the production `DATABASE_URL` before deploying a schema change.
The build does not run migrations (one writer, run deliberately).

## Required status checks

Branch protection on `main` should require these job names, exactly:

- `Types, lint, format`
- `Unit tests`
- `Migrations apply from empty`
- `Production build`
- `Smoke imports`
- `Docs links`
- `Package`

This is a repository setting, not a file, so it is the step that gets forgotten. Verify under
Settings → Branches.

## Preview deployments

Every PR gets a Vercel preview. Slack cannot be pointed at more than one URL per app, so
previews are exercised with `pnpm slack:sign --url https://<preview>/api/slack/events`,
not from a workspace. `@vercel/slack-bolt` can create a Slack app per preview branch
(`vercel-slack build`); deliberately not enabled, see [Engineering practices](./ENGINEERING_PRACTICES.md#explicitly-not-adopted).
