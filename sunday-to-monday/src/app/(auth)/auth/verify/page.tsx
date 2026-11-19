import { confirmSignIn } from "./actions";

// The link opens this page and the person taps a button to finish. Using a
// POST here means email scanners that pre-open links can't burn the token.
export default async function VerifyPage({ searchParams }: PageProps<"/auth/verify">) {
  const { token } = await searchParams;
  const value = typeof token === "string" ? token : "";

  return (
    <>
      <h1 className="text-3xl font-bold">Almost there</h1>
      <p className="mt-3 mb-6 text-muted">Tap below to finish signing in on this device.</p>
      <form action={confirmSignIn}>
        <input type="hidden" name="token" value={value} />
        <button className="btn btn-primary w-full" disabled={!value}>
          Sign me in
        </button>
      </form>
    </>
  );
}
