// Applies database migrations from ./drizzle. Runs on every container start (safe to repeat).
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import path from "node:path";
import { fileURLToPath } from "node:url";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}
const here = path.dirname(fileURLToPath(import.meta.url));
const client = postgres(url, { max: 1 });
await migrate(drizzle(client), { migrationsFolder: path.join(here, "..", "drizzle") });
await client.end();
console.log("Migrations applied");
