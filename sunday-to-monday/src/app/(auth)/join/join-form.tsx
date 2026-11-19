"use client";

import { useActionState } from "react";
import { joinChurch, type JoinState } from "./actions";

export function JoinForm({ defaultName }: { defaultName: string }) {
  const [state, action, pending] = useActionState<JoinState, FormData>(joinChurch, {});
  return (
    <form action={action} className="flex flex-col gap-3">
      <label htmlFor="name" className="font-medium">First name</label>
      <input id="name" name="name" className="field" autoComplete="given-name" defaultValue={state.name ?? defaultName} required maxLength={80} />
      <label htmlFor="code" className="mt-2 font-medium">Church code</label>
      <input id="code" name="code" className="field font-mono uppercase" autoCapitalize="characters" autoComplete="off" required maxLength={16} defaultValue={state.code} />
      {state.error && <p className="text-danger" role="alert">{state.error}</p>}
      <button className="btn btn-primary mt-1" disabled={pending}>{pending ? "Joining..." : "Join"}</button>
    </form>
  );
}
