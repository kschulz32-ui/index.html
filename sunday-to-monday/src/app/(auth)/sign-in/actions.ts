"use server";

import { headers } from "next/headers";
import { db } from "@/db";
import { normalizeEmail } from "@/lib/validate";
import { createLoginToken } from "@/server/auth-core";
import { devEmailVisible, sendEmail } from "@/server/email";
import { rateLimit } from "@/server/rate-limit";

export type SignInState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | { status: "sent"; email: string; devLink?: string };

export async function requestLink(_prev: SignInState, formData: FormData): Promise<SignInState> {
  const email = normalizeEmail(String(formData.get("email") ?? ""));
  if (!email) return { status: "error", message: "That email doesn't look right. Try again?" };

  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const allowed =
    (await rateLimit(db, `signin:email:${email}`, 5, 3600)) &&
    (await rateLimit(db, `signin:ip:${ip}`, 30, 3600));
  if (!allowed) {
    return { status: "error", message: "Too many sign-in links for now. Please wait a bit and try again." };
  }

  const token = await createLoginToken(db, email);
  const base = process.env.APP_URL ?? "http://localhost:3000";
  const link = `${base}/auth/verify?token=${encodeURIComponent(token)}`;

  await sendEmail({
    to: email,
    subject: "Your sign-in link for Sunday to Monday",
    text: `Tap this link to sign in. It works once and expires in 15 minutes.\n\n${link}\n\nIf you didn't ask for this, you can ignore it.`,
  });

  return { status: "sent", email, devLink: devEmailVisible() ? link : undefined };
}
