# Data model

Source of truth: `src/db/schema.ts` (Drizzle). Migrations are numbered SQL files in
`drizzle/`, generated with `pnpm db:generate` and applied with `pnpm db:migrate`. Nothing
else writes DDL: there is no `drizzle-kit push` script on purpose (it diffs its model against
the live database and proposes dropping what it does not know about).

## Tables

```
polls          id uuid pk · team_id · channel_id · message_ts? · creator_id · title(≤150)
               creator_tz · slot_minutes ∈ {15,30,60} (check) · status ∈ {open,closed,scheduled} (check)
               final_slot_start? · created_at · updated_at
poll_slots     (poll_id, slot_start) pk · fk polls cascade
participants   (poll_id, user_id) pk · tz · display_name · responded_at · fk polls cascade
availability   (poll_id, user_id, slot_start) pk
               fk (poll_id, slot_start) → poll_slots cascade
               fk (poll_id, user_id) → participants cascade
               index (poll_id, slot_start)
slack_users    (team_id, user_id) pk · tz · display_name · fetched_at      ← users.info cache
```

The check constraints on `slot_minutes` and `status` are generated from `SLOT_MINUTES` and
`POLL_STATUSES` in `src/domain/constants.ts`, the same constants the modal and zod parser use.

## Semantics

- A **participant row with zero availability rows** means "none of these work for me". It counts as responded.
- **Saving a response is replace-all** for that user, in **one SQL statement** with data-modifying CTEs (`saveResponse` in `src/db/queries.ts`): upsert `participants`, delete that user's `availability` rows not in the new set, insert the rows not yet present (`ON CONFLICT DO NOTHING`). A single statement is atomic on every driver, so the same code runs on neon-http in production and PGlite in tests; no `batch`, no `transaction`. A slot outside `poll_slots` violates the FK and rejects the whole statement.
- **Creating a poll** inserts the poll and all its slots the same way, in one statement.
- **Queries take the database as their first argument** (`Db` in `src/db/queries.ts`); listeners pass the Neon `db` from `src/db/client.ts`, tests pass a PGlite instance with the real migrations applied (`tests/db/pglite.ts`).
- **Concurrent submits:** every re-render reads fresh aggregates _after_ its write commits, so last-writer-wins on `chat.update` still shows complete data.
- `message_ts` is null between insert and a successful `chat.postMessage`. If posting fails the poll row is deleted.

## Migrations

| Step              | Command            | Notes                                                                           |
| ----------------- | ------------------ | ------------------------------------------------------------------------------- |
| Change the schema | edit `schema.ts`   |                                                                                 |
| Generate SQL      | `pnpm db:generate` | CI fails if `drizzle/` is out of date with `schema.ts`                          |
| Apply             | `pnpm db:migrate`  | Uses `DATABASE_URL`. CI applies every migration to an empty Postgres 17, twice. |

Applied migrations are tracked in `drizzle.__drizzle_migrations`.
