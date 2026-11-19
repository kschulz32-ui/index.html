"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { cleanText } from "@/lib/validate";
import { lastSundayInTz } from "@/lib/dates";
import {
  MAX_TAKEAWAYS,
  TRANSCRIPT_MAX,
  draftInputSchema,
  excerptOf,
  publishInputSchema,
  sanitizeTranscript,
  splitScripture,
} from "@/lib/takeaways";
import { aiAvailable, aiRateLimit, draftTakeaways } from "@/server/ai";
import { createDraft, deleteDraft, getChurch, getMessage, publishMessage, updateMessage } from "@/server/leader";
import { requireLeader } from "@/server/session";

const idSchema = z.uuid();

// ---------- Create ----------

export type CreateState = { error?: string; transcript?: string; speaker?: string; link?: string; date?: string };

export async function createMessage(_prev: CreateState, formData: FormData): Promise<CreateState> {
  const leader = await requireLeader();
  const church = await getChurch(leader.churchId);
  if (!church) return { error: "We couldn't find your church." };

  const useAi = formData.get("mode") === "ai";
  const rawTranscript = String(formData.get("transcript") ?? "");
  const keep: CreateState = {
    transcript: rawTranscript.slice(0, TRANSCRIPT_MAX + 1000),
    speaker: String(formData.get("speaker") ?? "").slice(0, 80),
    link: String(formData.get("link") ?? "").slice(0, 500),
    date: String(formData.get("date") ?? ""),
  };

  const meta = draftInputSchema.pick({ speaker: true, date: true, link: true }).safeParse({
    speaker: keep.speaker,
    date: keep.date || lastSundayInTz(church.timezone),
    link: keep.link,
  });
  if (!meta.success) return { ...keep, error: meta.error.issues[0]?.message };

  const transcript = sanitizeTranscript(rawTranscript);
  if (transcript.length > TRANSCRIPT_MAX) {
    return {
      ...keep,
      error: `That's about ${Math.round(transcript.length / 1000)}k characters. Please paste ${TRANSCRIPT_MAX / 1000}k or less, like the main teaching section.`,
    };
  }

  let notice: string | null = null;
  let fields = {
    title: "Sunday's message",
    scripture: [] as string[],
    transformation: "",
    takeaways: [] as { know: string; act: string }[],
  };

  if (useAi) {
    if (transcript.length < 200) {
      return { ...keep, error: "Paste a bit more of the message (at least a few paragraphs) so Claude has enough to work with." };
    }
    if (!aiAvailable()) {
      notice = "no_key";
    } else if (!(await aiRateLimit(leader.id, leader.churchId))) {
      return { ...keep, error: "You've drafted a lot recently. Please wait a while, or write the takeaways yourself." };
    } else {
      const result = await draftTakeaways(transcript);
      if (result.ok) fields = result.data;
      else notice = result.reason;
    }
  }

  const id = await createDraft(leader.churchId, leader.id, {
    ...fields,
    speaker: meta.data.speaker,
    date: meta.data.date,
    link: meta.data.link,
    transcriptExcerpt: transcript ? excerptOf(transcript) : null,
  });
  revalidatePath("/leader");
  redirect(`/leader/messages/${id}${notice ? `?notice=${notice}` : useAi ? "?notice=drafted" : ""}`);
}

// ---------- Edit / publish ----------

export type EditState = { error?: string; saved?: boolean; published?: boolean };

function readEditor(formData: FormData) {
  const count = Math.min(Math.max(Number(formData.get("takeawayCount") ?? 0) || 0, 0), MAX_TAKEAWAYS);
  const takeaways = Array.from({ length: count }, (_, i) => ({
    know: String(formData.get(`know_${i}`) ?? ""),
    act: String(formData.get(`act_${i}`) ?? ""),
  }));
  return {
    title: String(formData.get("title") ?? ""),
    speaker: String(formData.get("speaker") ?? ""),
    date: String(formData.get("date") ?? ""),
    scripture: splitScripture(cleanText(String(formData.get("scripture") ?? ""))),
    link: String(formData.get("link") ?? ""),
    transformation: String(formData.get("transformation") ?? ""),
    takeaways,
  };
}

export async function saveMessage(_prev: EditState, formData: FormData): Promise<EditState> {
  const leader = await requireLeader();
  const id = idSchema.safeParse(formData.get("id"));
  if (!id.success) return { error: "That message wasn't found." };
  const existing = await getMessage(leader.churchId, id.data);
  if (!existing) return { error: "That message wasn't found." };

  const publishing = formData.get("intent") === "publish";
  const strict = publishing || existing.status === "published";
  const parsed = (strict ? publishInputSchema : draftInputSchema).safeParse(readEditor(formData));
  if (!parsed.success) {
    const unique = [...new Set(parsed.error.issues.map((i) => i.message))];
    return { error: unique.join(" ") };
  }

  // Members' commitments point at a takeaway by position, so the list is
  // frozen once people can see it. Wording can still be fixed.
  if (existing.status === "published" && parsed.data.takeaways.length !== existing.takeaways.length) {
    return { error: "This recap is live, so takeaways can be reworded but not added or removed." };
  }

  await updateMessage(leader.churchId, id.data, parsed.data);
  if (publishing) {
    const ok = await publishMessage(leader.churchId, id.data);
    if (!ok) return { error: "This message is already published." };
  }
  revalidatePath("/leader");
  revalidatePath(`/leader/messages/${id.data}`);
  revalidatePath("/recap");
  return publishing ? { published: true } : { saved: true };
}

export async function removeDraft(formData: FormData) {
  const leader = await requireLeader();
  const id = idSchema.safeParse(formData.get("id"));
  if (id.success) await deleteDraft(leader.churchId, id.data);
  revalidatePath("/leader");
  redirect("/leader");
}
