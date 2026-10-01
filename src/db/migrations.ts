import { fileURLToPath } from "node:url";

import type { MigrationConfig } from "drizzle-orm/migrator";

/**
 * The core's migrations, for `migrate(db, CORE_MIGRATIONS)` with the migrator of the host's
 * driver (`drizzle-orm/neon-http/migrator`, `drizzle-orm/pglite/migrator`, ...). A host keeps
 * its own journal in a different table (`migrationsTable`): drizzle applies only entries newer
 * than the last row in the table it is given, so two journals sharing one table skip each
 * other's older migrations. `src/db/migrations.test.ts` proves both halves of that sentence.
 */
export const CORE_MIGRATIONS: MigrationConfig = {
  migrationsFolder: fileURLToPath(new URL("../../drizzle/", import.meta.url)),
};
