"use client";

import { useState } from "react";

export function CopyButton({ text }: { text: string }) {
  const [status, setStatus] = useState<"idle" | "copied" | "failed">("idle");
  return (
    <div>
      <button
        type="button"
        className="btn w-full"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(text);
            setStatus("copied");
          } catch {
            setStatus("failed");
          }
        }}
      >
        Copy my log
      </button>
      <p className="mt-1 min-h-6 text-center text-sm text-muted" role="status">
        {status === "copied" ? "Copied. Paste it anywhere you keep notes." : status === "failed" ? "Couldn't copy here. Try a different browser." : ""}
      </p>
    </div>
  );
}
