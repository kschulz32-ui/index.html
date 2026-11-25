"use client";

import { useRef } from "react";
import { updateShareCounts } from "./actions";

export function ShareToggle({ on }: { on: boolean }) {
  const form = useRef<HTMLFormElement>(null);
  return (
    <form ref={form} action={updateShareCounts}>
      <label className="flex min-h-11 cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          name="shareCounts"
          defaultChecked={on}
          onChange={() => form.current?.requestSubmit()}
          className="mt-1 h-5 w-5 shrink-0 accent-[var(--accent)]"
        />
        <span>
          <span className="block font-semibold">Count me in church totals</span>
          <span className="block text-sm text-muted">
            Leaders see numbers only, like &ldquo;12 people did at least one action.&rdquo; Never your name, your words or your notes.
          </span>
        </span>
      </label>
      <noscript>
        <button className="btn mt-2">Save</button>
      </noscript>
    </form>
  );
}
