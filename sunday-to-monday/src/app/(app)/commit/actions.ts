"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { todayInTz } from "@/lib/dates";
import { iWillSchema, modeSchema, templatePlan } from "@/lib/plan";
import { aiAvailable, draftPlan, planRateLimit } from "@/server/ai";
import { churchTimezone, createCommitment, loopForMessage, publishedMessageForMember } from "@/server/member";
import { requireMember } from "@/server/session";

export type CommitState = { error?: string };

export async function commitToStep(_prev: CommitState, formData: FormData): Promise<CommitState> {
  const user = await requireMember();
  const messageId = z.uuid().safeParse(formData.get("messageId"));
  const index = z.coerce.number().int().min(0).max(4).safeParse(formData.get("takeawayIndex"));
  if (!messageId.success || !index.success) return { error: "Something went wrong. Please go back to the recap." };

  const iWill = iWillSchema.safeParse(String(formData.get("iWill") ?? ""));
  if (!iWill.success) return { error: iWill.error.issues[0]?.message };
  const mode = modeSchema.safeParse(formData.get("mode"));
  if (!mode.success) return { error: mode.error.issues[0]?.message };

  const message = await publishedMessageForMember(user.churchId, messageId.data);
  const takeaway = message?.takeaways[index.data];
  if (!message || !takeaway) return { error: "That recap isn't available anymore." };
  if (await loopForMessage(user.id, message.id)) redirect("/today");

  let plan = templatePlan(mode.data);
  let source = "template";
  if (aiAvailable() && (await planRateLimit(user.id, user.churchId))) {
    const result = await draftPlan({ know: takeaway.know, act: takeaway.act, iWill: iWill.data, mode: mode.data });
    if (result.ok) {
      plan = result.data;
      source = "ai";
    }
  }

  const tz = await churchTimezone(user.churchId);
  await createCommitment({
    userId: user.id,
    messageId: message.id,
    takeawayIndex: index.data,
    iWill: iWill.data,
    mode: mode.data,
    startDate: todayInTz(tz),
    plan,
  });
  revalidatePath("/today");
  revalidatePath("/recap");
  redirect(`/today?plan=${source}`);
}
