import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { db } from "@/db";
import {
  TAKEAWAY_SYSTEM_PROMPT,
  aiDraftSchema,
  buildTakeawayUserMessage,
  normalizeAiDraft,
  type AiDraft,
} from "@/lib/takeaways";
import { rateLimit } from "./rate-limit";

export const MODEL = "claude-opus-5-5";

/** The app works without a key: leaders write takeaways and members get templates. */
export function aiAvailable(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

let client: Anthropic | null = null;
function getClient(): Anthropic {
  // Reads ANTHROPIC_API_KEY on the server only. Nothing here is sent to the browser.
  client ??= new Anthropic({ timeout: 90_000, maxRetries: 2 });
  return client;
}

export type AiResult<T> =
  | { ok: true; data: T }
  | { ok: false; reason: "no_key" | "rate_limited" | "failed" | "refused" };

/** Per-user and per-church limits on Claude calls. */
export async function aiRateLimit(userId: string, churchId: string): Promise<boolean> {
  const userOk = await rateLimit(db, `ai:user:${userId}`, 12, 3600);
  const churchOk = await rateLimit(db, `ai:church:${churchId}`, 60, 86_400);
  return userOk && churchOk;
}

/** Ask Claude for a draft recap. The transcript must already be sanitized. */
export async function draftTakeaways(transcript: string): Promise<AiResult<AiDraft>> {
  if (!aiAvailable()) return { ok: false, reason: "no_key" };
  try {
    const response = await getClient().beta.messages.parse({
      model: MODEL,
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "medium", format: betaZodOutputFormat(aiDraftSchema) },
      system: TAKEAWAY_SYSTEM_PROMPT,
      messages: [{ role: "user", content: buildTakeawayUserMessage(transcript) }],
    });
    if (response.stop_reason === "refusal") return { ok: false, reason: "refused" };
    const draft = normalizeAiDraft(response.parsed_output);
    return draft ? { ok: true, data: draft } : { ok: false, reason: "failed" };
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) {
      console.warn("Claude rate limited");
      return { ok: false, reason: "rate_limited" };
    }
    if (error instanceof Anthropic.APIError) {
      console.error(`Claude API error ${error.status}`);
    } else {
      console.error("Claude call failed", error instanceof Error ? error.message : error);
    }
    return { ok: false, reason: "failed" };
  }
}
