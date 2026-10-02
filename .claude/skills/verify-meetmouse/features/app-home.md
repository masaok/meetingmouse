# App Home

The App Home tab lists the polls you organized and the polls you responded to, each linking to
its channel message. Phase 6; see `docs/ROADMAP.md`.

## Sub-features

- `home-empty` a user with no polls sees the how-to and empty states.
- `home-lists` organized and responded lists, newest first, capped at 10 each, with permalinks.
- `home-support` when the host passes `supportUrl` to `createMeetingMouse`, the tab ends with "Need help? Get support." linked to it; the reference app passes none, so the line is absent.

## How to get to it (user POV)

- Click the **Meeting Mouse** app in the Slack sidebar → **Home** tab.

## Driving it with slack-sign

Preconditions:

- Phase 6 merged (until then every step here is `unreachable: not implemented`).

- **Event reaches the listener.** Run `pnpm slack:sign --json tests/fixtures/payloads/app_home_opened.json`. Status `200`; log `action: 'home_published'` with counts.
- **Render.** Run `pnpm test src/features/app-home/blocks.test.ts` → empty state, populated lists, and the help line with and without a support URL.

## Gotchas

- `app_home_opened` fires for the Messages tab too; only `tab === "home"` publishes.
- Permalinks need `chat.getPermalink` per poll; a poll whose message was deleted renders without a link, not as an error.
