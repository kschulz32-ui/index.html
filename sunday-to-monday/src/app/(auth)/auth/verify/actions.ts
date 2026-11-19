"use server";

import { redirect } from "next/navigation";
import { db } from "@/db";
import { consumeLoginToken } from "@/server/auth-core";
import { startSession } from "@/server/session";

export async function confirmSignIn(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  const user = await consumeLoginToken(db, token);
  if (!user) redirect("/sign-in?error=expired");
  await startSession(user.id);
  redirect(user.churchId ? "/recap" : "/join");
}
