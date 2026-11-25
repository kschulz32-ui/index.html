import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db, pool } from "@/db";
import { actionDays, events, lookbacks } from "@/db/schema";
import { templatePlan } from "@/lib/plan";
import {
  createCommitment,
  logForMember,
  loopById,
  loopForMessage,
  publishedMessageForMember,
  saveLookback,
  setDayDone,
  setDayText,
} from "@/server/member";
import { makeChurch, makeMessage, makeUser, resetDb } from "./helpers";

beforeEach(resetDb);
afterAll(() => pool.end());

async function setup() {
  const church = await makeChurch();
  const maria = await makeUser("maria@example.org", church.id);
  const sam = await makeUser("sam@example.org", church.id);
  const msg = await makeMessage(church.id, "published");
  const commitmentId = (await createCommitment({
    userId: maria.id,
    messageId: msg.id,
    takeawayIndex: 0,
    iWill: "call my mom",
    mode: "say",
    startDate: "2026-11-16",
    plan: templatePlan("say"),
  }))!;
  const loop = (await loopById(maria.id, commitmentId))!;
  return { church, maria, sam, msg, commitmentId, days: loop.days };
}

describe("one member can't touch another's entries", () => {
  it("can't read someone else's commitment, days or look-back", async () => {
    const { sam, msg, commitmentId } = await setup();
    expect(await loopById(sam.id, commitmentId)).toBeNull();
    expect(await loopForMessage(sam.id, msg.id)).toBeNull();
    expect(await logForMember(sam.id)).toEqual([]);
  });

  it("can't mark, note or reword someone else's day", async () => {
    const { sam, days } = await setup();
    expect(await setDayDone(sam.id, days[0].id, true, "sneaky", "2026-11-20")).toBe("not_found");
    expect(await setDayText(sam.id, days[0].id, "hacked")).toBe("not_found");
    const [row] = await db.select().from(actionDays).where(eq(actionDays.id, days[0].id));
    expect(row).toMatchObject({ done: false, note: null });
    expect(row.text).not.toBe("hacked");
  });

  it("can't write someone else's look-back", async () => {
    const { sam, commitmentId } = await setup();
    expect(await saveLookback(sam.id, commitmentId, "not mine", true)).toBe("not_found");
    expect(await db.select().from(lookbacks)).toHaveLength(0);
  });
});

describe("the week", () => {
  it("creates five days and only one loop per message", async () => {
    const { maria, msg, days } = await setup();
    expect(days.map((d) => d.dayIndex)).toEqual([0, 1, 2, 3, 4]);
    const again = await createCommitment({
      userId: maria.id, messageId: msg.id, takeawayIndex: 1, iWill: "x", mode: "do", startDate: "2026-11-16", plan: templatePlan("do"),
    });
    expect(again).toBeNull();
  });

  it("locks future days and lets past days be marked", async () => {
    const { maria, days } = await setup();
    expect(await setDayDone(maria.id, days[2].id, true, "", "2026-11-17")).toBe("locked");
    expect(await setDayDone(maria.id, days[0].id, true, "late but done", "2026-11-17")).toBe("ok");
    expect(await setDayDone(maria.id, days[1].id, true, "", "2026-11-17")).toBe("ok");
    const loop = await loopById(maria.id, days[0].commitmentId);
    expect(loop?.days[0]).toMatchObject({ done: true, note: "late but done" });
    expect(await setDayDone(maria.id, days[0].id, false, "", "2026-11-17")).toBe("ok");
    expect((await loopById(maria.id, days[0].commitmentId))?.days[0]).toMatchObject({ done: false, note: null });
  });

  it("keeps the look-back closed until day 5", async () => {
    const { maria, commitmentId } = await setup();
    expect(await saveLookback(maria.id, commitmentId, "too early", false)).toBe("locked");
    expect(await saveLookback(maria.id, commitmentId, "Patience grew.", true)).toBe("ok");
    expect(await saveLookback(maria.id, commitmentId, "Patience grew a lot.", true)).toBe("ok");
    expect((await loopById(maria.id, commitmentId))?.lookback).toBe("Patience grew a lot.");
  });

  it("records counts only, once per step", async () => {
    const { maria, msg, days, commitmentId } = await setup();
    await setDayDone(maria.id, days[0].id, true, "a private note", "2026-11-20");
    await setDayDone(maria.id, days[1].id, true, "", "2026-11-20");
    await saveLookback(maria.id, commitmentId, "private words", true);
    const rows = await db.select().from(events).where(eq(events.messageId, msg.id));
    expect(rows.map((r) => r.type).sort()).toEqual(["acted", "chose", "finished"]);
    expect(JSON.stringify(rows)).not.toContain("private");
  });

  it("members can't open a draft to commit to it", async () => {
    const { church } = await setup();
    const draft = await makeMessage(church.id, "draft");
    expect(await publishedMessageForMember(church.id, draft.id)).toBeNull();
  });
});
