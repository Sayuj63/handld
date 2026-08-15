import dotenv from "dotenv";
dotenv.config({ path: ".env.local" }); // no-op in Next (already loaded); needed for scripts

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "../db/schema";

/**
 * Drizzle client bound to the full schema (auth tables + app tables).
 * The connection is lazy — postgres.js does not connect until the first
 * query — so importing this module never blocks on a missing DATABASE_URL.
 */
const connectionString =
  process.env.DATABASE_URL ?? "postgres://localhost:5432/changedesk";

// Reuse the connection across HMR reloads in dev.
const globalForDb = globalThis as unknown as { __changedeskClient?: postgres.Sql };

const client =
  globalForDb.__changedeskClient ??
  postgres(connectionString, {
    max: 1,
    prepare: false,
    ssl: connectionString.includes("sslmode=require") ? "require" : undefined,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.__changedeskClient = client;
}

export const db = drizzle(client, { schema });
export type Db = typeof db;
