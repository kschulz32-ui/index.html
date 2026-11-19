import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/db";
import type { User } from "@/db/schema";
import { createSession, deleteSession, userForSessionToken } from "./auth-core";

const COOKIE = "stm_session";

export async function startSession(userId: string) {
  const { token, expiresAt } = await createSession(db, userId);
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function endSession() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) await deleteSession(db, token);
  jar.delete(COOKIE);
}

/** The signed-in user for this request, or null. Cached per request. */
export const getCurrentUser = cache(async (): Promise<User | null> => {
  const token = (await cookies()).get(COOKIE)?.value;
  return userForSessionToken(db, token);
});

export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  return user;
}

/** Signed in and attached to a church. */
export async function requireMember(): Promise<User & { churchId: string }> {
  const user = await requireUser();
  if (!user.churchId) redirect("/join");
  return user as User & { churchId: string };
}

export async function requireLeader(): Promise<User & { churchId: string }> {
  const user = await requireMember();
  if (user.role !== "leader" && user.role !== "admin") redirect("/recap");
  return user;
}

export function isLeader(user: Pick<User, "role">) {
  return user.role === "leader" || user.role === "admin";
}
