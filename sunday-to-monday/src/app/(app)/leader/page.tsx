import Link from "next/link";
import { formatDate } from "@/lib/dates";
import { aiAvailable } from "@/server/ai";
import { getChurch, listMessages } from "@/server/leader";
import { requireLeader } from "@/server/session";

export default async function LeaderPage() {
  const leader = await requireLeader();
  const [church, items] = await Promise.all([getChurch(leader.churchId), listMessages(leader.churchId)]);

  return (
    <>
      <p className="label">{church?.name}</p>
      <h1 className="mt-1 text-3xl font-bold">Messages</h1>
      <p className="mt-2 text-muted">Share Sunday&apos;s message. Nothing reaches members until you publish.</p>

      {!aiAvailable() && (
        <p className="mt-4 rounded-xl bg-warn-bg p-3 text-sm text-warn-ink">
          Claude isn&apos;t set up on this server, so you&apos;ll write takeaways yourself. Everything else works.
        </p>
      )}

      <Link href="/leader/new" className="btn btn-primary mt-6 w-full">
        New message
      </Link>

      {items.length === 0 ? (
        <div className="card mt-6 text-muted">No messages yet. Start with last Sunday&apos;s.</div>
      ) : (
        <ul className="mt-6 flex flex-col gap-3">
          {items.map((m) => (
            <li key={m.id}>
              <Link href={`/leader/messages/${m.id}`} className="card flex min-h-11 items-center justify-between gap-3">
                <span>
                  <span className="block font-semibold">{m.title}</span>
                  <span className="text-sm text-muted">{formatDate(m.date)}</span>
                </span>
                <span
                  className={`label shrink-0 rounded-full px-2 py-1 ${
                    m.status === "published" ? "bg-accent-soft text-accent" : "bg-surface-2"
                  }`}
                >
                  {m.status === "published" ? "Live" : "Draft"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
