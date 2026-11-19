import "server-only";
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { churches, messages, type Takeaway } from "@/db/schema";

/**
 * Leader data access. Every query is scoped by the leader's church id, so a
 * leader can only ever touch their own church's messages. Nothing in this
 * file reads member tables.
 */

export async function getChurch(churchId: string) {
  const [c] = await db.select().from(churches).where(eq(churches.id, churchId));
  return c ?? null;
}

export async function listMessages(churchId: string) {
  return db
    .select({
      id: messages.id,
      title: messages.title,
      date: messages.date,
      status: messages.status,
      publishedAt: messages.publishedAt,
    })
    .from(messages)
    .where(eq(messages.churchId, churchId))
    .orderBy(desc(messages.date), desc(messages.createdAt))
    .limit(100);
}

export async function getMessage(churchId: string, id: string) {
  const [m] = await db
    .select()
    .from(messages)
    .where(and(eq(messages.id, id), eq(messages.churchId, churchId)));
  return m ?? null;
}

export type MessageFields = {
  title: string;
  speaker: string;
  date: string;
  scripture: string[];
  link: string;
  transformation: string;
  takeaways: Takeaway[];
};

export async function createDraft(
  churchId: string,
  createdBy: string,
  fields: MessageFields & { transcriptExcerpt: string | null },
) {
  const [m] = await db
    .insert(messages)
    .values({
      churchId,
      createdBy,
      status: "draft",
      title: fields.title,
      speaker: fields.speaker || null,
      date: fields.date,
      scripture: fields.scripture,
      link: fields.link || null,
      transformation: fields.transformation || null,
      takeaways: fields.takeaways,
      transcriptExcerpt: fields.transcriptExcerpt,
    })
    .returning({ id: messages.id });
  return m.id;
}

/** Returns false if the message isn't in this church. */
export async function updateMessage(churchId: string, id: string, fields: MessageFields): Promise<boolean> {
  const rows = await db
    .update(messages)
    .set({
      title: fields.title,
      speaker: fields.speaker || null,
      date: fields.date,
      scripture: fields.scripture,
      link: fields.link || null,
      transformation: fields.transformation || null,
      takeaways: fields.takeaways,
      updatedAt: new Date(),
    })
    .where(and(eq(messages.id, id), eq(messages.churchId, churchId)))
    .returning({ id: messages.id });
  return rows.length > 0;
}

/** Publishing is one-way and only from draft. Returns false if nothing changed. */
export async function publishMessage(churchId: string, id: string): Promise<boolean> {
  const rows = await db
    .update(messages)
    .set({ status: "published", publishedAt: sql`now()`, updatedAt: new Date() })
    .where(and(eq(messages.id, id), eq(messages.churchId, churchId), eq(messages.status, "draft")))
    .returning({ id: messages.id });
  return rows.length > 0;
}

export async function deleteDraft(churchId: string, id: string): Promise<boolean> {
  const rows = await db
    .delete(messages)
    .where(and(eq(messages.id, id), eq(messages.churchId, churchId), eq(messages.status, "draft")))
    .returning({ id: messages.id });
  return rows.length > 0;
}
