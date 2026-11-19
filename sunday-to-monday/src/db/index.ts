import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

export type DB = NodePgDatabase<typeof schema>;

const globalForDb = globalThis as unknown as { __stmPool?: Pool };

function makePool() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set. Copy .env.example to .env.local.");
  return new Pool({ connectionString: url, max: 10 });
}

// Reuse one pool across hot reloads in dev.
const pool = globalForDb.__stmPool ?? makePool();
if (process.env.NODE_ENV !== "production") globalForDb.__stmPool = pool;

export const db: DB = drizzle(pool, { schema });
export { pool, schema };
