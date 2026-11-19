import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { pool } from "@/db";
import { deleteDraft, getMessage, listMessages, publishMessage, updateMessage } from "@/server/leader";
import { latestPublishedMessage } from "@/server/messages";
import { draftTakeaways } from "@/server/ai";
import { makeChurch, makeMessage, resetDb } from "./helpers";

beforeEach(resetDb);
afterAll(() => pool.end());

const fields = {
  title: "Edited",
  speaker: "",
  date: "2026-11-15",
  scripture: [],
  link: "",
  transformation: "t",
  takeaways: [{ know: "k", act: "a" }],
};

describe("leader scoping", () => {
  it("can't read or change another church's messages", async () => {
    const a = await makeChurch("AAAA");
    const b = await makeChurch("BBBB");
    const other = await makeMessage(b.id, "draft", "B's draft");
    expect(await getMessage(a.id, other.id)).toBeNull();
    expect(await listMessages(a.id)).toHaveLength(0);
    expect(await updateMessage(a.id, other.id, fields)).toBe(false);
    expect(await publishMessage(a.id, other.id)).toBe(false);
    expect(await deleteDraft(a.id, other.id)).toBe(false);
    expect((await getMessage(b.id, other.id))?.status).toBe("draft");
  });

  it("publishing makes a draft visible to members, once", async () => {
    const c = await makeChurch();
    const m = await makeMessage(c.id, "draft");
    expect(await latestPublishedMessage(c.id)).toBeNull();
    expect(await publishMessage(c.id, m.id)).toBe(true);
    expect((await latestPublishedMessage(c.id))?.id).toBe(m.id);
    expect(await publishMessage(c.id, m.id)).toBe(false);
  });

  it("can't delete a published message", async () => {
    const c = await makeChurch();
    const m = await makeMessage(c.id, "published");
    expect(await deleteDraft(c.id, m.id)).toBe(false);
  });
});

describe("no API key", () => {
  it("says so instead of calling Claude", async () => {
    const saved = process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    expect(await draftTakeaways("some text")).toEqual({ ok: false, reason: "no_key" });
    if (saved) process.env.ANTHROPIC_API_KEY = saved;
  });
});
