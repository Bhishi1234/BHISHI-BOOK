import type { Chit, Frequency } from "../types";

/** Preset hapta gaps offered on the terms step. */
export const HAPTA_PRESETS = [1, 7, 15, 30] as const;

export function frequencyForInterval(days: number): Frequency {
  if (days === 1) return "daily";
  if (days === 7) return "weekly";
  if (days === 15) return "biweekly";
  if (days === 30) return "monthly";
  return "custom";
}

/** Day gap used for due dates. Null only for legacy quarter / half-year / year books. */
export function intervalDaysOf(chit: Pick<Chit, "frequency" | "haptaIntervalDays">): number | null {
  if (chit.haptaIntervalDays && chit.haptaIntervalDays > 0) return Math.floor(chit.haptaIntervalDays);
  switch (chit.frequency) {
    case "daily":
      return 1;
    case "weekly":
      return 7;
    case "biweekly":
      return 15;
    case "monthly":
      return 30;
    default:
      return null;
  }
}

/** Parse YYYY-MM-DD as a local calendar date so hapta steps do not shift a day. */
export function parseChitDate(iso: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || ""));
  if (match) return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return new Date(iso);
}

export function haptaDateOptions(
  chit: Pick<Chit, "frequency" | "haptaIntervalDays">,
): Intl.DateTimeFormatOptions {
  if (intervalDaysOf(chit)) return { day: "numeric", month: "short", year: "numeric" };
  return { month: "short", year: "numeric" };
}

export function haptaEveryLabel(
  chit: Pick<Chit, "frequency" | "haptaIntervalDays">,
  copy: { oneDay: string; oneWeek: string; days15: string; days30: string; everyNDays: string },
  tx: (template: string, vars: Record<string, string | number>) => string,
  freqFallback: string,
): string {
  const days = intervalDaysOf(chit);
  if (days === 1) return copy.oneDay;
  if (days === 7) return copy.oneWeek;
  if (days === 15) return copy.days15;
  if (days === 30) return copy.days30;
  if (days) return tx(copy.everyNDays, { n: days });
  return freqFallback;
}

/** English label for PDFs. */
export function haptaEveryLabelEn(chit: Pick<Chit, "frequency" | "haptaIntervalDays">): string {
  const days = intervalDaysOf(chit);
  if (days === 1) return "1 day";
  if (days === 7) return "1 week";
  if (days === 15) return "15 days";
  if (days === 30) return "30 days";
  if (days) return `Every ${days} days`;
  return chit.frequency;
}
