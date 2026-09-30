import { addDays, addMinutes } from "date-fns";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";

import type { SlotMinutes } from "./constants";
import type { SlotSpec } from "./types";

const DATE = "yyyy-MM-dd";
const DATE_TIME = "yyyy-MM-dd HH:mm";

/** Thin wrapper so nothing outside domain/ imports date-fns-tz directly. */
export function formatInTz(d: Date, tz: string, pattern: string): string {
  return formatInTimeZone(d, tz, pattern);
}

export function isValidTz(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

const pad = (n: number): string => String(n).padStart(2, "0");

/** Wall-clock `HH:mm` for minutes from local midnight. */
function wallClock(minutes: number): string {
  return `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
}

export function slotsPerDay(
  fromMinutes: number,
  toMinutes: number,
  slotMinutes: SlotMinutes,
): number {
  return Math.max(0, Math.floor((toMinutes - fromMinutes) / slotMinutes));
}

/**
 * Every slot instant for the spec, as UTC dates, ascending and unique.
 *
 * DST: a local time that does not exist (spring-forward gap) is skipped, detected by
 * converting to UTC and formatting back; a local time that occurs twice (fall-back) maps to
 * one instant via fromZonedTime, and the de-duplication keeps it single.
 */
export function generateSlots(spec: SlotSpec): Date[] {
  const { dates, fromMinutes, toMinutes, slotMinutes, tz } = spec;
  const seen = new Set<number>();
  const out: Date[] = [];
  for (const date of dates) {
    for (let m = fromMinutes; m + slotMinutes <= toMinutes; m += slotMinutes) {
      const local = `${date} ${wallClock(m)}`;
      const utc = fromZonedTime(local, tz);
      if (formatInTimeZone(utc, tz, DATE_TIME) !== local) continue; // nonexistent local time
      const t = utc.getTime();
      if (seen.has(t)) continue;
      seen.add(t);
      out.push(utc);
    }
  }
  return out.sort((a, b) => a.getTime() - b.getTime());
}

/** Slots grouped by the viewer's local calendar date (yyyy-MM-dd), keys and values ascending. */
export function groupByLocalDate(slots: Date[], tz: string): Map<string, Date[]> {
  const sorted = [...slots].sort((a, b) => a.getTime() - b.getTime());
  const groups = new Map<string, Date[]>();
  for (const slot of sorted) {
    const key = formatInTimeZone(slot, tz, DATE);
    const bucket = groups.get(key);
    if (bucket) bucket.push(slot);
    else groups.set(key, [slot]);
  }
  return groups;
}

/** `count` consecutive local dates in `tz`, starting with today in that zone. */
export function upcomingDates(now: Date, tz: string, count: number): string[] {
  const today = formatInTimeZone(now, tz, DATE);
  // Anchor at local noon so adding days never crosses a DST boundary into the wrong date.
  const anchor = fromZonedTime(`${today} 12:00`, tz);
  const out: string[] = [];
  for (let i = 0; i < count; i += 1) {
    out.push(formatInTimeZone(addDays(anchor, i), tz, DATE));
  }
  return out;
}

export function slotEnd(start: Date, slotMinutes: SlotMinutes): Date {
  return addMinutes(start, slotMinutes);
}
