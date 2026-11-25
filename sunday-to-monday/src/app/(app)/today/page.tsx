import Link from "next/link";
import { todayInTz } from "@/lib/dates";
import { MODE_LABELS } from "@/lib/plan";
import { WEEK_DAYS, isUnlocked, weekState } from "@/lib/week";
import { aiAvailable } from "@/server/ai";
import { latestPublishedMessage } from "@/server/messages";
import { churchTimezone, loopForMessage } from "@/server/member";
import { requireMember } from "@/server/session";
import { DayCard } from "./day-card";
import { HarvestForm } from "./harvest-form";

export default async function TodayPage({ searchParams }: PageProps<"/today">) {
  const user = await requireMember();
  const { day, plan } = await searchParams;
  const message = await latestPublishedMessage(user.churchId);
  const loop = message ? await loopForMessage(user.id, message.id) : null;

  if (!message || !loop) {
    return (
      <>
        <h1 className="text-3xl font-bold">Today</h1>
        <div className="card mt-6 flex flex-col gap-4">
          {message ? (
            <>
              <p>Pick one step from &ldquo;{message.title}&rdquo; and your five days will show up here.</p>
              <Link href="/recap" className="btn btn-primary">Go to the recap</Link>
            </>
          ) : (
            <p>Nothing here yet. When your church shares Sunday&apos;s message, you&apos;ll pick one small step to live out.</p>
          )}
        </div>
      </>
    );
  }

  const { commitment, days, lookback } = loop;
  const today = todayInTz(await churchTimezone(user.churchId));
  const week = weekState(commitment.startDate, today);
  const requested = Number(day) - 1;
  const selectedIndex =
    Number.isInteger(requested) && isUnlocked(requested, commitment.startDate, today) ? requested : week.todayIndex;
  const selected = days.find((d) => d.dayIndex === selectedIndex);
  const missedEarlier = days.some((d) => d.dayIndex < week.todayIndex && !d.done);
  const showingToday = selectedIndex === week.todayIndex && !week.finished;

  return (
    <>
      <p className="label">This week · {message.title}</p>
      <h1 className="mt-1 text-3xl font-bold">{week.finished ? "Your week" : "Today"}</h1>

      {plan === "template" && (
        <p className="mt-4 rounded-xl bg-warn-bg p-3 text-sm text-warn-ink" role="status">
          {aiAvailable()
            ? "Claude wasn't available, so these five days come from our built-in plan. Change any of them to fit your week."
            : "Claude isn't set up here, so these five days come from our built-in plan. Change any of them to fit your week."}
        </p>
      )}

      <div className="card mt-6">
        <p className="label">You said</p>
        <p className="mt-1 text-lg">This week I will {commitment.iWill}</p>
        {commitment.mode && <p className="mt-1 text-sm text-muted">{MODE_LABELS[commitment.mode].label}</p>}
      </div>

      <nav aria-label="Your five days" className="mt-6">
        <ol className="flex justify-between gap-2">
          {Array.from({ length: WEEK_DAYS }, (_, i) => {
            const d = days.find((x) => x.dayIndex === i);
            const unlocked = isUnlocked(i, commitment.startDate, today);
            const isSel = i === selectedIndex;
            const circle = `flex h-12 w-12 items-center justify-center rounded-full border-2 font-semibold ${
              d?.done ? "border-accent bg-accent text-accent-ink" : unlocked ? "border-accent text-ink" : "border-line text-muted"
            } ${isSel ? "ring-4 ring-accent-soft" : ""}`;
            const label = `Day ${i + 1}${d?.done ? ", done" : ""}${!unlocked ? ", not open yet" : ""}${i === week.todayIndex && !week.finished ? ", today" : ""}`;
            return (
              <li key={i} className="flex flex-1 flex-col items-center gap-1">
                {unlocked ? (
                  <Link href={`/today?day=${i + 1}`} className={circle} aria-label={label} aria-current={isSel ? "step" : undefined}>
                    {d?.done ? "✓" : i + 1}
                  </Link>
                ) : (
                  <span className={circle} aria-label={label} role="img">
                    <span aria-hidden>{i + 1}</span>
                  </span>
                )}
                <span className="label text-[0.65rem]" aria-hidden>
                  {i === week.todayIndex && !week.finished ? "Today" : `Day ${i + 1}`}
                </span>
              </li>
            );
          })}
        </ol>
      </nav>

      {showingToday && missedEarlier && (
        <p className="mt-4 text-muted">Nothing is lost. Today is the next one.</p>
      )}

      {week.finished && (
        <div className="card mt-6 bg-accent-soft">
          <h2 className="text-xl font-semibold">This week is finished.</h2>
          <p className="mt-1">The next message starts a new loop. You can still mark any day you did.</p>
        </div>
      )}

      {selected && (
        <div className="mt-6">
          <DayCard
            key={selected.id}
            day={{ id: selected.id, dayIndex: selected.dayIndex, text: selected.text, done: selected.done, note: selected.note }}
            isToday={showingToday}
          />
        </div>
      )}

      {week.harvestOpen && (
        <div className="mt-6">
          <HarvestForm commitmentId={commitment.id} existing={lookback} />
        </div>
      )}
    </>
  );
}
