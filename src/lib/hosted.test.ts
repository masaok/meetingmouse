import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { expect, it } from "vitest";

import { CORE_MIGRATIONS } from "../db/migrations";
import { STORED_DATA } from "./hosted";

it("the privacy policy names every column of the core's tables, and none they do not have", async () => {
  const pg = new PGlite();
  await migrate(drizzle(pg), CORE_MIGRATIONS);
  const real = await pg.query<{ name: string }>(
    `select table_name || '.' || column_name as name
     from information_schema.columns
     where table_schema = 'public' and table_name not like '\\_\\_%'
     order by 1`,
  );
  const named = STORED_DATA.filter((group) => !group.hostedOnly)
    .flatMap((group) => group.columns.map((c) => `${c.table}.${c.column}`))
    .sort();
  expect(named).toEqual(real.rows.map((r) => r.name));
  // Migrating a fresh in-process Postgres can pass the 5 s default when the suite runs in parallel.
}, 20_000);
