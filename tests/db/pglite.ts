import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";

import { CORE_MIGRATIONS } from "@/db/migrations";
import type { Db } from "@/db/queries";
import * as schema from "@/db/schema";

/** A fresh in-process Postgres with the real migrations applied. One per test file is plenty. */
export async function testDb(): Promise<Db> {
  const db = drizzle(new PGlite(), { schema });
  await migrate(db, CORE_MIGRATIONS);
  return db as unknown as Db;
}
