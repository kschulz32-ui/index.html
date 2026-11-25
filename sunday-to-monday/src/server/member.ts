import "server-only";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  actionDays,
  churches,
  commitments,
  events,
  lookbacks,
  messages,
  users,
  type ActionDay,
} from "@/db/schema";
import { isUnlocked } from "@/lib/week";
import type { Mode } from "@/lib/plan";

/**
 * Member data access. Every function takes the signed-in member's own id and
 * filters by it, so one member can never read or change another's entries.
 * Callers must pass the id from the session, never from the request.
 */

export async function churchTimezone(churchId: string): Promise<string> {
  const [c] = await db.select({ tz: churches.timezone }).from(churches).where(eq(churches.id, churchId));
  return c?.tz ?? "UTC";
}

/** Counts only: no free text ever goes in here. Each step counts once. */
export async function recordEvent(userId: string, messageId: string, type: "opened" | "chose" | "acted" | "finished") {
  await db.insert(events).values({ userId, messageId, type }).onConflictDoNothing();
}

/** A published message in the member's church, or null (drafts and other churches are invisible). */
export async function publishedMessageForMember(churchId: string, messageId: string) {
  const [m] = await db
    .select({
      id: messages.id,
      title: messages.title,
      date: messages.date,
      takeaways: messages.takeaways,
      transformation: messages.transformation,
    })
    .from(messages)
    .where(and(eq(messages.id, messageId), eq(messages.churchId, churchId), eq(messages.status, "published")));
  return m ?? null;
}

export type Loop = {
  commitment: typeof commitments.$inferSelect;
  days: ActionDay[];
  lookback: string | null;
};

async function loadLoop(userId: string, where: ReturnType<typeof and>): Promise<Loop | null> {
  const [c] = await db
    .select()
    .from(commitments)
    .where(and(eq(commitments.userId, userId), where));
  if (!c) return null;
  const [days, lb] = await Promise.all([
    db.select().from(actionDays).where(eq(actionDays.commitmentId, c.id)).orderBy(asc(actionDays.dayIndex)),
    db.select({ text: lookbacks.text }).from(lookbacks).where(eq(lookbacks.commitmentId, c.id)),
  ]);
  return { commitment: c, days, lookback: lb[0]?.text ?? null };
}

export function loopForMessage(userId: string, messageId: string) {
  return loadLoop(userId, eq(commitments.messageId, messageId));
}

export function loopById(userId: string, commitmentId: string) {
  return loadLoop(userId, eq(commitments.id, commitmentId));
}

/** Creates the commitment and its five days in one transaction. Returns null if one already exists. */
export async function createCommitment(input: {
  userId: string;
  messageId: string;
  takeawayIndex: number;
  iWill: string;
  mode: Mode;
  startDate: string;
  plan: string[];
}): Promise<string | null> {
  return db.transaction(async (tx) => {
    const [c] = await tx
      .insert(commitments)
      .values({
        userId: input.userId,
        messageId: input.messageId,
        takeawayIndex: input.takeawayIndex,
        iWill: input.iWill,
        mode: input.mode,
        startDate: input.startDate,
      })
      .onConflictDoNothing()
      .returning({ id: commitments.id });
    if (!c) return null;
    await tx.insert(actionDays).values(input.plan.map((text, dayIndex) => ({ commitmentId: c.id, dayIndex, text })));
    await tx
      .insert(events)
      .values({ userId: input.userId, messageId: input.messageId, type: "chose" })
      .onConflictDoNothing();
    return c.id;
  });
}

/** Finds one of the member's own days, plus what we need to check the lock. */
async function ownDay(userId: string, dayId: string) {
  const [row] = await db
    .select({ day: actionDays, startDate: commitments.startDate, messageId: commitments.messageId })
    .from(actionDays)
    .innerJoin(commitments, eq(commitments.id, actionDays.commitmentId))
    .where(and(eq(actionDays.id, dayId), eq(commitments.userId, userId)));
  return row ?? null;
}

export type DayResult = "ok" | "not_found" | "locked";

export async function setDayDone(userId: string, dayId: string, done: boolean, note: string, today: string): Promise<DayResult> {
  const row = await ownDay(userId, dayId);
  if (!row) return "not_found";
  if (!isUnlocked(row.day.dayIndex, row.startDate, today)) return "locked";
  await db
    .update(actionDays)
    .set(done ? { done: true, note: note || null, doneAt: new Date() } : { done: false, note: null, doneAt: null })
    .where(eq(actionDays.id, dayId));
  if (done) await recordEvent(userId, row.messageId, "acted");
  return "ok";
}

/** AI output is a draft: members can reword any of their own actions. */
export async function setDayText(userId: string, dayId: string, text: string): Promise<DayResult> {
  const row = await ownDay(userId, dayId);
  if (!row) return "not_found";
  await db.update(actionDays).set({ text }).where(eq(actionDays.id, dayId));
  return "ok";
}

export async function saveLookback(userId: string, commitmentId: string, text: string, harvestOpen: boolean): Promise<DayResult> {
  const [c] = await db
    .select({ id: commitments.id, messageId: commitments.messageId })
    .from(commitments)
    .where(and(eq(commitments.id, commitmentId), eq(commitments.userId, userId)));
  if (!c) return "not_found";
  if (!harvestOpen) return "locked";
  await db
    .insert(lookbacks)
    .values({ commitmentId: c.id, text })
    .onConflictDoUpdate({ target: lookbacks.commitmentId, set: { text } });
  await recordEvent(userId, c.messageId, "finished");
  return "ok";
}

export async function setShareCounts(userId: string, on: boolean) {
  await db.update(users).set({ shareCounts: on }).where(eq(users.id, userId));
}

export type LogWeek = {
  commitmentId: string;
  title: string;
  date: string;
  heard: string;
  iWill: string;
  mode: Mode | null;
  days: { dayIndex: number; text: string; done: boolean; note: string | null }[];
  lookback: string | null;
};

/** The member's own private log, newest week first. */
export async function logForMember(userId: string): Promise<LogWeek[]> {
  const rows = await db
    .select({
      id: commitments.id,
      takeawayIndex: commitments.takeawayIndex,
      iWill: commitments.iWill,
      mode: commitments.mode,
      title: messages.title,
      date: messages.date,
      takeaways: messages.takeaways,
      lookback: lookbacks.text,
    })
    .from(commitments)
    .innerJoin(messages, eq(messages.id, commitments.messageId))
    .leftJoin(lookbacks, eq(lookbacks.commitmentId, commitments.id))
    .where(eq(commitments.userId, userId))
    .orderBy(desc(messages.date), desc(commitments.createdAt));
  if (rows.length === 0) return [];

  const days = await db
    .select()
    .from(actionDays)
    .where(inArray(actionDays.commitmentId, rows.map((r) => r.id)))
    .orderBy(asc(actionDays.dayIndex));

  return rows.map((r) => ({
    commitmentId: r.id,
    title: r.title,
    date: r.date,
    heard: r.takeaways[r.takeawayIndex]?.know ?? "",
    iWill: r.iWill,
    mode: r.mode,
    days: days
      .filter((d) => d.commitmentId === r.id)
      .map((d) => ({ dayIndex: d.dayIndex, text: d.text, done: d.done, note: d.note })),
    lookback: r.lookback,
  }));
}
