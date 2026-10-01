import "server-only";

import { neon } from "@neondatabase/serverless";
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";

import { requireEnv } from "@/lib/env";

import * as schema from "./schema";

export type Db = NeonHttpDatabase<typeof schema>;

let instance: Db | undefined;

/**
 * neon-http: one HTTP request per query, no connection to keep warm — right for Fluid
 * Compute. Built on first use, never at import time: `next build` imports route modules
 * to collect metadata on a host that may have no environment variables at all.
 */
export function getDb(): Db {
  return (instance ??= drizzle(neon(requireEnv("DATABASE_URL")), { schema }));
}

/**
 * Lazy alias so listeners can `import { db }` and pass it to `src/db/queries.ts`. Every
 * property read forwards to the real client, which is created on the first read.
 */
export const db: Db = new Proxy({} as Db, {
  get: (_target, prop) => Reflect.get(getDb(), prop, getDb()),
});
