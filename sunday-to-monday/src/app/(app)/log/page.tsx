import { formatDate } from "@/lib/dates";
import { logAsText } from "@/lib/log";
import { MODE_LABELS } from "@/lib/plan";
import { logForMember } from "@/server/member";
import { requireMember } from "@/server/session";
import { signOut } from "./actions";
import { CopyButton } from "./copy-button";
import { ShareToggle } from "./share-toggle";

export default async function LogPage() {
  const user = await requireMember();
  const weeks = await logForMember(user.id);

  return (
    <>
      <h1 className="text-3xl font-bold">Log</h1>
      <p className="mt-2 text-muted">Your weeks, in your words. Only you can see this.</p>

      {weeks.length === 0 ? (
        <div className="card mt-6">Nothing here yet. Your first week will show up after you pick a step.</div>
      ) : (
        <>
          <div className="mt-6">
            <CopyButton text={logAsText(weeks)} />
          </div>
          <ol className="mt-2 flex flex-col gap-4">
            {weeks.map((w) => {
              const did = w.days.filter((d) => d.done);
              return (
                <li key={w.commitmentId} className="card">
                  <p className="label">{formatDate(w.date)}</p>
                  <h2 className="mt-1 text-xl font-semibold">{w.title}</h2>
                  <dl className="mt-3 flex flex-col gap-3">
                    <div>
                      <dt className="label">What I heard</dt>
                      <dd className="mt-1">{w.heard}</dd>
                    </div>
                    <div>
                      <dt className="label">What I said I&apos;d do</dt>
                      <dd className="mt-1">
                        This week I will {w.iWill}
                        {w.mode && <span className="text-muted"> · {MODE_LABELS[w.mode].label}</span>}
                      </dd>
                    </div>
                    <div>
                      <dt className="label">What I did</dt>
                      <dd className="mt-1">
                        {did.length === 0 ? (
                          <span className="text-muted">Nothing marked yet.</span>
                        ) : (
                          <ul className="flex flex-col gap-2">
                            {did.map((d) => (
                              <li key={d.dayIndex}>
                                <span className="font-medium">Day {d.dayIndex + 1}:</span> {d.text}
                                {d.note && <span className="block text-sm text-muted">&ldquo;{d.note}&rdquo;</span>}
                              </li>
                            ))}
                          </ul>
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt className="label">What changed</dt>
                      <dd className="mt-1 whitespace-pre-line">{w.lookback ?? <span className="text-muted">Not written yet.</span>}</dd>
                    </div>
                  </dl>
                </li>
              );
            })}
          </ol>
        </>
      )}

      <div className="card mt-8">
        <ShareToggle on={user.shareCounts} />
      </div>

      <div className="card mt-4">
        <p className="label">Signed in as</p>
        <p className="mt-1 break-all">{user.email}</p>
        <form action={signOut} className="mt-4">
          <button className="btn">Sign out</button>
        </form>
      </div>
    </>
  );
}
