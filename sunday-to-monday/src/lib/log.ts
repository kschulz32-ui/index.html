import { formatDate } from "./dates";
import { MODE_LABELS, type Mode } from "./plan";

export type LogWeekView = {
  title: string;
  date: string;
  heard: string;
  iWill: string;
  mode: Mode | null;
  days: { dayIndex: number; text: string; done: boolean; note: string | null }[];
  lookback: string | null;
};

/** Plain-text version of the member's log for the Copy button. */
export function logAsText(weeks: LogWeekView[]): string {
  if (weeks.length === 0) return "My Sunday to Monday log is empty so far.";
  return weeks
    .map((w) => {
      const did = w.days.filter((d) => d.done);
      const lines = [
        `${w.title} (${formatDate(w.date)})`,
        `What I heard: ${w.heard}`,
        `What I said I'd do: This week I will ${w.iWill}${w.mode ? ` (${MODE_LABELS[w.mode].label})` : ""}`,
        `What I did:`,
        ...(did.length
          ? did.map((d) => `- Day ${d.dayIndex + 1}: ${d.text}${d.note ? ` Note: ${d.note}` : ""}`)
          : ["- Nothing marked yet."]),
        `What changed: ${w.lookback ?? "Not written yet."}`,
      ];
      return lines.join("\n");
    })
    .join("\n\n");
}
