import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { PGlite } from "@electric-sql/pglite";
import { sql } from "drizzle-orm";
import type { MigrationConfig } from "drizzle-orm/migrator";
import { drizzle, type PgliteDatabase } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { describe, expect, it } from "vitest";

import { CORE_MIGRATIONS } from "./migrations";

const CORE_TABLES = ["availability", "participants", "poll_slots", "polls", "slack_users"];

/** What a host's own drizzle folder looks like: one journal entry, created after the core's. */
function hostMigrationsFolder(): string {
  const dir = mkdtempSync(path.join(tmpdir(), "host-migrations-"));
  mkdirSync(path.join(dir, "meta"));
  writeFileSync(
    path.join(dir, "meta", "_journal.json"),
    JSON.stringify({
      version: "7",
      dialect: "postgresql",
      entries: [
        { idx: 0, version: "7", when: Date.now(), tag: "0000_host_accounts", breakpoints: true },
      ],
    }),
  );
  writeFileSync(
    path.join(dir, "0000_host_accounts.sql"),
    'CREATE TABLE "host_accounts" ("team_id" text PRIMARY KEY, "plan" text NOT NULL);\n',
  );
  return dir;
}

async function publicTables(db: PgliteDatabase): Promise<string[]> {
  const result = await db.execute<{ table_name: string }>(
    sql`select table_name from information_schema.tables where table_schema = 'public' order by table_name`,
  );
  return result.rows.map((r) => r.table_name);
}

describe("a host running the core's migrations next to its own", () => {
  it("applies the core first, then its own, and a second run of both changes nothing", async () => {
    const db = drizzle(new PGlite());
    const host: MigrationConfig = {
      migrationsFolder: hostMigrationsFolder(),
      migrationsTable: "__host_migrations",
    };
    await migrate(db, CORE_MIGRATIONS);
    await migrate(db, host);
    const expected = [...CORE_TABLES, "host_accounts"].sort();
    expect(await publicTables(db)).toEqual(expected);

    await migrate(db, CORE_MIGRATIONS);
    await migrate(db, host);
    expect(await publicTables(db)).toEqual(expected);
  });

  it("with separate journal tables, order does not matter", async () => {
    const db = drizzle(new PGlite());
    await migrate(db, {
      migrationsFolder: hostMigrationsFolder(),
      migrationsTable: "__host_migrations",
    });
    await migrate(db, CORE_MIGRATIONS);
    expect(await publicTables(db)).toEqual([...CORE_TABLES, "host_accounts"].sort());
  });

  it("with one shared journal table, the older core migrations are silently skipped", async () => {
    const db = drizzle(new PGlite());
    await migrate(db, { migrationsFolder: hostMigrationsFolder() });
    await migrate(db, CORE_MIGRATIONS);
    expect(await publicTables(db)).toEqual(["host_accounts"]);
  });
});
