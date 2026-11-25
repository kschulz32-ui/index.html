"use client";

import { useActionState, useRef, useState } from "react";
import { MODES, MODE_LABELS, type Mode } from "@/lib/plan";
import { commitToStep, type CommitState } from "../../actions";

export function CommitForm({ messageId, index, suggested }: { messageId: string; index: number; suggested: string }) {
  const [state, action, pending] = useActionState<CommitState, FormData>(commitToStep, {});
  const [iWill, setIWill] = useState(suggested);
  const [confirmed, setConfirmed] = useState(false);
  const [mode, setMode] = useState<Mode | null>(null);
  const modeHeading = useRef<HTMLHeadingElement>(null);
  const tooShort = iWill.trim().length < 3;

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="messageId" value={messageId} />
      <input type="hidden" name="takeawayIndex" value={index} />
      <input type="hidden" name="iWill" value={iWill} />

      <label htmlFor="iwill-text" className="font-display text-2xl font-semibold">
        This week I will...
      </label>
      <textarea
        id="iwill-text"
        rows={3}
        className="field text-lg"
        value={iWill}
        maxLength={280}
        readOnly={confirmed}
        onChange={(e) => setIWill(e.target.value)}
        aria-describedby="iwill-help"
      />
      <p id="iwill-help" className="-mt-2 text-sm text-muted">
        This is a suggestion. Change it so it fits your life.
      </p>

      {!confirmed ? (
        <button
          type="button"
          className="btn btn-primary"
          disabled={tooShort}
          onClick={() => {
            setConfirmed(true);
            requestAnimationFrame(() => modeHeading.current?.focus());
          }}
        >
          This is my step
        </button>
      ) : (
        <>
          <button type="button" className="link self-start py-2" onClick={() => setConfirmed(false)} disabled={pending}>
            Change my words
          </button>
          <fieldset className="flex flex-col gap-3">
            <legend>
              <h2 ref={modeHeading} tabIndex={-1} className="mb-3 text-xl font-semibold">
                How will you live it out?
              </h2>
            </legend>
            {MODES.map((m) => (
              <label
                key={m}
                className={`card flex min-h-11 cursor-pointer items-center gap-3 ${mode === m ? "border-2 border-accent" : ""}`}
              >
                <input
                  type="radio"
                  name="mode"
                  value={m}
                  checked={mode === m}
                  onChange={() => setMode(m)}
                  className="h-5 w-5 accent-[var(--accent)]"
                />
                <span>
                  <span className="block font-semibold">{MODE_LABELS[m].label}</span>
                  <span className="block text-sm text-muted">{MODE_LABELS[m].hint}</span>
                </span>
              </label>
            ))}
          </fieldset>
          {state.error && <p className="text-danger" role="alert">{state.error}</p>}
          <button className="btn btn-primary" disabled={!mode || pending}>
            {pending ? "Making your five days..." : "Build my week"}
          </button>
        </>
      )}
    </form>
  );
}
