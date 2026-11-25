import { addDays } from "./dates";

export const WEEK_DAYS = 5;

/** Whole days from startDate to today (both YYYY-MM-DD). */
export function daysBetween(startDate: string, today: string): number {
  const a = Date.UTC(+startDate.slice(0, 4), +startDate.slice(5, 7) - 1, +startDate.slice(8, 10));
  const b = Date.UTC(+today.slice(0, 4), +today.slice(5, 7) - 1, +today.slice(8, 10));
  return Math.round((b - a) / 86_400_000);
}

export type WeekState = {
  /** 0-based index of today's day in the loop, clamped to 0..4 */
  todayIndex: number;
  /** true once we're past day 5 */
  finished: boolean;
  /** true from day 5 on: time to ask "What grew in you this week?" */
  harvestOpen: boolean;
};

export function weekState(startDate: string, today: string): WeekState {
  const raw = Math.max(0, daysBetween(startDate, today));
  return {
    todayIndex: Math.min(raw, WEEK_DAYS - 1),
    finished: raw >= WEEK_DAYS,
    harvestOpen: raw >= WEEK_DAYS - 1,
  };
}

/** A day can be marked done if it's today or earlier. Future days are locked. */
export function isUnlocked(dayIndex: number, startDate: string, today: string): boolean {
  return dayIndex >= 0 && dayIndex < WEEK_DAYS && daysBetween(startDate, today) >= dayIndex;
}

export function dateForDay(startDate: string, dayIndex: number): string {
  return addDays(startDate, dayIndex);
}
