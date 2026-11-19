import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { getMessage } from "@/server/leader";
import { requireLeader } from "@/server/session";
import { removeDraft } from "../../actions";
import { ConfirmButton } from "@/components/confirm-button";
import { Editor } from "./editor";

const NOTICES: Record<string, { text: string; warn?: boolean }> = {
  drafted: { text: "Claude drafted these from your transcript. Read each one and make it yours before publishing." },
  no_key: { text: "Claude isn't set up on this server, so write the takeaways yourself.", warn: true },
  failed: { text: "Claude couldn't draft this one. You can write the takeaways yourself.", warn: true },
  refused: { text: "Claude couldn't draft this one. You can write the takeaways yourself.", warn: true },
  rate_limited: { text: "Claude is busy right now. Write the takeaways yourself, or try again later.", warn: true },
};

export default async function MessagePage({ params, searchParams }: PageProps<"/leader/messages/[id]">) {
  const leader = await requireLeader();
  const { id } = await params;
  const { notice } = await searchParams;
  if (!z.uuid().safeParse(id).success) notFound();
  const m = await getMessage(leader.churchId, id);
  if (!m) notFound();

  const n = typeof notice === "string" ? NOTICES[notice] : undefined;

  return (
    <>
      <Link href="/leader" className="link inline-flex min-h-11 items-center">Back</Link>
      <p className="label mt-2">{m.status === "published" ? "Live" : "Draft, only leaders can see this"}</p>
      <h1 className="mt-1 text-3xl font-bold">Review the recap</h1>
      {n && (
        <p className={`mt-4 rounded-xl p-3 text-sm ${n.warn ? "bg-warn-bg text-warn-ink" : "bg-accent-soft"}`} role="status">
          {n.text}
        </p>
      )}
      <div className="mt-6">
        <Editor
          message={{
            id: m.id,
            status: m.status,
            title: m.title,
            speaker: m.speaker ?? "",
            date: m.date,
            scripture: m.scripture.join("\n"),
            link: m.link ?? "",
            transformation: m.transformation ?? "",
            takeaways: m.takeaways,
          }}
        />
      </div>
      {m.status === "draft" && (
        <form action={removeDraft} className="mt-8 border-t border-line pt-6">
          <input type="hidden" name="id" value={m.id} />
          <ConfirmButton message="Delete this draft? This can't be undone." className="btn w-full text-danger">
            Delete this draft
          </ConfirmButton>
        </form>
      )}
    </>
  );
}
