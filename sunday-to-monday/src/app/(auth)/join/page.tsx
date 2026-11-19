import { redirect } from "next/navigation";
import { requireUser } from "@/server/session";
import { JoinForm } from "./join-form";

export default async function JoinPage() {
  const user = await requireUser();
  if (user.churchId) redirect("/recap");
  return (
    <>
      <h1 className="text-3xl font-bold">Find your church</h1>
      <p className="mt-3 mb-6 text-muted">Your church has a short code. Ask a leader if you don&apos;t have it.</p>
      <JoinForm defaultName={user.name ?? ""} />
    </>
  );
}
