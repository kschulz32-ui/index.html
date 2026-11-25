"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { setShareCounts } from "@/server/member";
import { endSession, requireMember } from "@/server/session";

export async function signOut() {
  await endSession();
  redirect("/sign-in");
}

export async function updateShareCounts(formData: FormData) {
  const user = await requireMember();
  await setShareCounts(user.id, formData.get("shareCounts") === "on");
  revalidatePath("/log");
}
