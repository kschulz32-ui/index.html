import { sql } from "drizzle-orm";
import { db } from "@/db";
import { churches, messages, users } from "@/db/schema";

export async function resetDb() {
  await db.execute(sql`
    truncate table church, app_user, message, commitment, action_day, lookback,
      push_subscription, event, notification_send, login_token, session, rate_limit
    restart identity cascade
  `);
}

export async function makeChurch(code = "TEST1") {
  const [c] = await db.insert(churches).values({ name: "Test Church " + code, joinCode: code }).returning();
  return c;
}

export async function makeUser(email: string, churchId: string | null, role: "member" | "leader" | "admin" = "member") {
  const [u] = await db.insert(users).values({ email, churchId, role }).returning();
  return u;
}

export async function makeMessage(churchId: string, status: "draft" | "published", title = "A message") {
  const [m] = await db
    .insert(messages)
    .values({
      churchId,
      title,
      date: "2026-11-15",
      status,
      publishedAt: status === "published" ? new Date() : null,
      takeaways: [{ know: "k", act: "a" }],
    })
    .returning();
  return m;
}
