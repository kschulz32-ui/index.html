"use client";

import { useActionState, useState, startTransition, type FormEvent } from "react";
import { KNOW_MAX_WORDS, MAX_TAKEAWAYS, MIN_TAKEAWAYS, wordCount } from "@/lib/takeaways";
import { saveMessage, type EditState } from "../../actions";

export type EditorMessage = {
  id: string;
  status: "draft" | "published";
  title: string;
  speaker: string;
  date: string;
  scripture: string;
  link: string;
  transformation: string;
  takeaways: { know: string; act: string }[];
};

export function Editor({ message }: { message: EditorMessage }) {
  const [state, action, pending] = useActionState<EditState, FormData>(saveMessage, {});
  const [takeaways, setTakeaways] = useState(
    message.takeaways.length ? message.takeaways : [{ know: "", act: "" }, { know: "", act: "" }, { know: "", act: "" }],
  );
  const live = message.status === "published" || state.published;

  // Submit by hand so React doesn't reset the form fields after the action.
  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const intent = submitter?.value ?? "save";
    if (intent === "publish" && !confirm("Publish this recap? Members will be able to see it.")) return;
    const fd = new FormData(e.currentTarget);
    fd.set("intent", intent);
    startTransition(() => action(fd));
  }

  function update(i: number, key: "know" | "act", value: string) {
    setTakeaways((list) => list.map((t, j) => (j === i ? { ...t, [key]: value } : t)));
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <input type="hidden" name="id" value={message.id} />
      <input type="hidden" name="takeawayCount" value={takeaways.length} />

      <Field label="Title" htmlFor="title">
        <input id="title" name="title" className="field" defaultValue={message.title} maxLength={140} required />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Date" htmlFor="date">
          <input id="date" name="date" type="date" className="field" defaultValue={message.date} required />
        </Field>
        <Field label="Speaker" htmlFor="speaker">
          <input id="speaker" name="speaker" className="field" defaultValue={message.speaker} maxLength={80} />
        </Field>
      </div>

      <Field label="Scripture (one per line)" htmlFor="scripture">
        <textarea id="scripture" name="scripture" rows={2} className="field" defaultValue={message.scripture} />
      </Field>

      <Field label="Video or podcast link (optional)" htmlFor="link">
        <input id="link" name="link" type="url" className="field" defaultValue={message.link} maxLength={500} />
      </Field>

      <fieldset className="mt-2 flex flex-col gap-4">
        <legend className="label mb-2">Know + Act</legend>
        {takeaways.map((t, i) => {
          const words = wordCount(t.know);
          const over = words > KNOW_MAX_WORDS;
          return (
            <div key={i} className="card flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="label">Takeaway {i + 1}</span>
                {!live && takeaways.length > 1 && (
                  <button
                    type="button"
                    className="btn min-h-11 px-3 py-1 text-sm"
                    onClick={() => setTakeaways((list) => list.filter((_, j) => j !== i))}
                    aria-label={`Remove takeaway ${i + 1}`}
                  >
                    Remove
                  </button>
                )}
              </div>
              <label htmlFor={`know_${i}`} className="font-medium">Know</label>
              <textarea
                id={`know_${i}`}
                name={`know_${i}`}
                rows={2}
                className="field"
                value={t.know}
                maxLength={200}
                onChange={(e) => update(i, "know", e.target.value)}
                aria-describedby={`know_${i}_count`}
              />
              <p id={`know_${i}_count`} className={`text-sm ${over ? "text-danger" : "text-muted"}`}>
                {words} of {KNOW_MAX_WORDS} words{over ? ". Try trimming it." : ""}
              </p>
              <label htmlFor={`act_${i}`} className="font-medium">Act (under 10 minutes)</label>
              <textarea
                id={`act_${i}`}
                name={`act_${i}`}
                rows={2}
                className="field"
                value={t.act}
                maxLength={240}
                onChange={(e) => update(i, "act", e.target.value)}
              />
            </div>
          );
        })}
        {!live && takeaways.length < MAX_TAKEAWAYS && (
          <button type="button" className="btn" onClick={() => setTakeaways((l) => [...l, { know: "", act: "" }])}>
            Add a takeaway
          </button>
        )}
        <p className="text-sm text-muted">
          {live
            ? "This recap is live. You can fix wording, but not add or remove takeaways."
            : `Use ${MIN_TAKEAWAYS} to ${MAX_TAKEAWAYS} takeaways.`}
        </p>
      </fieldset>

      <Field label="Become: who someone grows into" htmlFor="transformation">
        <textarea
          id="transformation"
          name="transformation"
          rows={2}
          className="field"
          defaultValue={message.transformation}
          maxLength={300}
        />
      </Field>

      <div aria-live="polite" className="min-h-6">
        {state.error && <p className="text-danger" role="alert">{state.error}</p>}
        {state.saved && <p className="text-muted">Saved.</p>}
        {state.published && <p className="font-semibold text-accent">Published. Members can see it now.</p>}
      </div>

      <div className="flex flex-col gap-3">
        {!live && (
          <button className="btn btn-primary" name="intent" value="publish" disabled={pending}>
            Publish to members
          </button>
        )}
        <button className={`btn ${live ? "btn-primary" : ""}`} name="intent" value="save" disabled={pending}>
          {pending ? "Saving..." : live ? "Save changes" : "Save draft"}
        </button>
      </div>
    </form>
  );
}

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={htmlFor} className="font-medium">{label}</label>
      {children}
    </div>
  );
}
