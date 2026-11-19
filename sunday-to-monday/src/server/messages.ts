import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { messages } from "@/db/schema";

/**
 * The only way member screens read messages. Always filters to the member's
 * own church AND status = published, so drafts never reach members.
 */
export async function latestPublishedMessage(churchId: string) {
  const [m] = await db
    .select({
      id: messages.id,
      title: messages.title,
      speaker: messages.speaker,
      date: messages.date,
      scripture: messages.scripture,
      takeaways: messages.takeaways,
      transformation: messages.transformation,
      link: messages.link,
      publishedAt: messages.publishedAt,
    })
    .from(messages)
    .where(and(eq(messages.churchId, churchId), eq(messages.status, "published")))
    .orderBy(desc(messages.date), desc(messages.publishedAt))
    .limit(1);
  return m ?? null;
}
