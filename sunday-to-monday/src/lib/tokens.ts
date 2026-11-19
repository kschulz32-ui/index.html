import { createHash, randomBytes } from "node:crypto";

/** 32 random bytes, URL-safe. Used for magic links and session cookies. */
export function randomToken(): string {
  return randomBytes(32).toString("base64url");
}

export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}
