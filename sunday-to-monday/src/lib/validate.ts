import { z } from "zod";

/** Strip control characters (keep newlines and tabs) and trim. */
export function cleanText(value: string): string {
  return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim();
}

export const emailSchema = z
  .string()
  .transform((v) => cleanText(v).toLowerCase())
  .pipe(z.email({ message: "That email doesn't look right." }).max(254));

export function normalizeEmail(raw: string): string | null {
  const parsed = emailSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}
