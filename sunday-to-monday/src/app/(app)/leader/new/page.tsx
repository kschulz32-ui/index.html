import Link from "next/link";
import { lastSundayInTz } from "@/lib/dates";
import { aiAvailable } from "@/server/ai";
import { getChurch } from "@/server/leader";
import { requireLeader } from "@/server/session";
import { NewMessageForm } from "./new-form";

export default async function NewMessagePage() {
  const leader = await requireLeader();
  const church = await getChurch(leader.churchId);
  return (
    <>
      <Link href="/leader" className="link inline-flex min-h-11 items-center">Back</Link>
      <h1 className="mt-2 text-3xl font-bold">New message</h1>
      <p className="mt-2 mb-6 text-muted">You&apos;ll review every takeaway before anyone sees it.</p>
      <NewMessageForm aiOn={aiAvailable()} defaultDate={lastSundayInTz(church?.timezone ?? "UTC")} />
    </>
  );
}
