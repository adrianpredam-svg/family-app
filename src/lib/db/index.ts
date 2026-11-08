import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// Connect lazily (so `next build` works without a database) and reuse one pool.
const globalForDb = globalThis as unknown as { db?: PostgresJsDatabase<typeof schema> };

export function getDb() {
  if (!globalForDb.db) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not set");
    globalForDb.db = drizzle(postgres(url, { max: 10 }), { schema });
  }
  return globalForDb.db;
}

export { schema };
