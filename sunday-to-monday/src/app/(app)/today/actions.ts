"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { todayInTz } from "@/lib/dates";
import { actionTextSchema, lookbackSchema, noteSchema } from "@/lib/plan";
import { weekState } from "@/lib/week";
import { churchTimezone, loopById, saveLookback, setDayDone, setDayText } from "@/server/member";
import { requireMember } from "@/server/session";

export type DayState = { error?: string; ok?: boolean };

const RESULT_ERRORS = {
  not_found: "We couldn't find that day.",
  locked: "That day hasn't come yet.",
} as const;

export async function markDay(_prev: DayState, formData: FormData): Promise<DayState> {
  const user = await requireMember();
  const dayId = z.uuid().safeParse(formData.get("dayId"));
  if (!dayId.success) return { error: RESULT_ERRORS.not_found };
  const done = formData.get("done") === "1";
  const note = noteSchema.safeParse(String(formData.get("note") ?? ""));
  if (!note.success) return { error: note.error.issues[0]?.message };

  const today = todayInTz(await churchTimezone(user.churchId));
  const result = await setDayDone(user.id, dayId.data, done, note.data, today);
  if (result !== "ok") return { error: RESULT_ERRORS[result] };
  revalidatePath("/today");
  revalidatePath("/log");
  return { ok: true };
}

export async function editDay(_prev: DayState, formData: FormData): Promise<DayState> {
  const user = await requireMember();
  const dayId = z.uuid().safeParse(formData.get("dayId"));
  if (!dayId.success) return { error: RESULT_ERRORS.not_found };
  const text = actionTextSchema.safeParse(String(formData.get("text") ?? ""));
  if (!text.success) return { error: text.error.issues[0]?.message };
  const result = await setDayText(user.id, dayId.data, text.data);
  if (result !== "ok") return { error: RESULT_ERRORS[result] };
  revalidatePath("/today");
  revalidatePath("/log");
  return { ok: true };
}

export async function saveHarvest(_prev: DayState, formData: FormData): Promise<DayState> {
  const user = await requireMember();
  const id = z.uuid().safeParse(formData.get("commitmentId"));
  if (!id.success) return { error: RESULT_ERRORS.not_found };
  const text = lookbackSchema.safeParse(String(formData.get("text") ?? ""));
  if (!text.success) return { error: text.error.issues[0]?.message };

  const loop = await loopById(user.id, id.data);
  if (!loop) return { error: RESULT_ERRORS.not_found };
  const today = todayInTz(await churchTimezone(user.churchId));
  const { harvestOpen } = weekState(loop.commitment.startDate, today);
  const result = await saveLookback(user.id, id.data, text.data, harvestOpen);
  if (result === "locked") return { error: "The look-back opens on day 5." };
  if (result !== "ok") return { error: RESULT_ERRORS[result] };
  revalidatePath("/today");
  revalidatePath("/log");
  return { ok: true };
}
