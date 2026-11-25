import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { loopForMessage, publishedMessageForMember } from "@/server/member";
import { requireMember } from "@/server/session";
import { CommitForm } from "./commit-form";

export default async function CommitPage({ params }: PageProps<"/commit/[messageId]/[index]">) {
  const user = await requireMember();
  const { messageId, index } = await params;
  const id = z.uuid().safeParse(messageId);
  const i = z.coerce.number().int().min(0).max(4).safeParse(index);
  if (!id.success || !i.success) notFound();

  const message = await publishedMessageForMember(user.churchId, id.data);
  const takeaway = message?.takeaways[i.data];
  if (!message || !takeaway) notFound();
  if (await loopForMessage(user.id, message.id)) redirect("/today");

  return (
    <>
      <Link href="/recap" className="link inline-flex min-h-11 items-center">Back to the recap</Link>
      <p className="label mt-4">You chose</p>
      <p className="mt-1 text-xl font-semibold leading-snug">{takeaway.know}</p>
      <div className="mt-8">
        <CommitForm messageId={message.id} index={i.data} suggested={takeaway.act} />
      </div>
    </>
  );
}
