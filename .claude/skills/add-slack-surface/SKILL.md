---
name: add-slack-surface
description: Add a new Slack command, shortcut, button action, view submission or event to Meeting Mouse with its listener, blocks, schema, tests, feature-map row and manifest change in the right places.
---

# Add a Slack surface

1. **Pick the feature directory** under `src/features/` (create one if the surface is new: `listener.ts`, `blocks.ts`, `schema.ts`).
2. **Name the id** as a constant in `src/slack/ids.ts`: `COMMAND_*`, `SHORTCUT_*`, `ACTION_*`, `CALLBACK_*`, or `EVENT_*`. Subscribe to it in `listener.ts` `register(app)`; a new directory also exports `feature = { name, register }` and is added to `coreFeatures` in `src/features/index.ts`.
3. **Ack first.** Commands/actions: `await ack()` before anything. Buttons that open modals: `views.open` a loading view first, then fetch, then `views.update`.
4. **Blocks are pure.** `blocks.ts` takes data and returns `KnownBlock[]`; no `@/db` imports. Reuse `src/slack/format.ts` for date tokens and escaping.
5. **Parse with zod** in `schema.ts`; return `response_action: "errors"` keyed by `block_id` on validation failure.
6. **Tests next to the code:** a snapshot for blocks, a worst-case size test if the block count depends on data, one test per validation rule, one test per authorization rule.
7. **Feature map row** in `docs/FEATURE_MAP.md` with a reproduce command; add a payload fixture under `tests/fixtures/payloads/` for interactive surfaces.
8. **Manifest:** new command, shortcut, scope or event → edit `manifest.json` and say in the PR that a human must re-apply it.
9. Add or update the feature recipe in `.claude/skills/verify-meetmouse/features/` (four H2s: Sub-features, How to get to it (user POV), Driving it with slack-sign, Gotchas).
10. Run the `verify-meetmouse` skill.
