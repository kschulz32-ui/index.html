"use client";

import { useActionState } from "react";
import { requestLink, type SignInState } from "./actions";

export function SignInForm() {
  const [state, action, pending] = useActionState<SignInState, FormData>(requestLink, { status: "idle" });

  if (state.status === "sent") {
    return (
      <div className="card" role="status">
        <h2 className="text-xl font-semibold">Check your email</h2>
        <p className="mt-2 text-muted">
          We sent a sign-in link to <strong className="text-ink">{state.email}</strong>. It works once and
          expires in 15 minutes.
        </p>
        {state.devLink && (
          <p className="mt-4 rounded-xl bg-warn-bg p-3 text-sm text-warn-ink">
            Dev mode, no email provider yet:{" "}
            <a className="link break-all" href={state.devLink}>
              open the sign-in link
            </a>
          </p>
        )}
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-3" noValidate>
      <label htmlFor="email" className="font-medium">
        Your email
      </label>
      <input
        id="email"
        name="email"
        type="email"
        inputMode="email"
        autoComplete="email"
        required
        className="field"
        placeholder="you@example.com"
        aria-describedby={state.status === "error" ? "email-error" : undefined}
      />
      {state.status === "error" && (
        <p id="email-error" className="text-danger" role="alert">
          {state.message}
        </p>
      )}
      <button className="btn btn-primary mt-1" disabled={pending}>
        {pending ? "Sending..." : "Email me a sign-in link"}
      </button>
    </form>
  );
}
