"use client";

import { useActionState } from "react";
import { createMessage, type CreateState } from "../actions";

export function NewMessageForm({ aiOn, defaultDate }: { aiOn: boolean; defaultDate: string }) {
  const [state, action, pending] = useActionState<CreateState, FormData>(createMessage, {});
  return (
    <form action={action} className="flex flex-col gap-3">
      <label htmlFor="transcript" className="font-medium">
        Transcript or notes
      </label>
      <p id="transcript-help" className="-mt-2 text-sm text-muted">
        Paste the message text. We keep only the first 6,000 characters, and only for your church.
      </p>
      <textarea
        id="transcript"
        name="transcript"
        rows={10}
        className="field"
        aria-describedby="transcript-help"
        defaultValue={state.transcript}
      />

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="date" className="font-medium">Date</label>
          <input id="date" name="date" type="date" className="field" defaultValue={state.date || defaultDate} required />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="speaker" className="font-medium">Speaker</label>
          <input id="speaker" name="speaker" className="field" maxLength={80} defaultValue={state.speaker} />
        </div>
      </div>

      <label htmlFor="link" className="font-medium">Video or podcast link (optional)</label>
      <input id="link" name="link" type="url" inputMode="url" className="field" placeholder="https://" defaultValue={state.link} maxLength={500} />

      {state.error && <p className="text-danger" role="alert">{state.error}</p>}

      {aiOn ? (
        <>
          <button className="btn btn-primary mt-2" name="mode" value="ai" disabled={pending}>
            {pending ? "Claude is reading... (about a minute)" : "Draft takeaways with Claude"}
          </button>
          <button className="btn" name="mode" value="manual" disabled={pending}>
            Write them myself
          </button>
        </>
      ) : (
        <>
          <p className="mt-2 rounded-xl bg-warn-bg p-3 text-sm text-warn-ink">
            Claude isn&apos;t set up on this server, so you&apos;ll write the takeaways yourself.
          </p>
          <button className="btn btn-primary" name="mode" value="manual" disabled={pending}>
            {pending ? "Saving..." : "Continue"}
          </button>
        </>
      )}
    </form>
  );
}
