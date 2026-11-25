import Link from "next/link";
import { formatDate } from "@/lib/dates";
import { MODE_LABELS } from "@/lib/plan";
import { latestPublishedMessage } from "@/server/messages";
import { loopForMessage, recordEvent } from "@/server/member";
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

  await recordEvent(user.id, message.id, "opened");
  const loop = await loopForMessage(user.id, message.id);
  const chosen = loop?.commitment.takeawayIndex;

  return (
    <>
      <p className="label">{formatDate(message.date)}{message.speaker ? ` · ${message.speaker}` : ""}</p>
      <h1 className="mt-1 text-3xl font-bold">{message.title}</h1>
      {message.scripture.length > 0 && <p className="mt-2 text-muted">{message.scripture.join(" · ")}</p>}

      {loop ? (
        <div className="card mt-6 border-accent">
          <p className="label">Your step this week</p>
          <p className="mt-2 text-lg">This week I will {loop.commitment.iWill}</p>
          {loop.commitment.mode && <p className="mt-1 text-sm text-muted">{MODE_LABELS[loop.commitment.mode].label}</p>}
          <Link href="/today" className="btn btn-primary mt-4 w-full">Go to Today</Link>
        </div>
      ) : (
        <p className="mt-6 text-lg">Read the takeaways, then pick the one that speaks to you.</p>
      )}

      <section aria-labelledby="know" className="mt-8">
        <h2 id="know" className="label">Know + Act</h2>
        <ol className="mt-3 flex flex-col gap-3">
          {message.takeaways.map((t, i) => {
            const body = (
              <>
                <span className="block text-lg font-semibold leading-snug">{t.know}</span>
                <span className="mt-3 block border-t border-line pt-3">
                  <span className="label block">Act</span>
                  <span className="mt-1 block text-muted">{t.act}</span>
                </span>
              </>
            );
            return (
              <li key={i}>
                {loop ? (
                  <div className={`card ${chosen === i ? "border-2 border-accent" : "opacity-80"}`}>
                    {chosen === i && <span className="label mb-2 block text-accent">You chose this</span>}
                    {body}
                  </div>
                ) : (
                  <Link
                    href={`/commit/${message.id}/${i}`}
                    className="card block transition-colors hover:border-accent"
                    aria-label={`Choose: ${t.know}`}
                  >
                    {body}
                    <span className="mt-4 block font-semibold text-accent">Choose this one</span>
                  </Link>
                )}
              </li>
            );
          })}
        </ol>
      </section>

      {message.transformation && (
        <section aria-labelledby="become" className="mt-8">
          <h2 id="become" className="label">Become</h2>
          <p className="font-display mt-2 text-2xl leading-snug">{message.transformation}</p>
        </section>
      )}
    </>
  );
}
