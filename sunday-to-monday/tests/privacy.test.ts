import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { pool } from "@/db";
import { latestPublishedMessage } from "@/server/messages";
import { makeChurch, makeMessage, resetDb } from "./helpers";

beforeEach(resetDb);
afterAll(() => pool.end());

describe("member message access", () => {
  it("never returns drafts", async () => {
    const c = await makeChurch();
    await makeMessage(c.id, "draft", "Secret draft");
    expect(await latestPublishedMessage(c.id)).toBeNull();
    await makeMessage(c.id, "published", "Live");
    expect((await latestPublishedMessage(c.id))?.title).toBe("Live");
  });

  it("never returns another church's message", async () => {
    const a = await makeChurch("AAAA");
    const b = await makeChurch("BBBB");
    await makeMessage(b.id, "published", "Other church");
    expect(await latestPublishedMessage(a.id)).toBeNull();
  });
});
