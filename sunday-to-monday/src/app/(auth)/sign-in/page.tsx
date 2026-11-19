import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/session";
import { SignInForm } from "./sign-in-form";

const ERRORS: Record<string, string> = {
  expired: "That link has expired or was already used. Here's a fresh start.",
};

export default async function SignInPage({ searchParams }: PageProps<"/sign-in">) {
  if (await getCurrentUser()) redirect("/");
  const { error } = await searchParams;
  const errorText = typeof error === "string" ? ERRORS[error] : undefined;

  return (
    <>
      <h1 className="text-4xl font-bold">Hear it Sunday. Live it Monday.</h1>
      <p className="mt-3 mb-8 text-lg text-muted">
        One small step each day from this week&apos;s message. No password needed.
      </p>
      {errorText && (
        <p className="mb-4 rounded-xl bg-warn-bg p-3 text-warn-ink" role="alert">
          {errorText}
        </p>
      )}
      <SignInForm />
    </>
  );
}
