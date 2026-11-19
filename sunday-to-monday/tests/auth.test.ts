import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db, pool } from "@/db";
import { loginTokens } from "@/db/schema";
import {
  consumeLoginToken,
  createLoginToken,
  createSession,
  deleteSession,
  userForSessionToken,
} from "@/server/auth-core";
import { rateLimit } from "@/server/rate-limit";
import { sha256 } from "@/lib/tokens";
import { normalizeEmail } from "@/lib/validate";
import { makeChurch, makeUser, resetDb } from "./helpers";

beforeEach(resetDb);
afterAll(() => pool.end());

describe("magic link", () => {
  it("works exactly once", async () => {
    const church = await makeChurch();
    const u = await makeUser("a@example.org", church.id);
    const token = await createLoginToken(db, "a@example.org");
    expect((await consumeLoginToken(db, token))?.id).toBe(u.id);
    expect(await consumeLoginToken(db, token)).toBeNull();
  });

  it("rejects expired and unknown tokens", async () => {
    const token = await createLoginToken(db, "b@example.org");
    await db.update(loginTokens).set({ expiresAt: new Date(Date.now() - 1000) }).where(eq(loginTokens.tokenHash, sha256(token)));
    expect(await consumeLoginToken(db, token)).toBeNull();
    expect(await consumeLoginToken(db, "not-a-token")).toBeNull();
    expect(await consumeLoginToken(db, "")).toBeNull();
  });

  it("stores only a hash of the token", async () => {
    const token = await createLoginToken(db, "c@example.org");
    const rows = await db.select().from(loginTokens);
    expect(rows[0].tokenHash).toBe(sha256(token));
    expect(JSON.stringify(rows)).not.toContain(token);
  });

  it("creates a new member with no church on first sign-in", async () => {
    const token = await createLoginToken(db, "new@example.org");
    const user = await consumeLoginToken(db, token);
    expect(user).toMatchObject({ email: "new@example.org", role: "member", churchId: null, shareCounts: false });
  });

  it("matches existing users case-insensitively", async () => {
    const u = await makeUser("Mixed@Example.org", null);
    const token = await createLoginToken(db, normalizeEmail(" MIXED@example.org ")!);
    expect((await consumeLoginToken(db, token))?.id).toBe(u.id);
  });
});

describe("sessions", () => {
  it("looks up and ends sessions", async () => {
    const u = await makeUser("s@example.org", null);
    const { token } = await createSession(db, u.id);
    expect((await userForSessionToken(db, token))?.id).toBe(u.id);
    expect(await userForSessionToken(db, token + "x")).toBeNull();
    expect(await userForSessionToken(db, undefined)).toBeNull();
    await deleteSession(db, token);
    expect(await userForSessionToken(db, token)).toBeNull();
  });
});

describe("rate limit", () => {
  it("allows up to the limit in a window", async () => {
    const results = [];
    for (let i = 0; i < 4; i++) results.push(await rateLimit(db, "k", 3, 60));
    expect(results).toEqual([true, true, true, false]);
    expect(await rateLimit(db, "other", 3, 60)).toBe(true);
  });
});

describe("email validation", () => {
  it("normalizes and rejects junk", () => {
    expect(normalizeEmail("  Hi@Example.ORG ")).toBe("hi@example.org");
    expect(normalizeEmail("nope")).toBeNull();
    expect(normalizeEmail("a@b.co\u0000")).toBe("a@b.co");
  });
});
