import { latestPublishedMessage } from "@/server/messages";
import { requireMember } from "@/server/session";

export default async function RecapPage() {
  const user = await requireMember();
  const message = await latestPublishedMessage(user.churchId);

  if (!message) {
    return (
      <>
        <h1 className="text-3xl font-bold">Recap</h1>
        <div className="card mt-6">
          <p>No recap yet. When your church shares Sunday&apos;s message, it will show up here.</p>
        </div>
      </>
    );
  }

  return (
    <>
      <p className="label">This week</p>
      <h1 className="mt-1 text-3xl font-bold">{message.title}</h1>
      {message.scripture.length > 0 && <p className="mt-2 text-muted">{message.scripture.join(" · ")}</p>}
      <div className="card mt-6 text-muted">
        The full recap (Know, Act, Become) and your commitment arrive in milestone 3.
      </div>
    </>
  );
}
