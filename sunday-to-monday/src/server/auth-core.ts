// Auth logic with no Next.js imports, so it can be unit tested against a real DB.
import { and, eq, gt, isNull, lt, sql } from "drizzle-orm";
import type { DB } from "@/db";
import { loginTokens, sessions, users, type User } from "@/db/schema";
import { randomToken, sha256 } from "@/lib/tokens";

export const LOGIN_TOKEN_MINUTES = 15;
export const SESSION_DAYS = 30;

export async function createLoginToken(db: DB, email: string): Promise<string> {
  const token = randomToken();
  await db.insert(loginTokens).values({
    email,
    tokenHash: sha256(token),
    expiresAt: new Date(Date.now() + LOGIN_TOKEN_MINUTES * 60_000),
  });
  return token;
}

/**
 * Uses a magic link token exactly once. Returns the user (created on first
 * sign-in as a member with no church yet), or null if the token is bad,
 * expired or already used.
 */
export async function consumeLoginToken(db: DB, token: string): Promise<User | null> {
  if (!token || token.length > 100) return null;
  const [row] = await db
    .update(loginTokens)
    .set({ usedAt: new Date() })
    .where(
      and(
        eq(loginTokens.tokenHash, sha256(token)),
        isNull(loginTokens.usedAt),
        gt(loginTokens.expiresAt, new Date()),
      ),
    )
    .returning({ email: loginTokens.email });
  if (!row) return null;

  const existing = await findUserByEmail(db, row.email);
  if (existing) return existing;

  const [created] = await db
    .insert(users)
    .values({ email: row.email })
    .onConflictDoNothing()
    .returning();
  return created ?? (await findUserByEmail(db, row.email));
}

export async function findUserByEmail(db: DB, email: string): Promise<User | null> {
  const [u] = await db
    .select()
    .from(users)
    .where(sql`lower(${users.email}) = ${email.toLowerCase()}`)
    .limit(1);
  return u ?? null;
}

export async function createSession(db: DB, userId: string): Promise<{ token: string; expiresAt: Date }> {
  const token = randomToken();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  await db.insert(sessions).values({ tokenHash: sha256(token), userId, expiresAt });
  return { token, expiresAt };
}

export async function userForSessionToken(db: DB, token: string | undefined): Promise<User | null> {
  if (!token || token.length > 100) return null;
  const [row] = await db
    .select({ user: users })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.tokenHash, sha256(token)), gt(sessions.expiresAt, new Date())))
    .limit(1);
  return row?.user ?? null;
}

export async function deleteSession(db: DB, token: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.tokenHash, sha256(token)));
}

/** Housekeeping, called from the cron job later. */
export async function purgeExpiredAuth(db: DB): Promise<void> {
  const now = new Date();
  await db.delete(sessions).where(lt(sessions.expiresAt, now));
  await db.delete(loginTokens).where(lt(loginTokens.expiresAt, new Date(now.getTime() - 86_400_000)));
}
