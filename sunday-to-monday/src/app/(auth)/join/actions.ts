"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { churches, users } from "@/db/schema";
import { cleanText } from "@/lib/validate";
import { rateLimit } from "@/server/rate-limit";
import { requireUser } from "@/server/session";

export type JoinState = { error?: string; name?: string; code?: string };

const joinSchema = z.object({
  name: z.string().transform(cleanText).pipe(z.string().min(1, "Please add your first name.").max(80)),
  code: z
    .string()
    .transform((v) => cleanText(v).toUpperCase().replace(/\s+/g, ""))
    .pipe(z.string().min(4, "Ask your church for its join code.").max(16)),
});

export async function joinChurch(_prev: JoinState, formData: FormData): Promise<JoinState> {
  const user = await requireUser();
  if (user.churchId) redirect("/recap");

  const raw = { name: String(formData.get("name") ?? "").slice(0, 80), code: String(formData.get("code") ?? "").slice(0, 16) };
  const parsed = joinSchema.safeParse(raw);
  if (!parsed.success) return { ...raw, error: parsed.error.issues[0]?.message ?? "Please check the form." };

  if (!(await rateLimit(db, `join:${user.id}`, 10, 3600))) {
    return { ...raw, error: "Too many tries for now. Please wait a bit." };
  }

  const [church] = await db.select({ id: churches.id }).from(churches).where(eq(churches.joinCode, parsed.data.code));
  if (!church) return { ...raw, error: "We couldn't find that code. Check with your church and try again." };

  await db.update(users).set({ name: parsed.data.name, churchId: church.id }).where(eq(users.id, user.id));
  redirect("/recap");
}
