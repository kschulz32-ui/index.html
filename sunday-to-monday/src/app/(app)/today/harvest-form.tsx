"use client";

import { useActionState, useState } from "react";
import { saveHarvest, type DayState } from "./actions";

export function HarvestForm({ commitmentId, existing }: { commitmentId: string; existing: string | null }) {
  const [editing, setEditing] = useState(!existing);
  const [state, action, pending] = useActionState<DayState, FormData>(async (prev, fd) => {
    const result = await saveHarvest(prev, fd);
    if (result.ok) setEditing(false);
    return result;
  }, {});
  const saved = state.ok && !editing;

  if (existing && !editing) {
    return (
      <div className="card">
        <h2 className="text-xl font-semibold">What grew in you this week</h2>
        <p className="mt-2 whitespace-pre-line">{existing}</p>
        {saved && <p className="mt-2 text-sm text-accent" role="status">Saved to your log.</p>}
        <button type="button" className="link mt-2 py-2 text-sm" onClick={() => setEditing(true)}>Edit</button>
      </div>
    );
  }

  return (
    <form action={action} className="card flex flex-col gap-3">
      <input type="hidden" name="commitmentId" value={commitmentId} />
      <label htmlFor="harvest" className="text-xl font-semibold">What grew in you this week?</label>
      <textarea id="harvest" name="text" rows={4} className="field" maxLength={1000} defaultValue={existing ?? ""} />
      <p className="text-sm text-muted">Only you can see this.</p>
      {state.error && <p className="text-danger" role="alert">{state.error}</p>}
      <button className="btn btn-primary" disabled={pending}>{pending ? "Saving..." : "Save"}</button>
    </form>
  );
}
