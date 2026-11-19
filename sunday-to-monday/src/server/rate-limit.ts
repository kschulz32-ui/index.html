import { sql } from "drizzle-orm";
import type { DB } from "@/db";

/**
 * Fixed-window rate limit stored in Postgres, so it holds across server
 * instances. Returns true if the call is allowed.
 */
export async function rateLimit(
  db: DB,
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<boolean> {
  const result = await db.execute<{ count: number }>(sql`
    insert into rate_limit (key, window_start, count)
    values (${key}, now(), 1)
    on conflict (key) do update set
      count = case
        when rate_limit.window_start < now() - make_interval(secs => ${windowSeconds}) then 1
        else rate_limit.count + 1 end,
      window_start = case
        when rate_limit.window_start < now() - make_interval(secs => ${windowSeconds}) then now()
        else rate_limit.window_start end
    returning count
  `);
  return Number(result.rows[0]?.count ?? 0) <= limit;
}
