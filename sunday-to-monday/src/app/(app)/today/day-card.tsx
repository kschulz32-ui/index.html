"use client";

import { useActionState, useState } from "react";
import { editDay, markDay, type DayState } from "./actions";

export type DayView = { id: string; dayIndex: number; text: string; done: boolean; note: string | null };

export function DayCard({ day, isToday }: { day: DayView; isToday: boolean }) {
  const [markState, markAction, marking] = useActionState<DayState, FormData>(markDay, {});
  const [editing, setEditing] = useState(false);
  const [editState, editAction, saving] = useActionState<DayState, FormData>(async (prev, fd) => {
    const result = await editDay(prev, fd);
    if (result.ok) setEditing(false);
    return result;
  }, {});

  return (
    <div className={`card ${isToday ? "border-2 border-accent" : ""}`}>
      <p className="label">{isToday ? `Today · Day ${day.dayIndex + 1}` : `Day ${day.dayIndex + 1}`}</p>

      {editing ? (
        <form action={editAction} className="mt-2 flex flex-col gap-2">
          <input type="hidden" name="dayId" value={day.id} />
          <label htmlFor={`text-${day.id}`} className="sr-only">Your action for this day</label>
          <textarea id={`text-${day.id}`} name="text" rows={3} className="field" defaultValue={day.text} maxLength={300} />
          {editState.error && <p className="text-danger" role="alert">{editState.error}</p>}
          <div className="flex gap-2">
            <button className="btn btn-primary flex-1" disabled={saving}>{saving ? "Saving..." : "Save"}</button>
            <button type="button" className="btn flex-1" onClick={() => setEditing(false)}>Cancel</button>
          </div>
        </form>
      ) : (
        <>
          <p className="mt-2 text-xl leading-snug">{day.text}</p>
          {!day.done && (
            <button type="button" className="link mt-1 py-2 text-sm" onClick={() => setEditing(true)}>
              Change this action
            </button>
          )}
        </>
      )}

      {!editing &&
        (day.done ? (
          <form action={markAction} className="mt-4 flex flex-col gap-2">
            <input type="hidden" name="dayId" value={day.id} />
            <input type="hidden" name="done" value="0" />
            <p className="font-semibold text-accent">Done. Well lived.</p>
            {day.note && <p className="text-muted">&ldquo;{day.note}&rdquo;</p>}
            <button className="btn self-start" disabled={marking}>Undo</button>
          </form>
        ) : (
          <form action={markAction} className="mt-4 flex flex-col gap-2">
            <input type="hidden" name="dayId" value={day.id} />
            <input type="hidden" name="done" value="1" />
            <label htmlFor={`note-${day.id}`} className="text-sm text-muted">
              A note for yourself (optional)
            </label>
            <input id={`note-${day.id}`} name="note" className="field" maxLength={200} placeholder="One line about how it went" />
            {markState.error && <p className="text-danger" role="alert">{markState.error}</p>}
            <button className="btn btn-primary" disabled={marking}>{marking ? "Saving..." : "Mark as done"}</button>
          </form>
        ))}
    </div>
  );
}
