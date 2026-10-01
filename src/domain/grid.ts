import { formatInTz, groupByLocalDate } from "./slots";

/**
 * A poll laid out the way a person reads a calendar: a column per local day, a row per time of
 * day, a slot or nothing in each cell. The Slack message and the web grid both draw from it.
 */
export interface GridModel {
  /** Local calendar dates (yyyy-MM-dd) ascending, each with its earliest slot for labelling. */
  days: { date: string; first: Date }[];
  /** Local times of day (HH:mm) ascending, each with one slot at that time for labelling. */
  rows: { time: string; sample: Date }[];
  /** `cells[row][day]`. Null where a day lacks that time, as around a daylight-saving change. */
  cells: (Date | null)[][];
}

export function gridModel(slots: Date[], tz: string): GridModel {
  const byDay = [...groupByLocalDate(slots, tz)].map(([date, daySlots]) => ({
    date,
    first: daySlots[0],
    byTime: new Map(daySlots.map((s) => [formatInTz(s, tz, "HH:mm"), s])),
  }));
  const samples = new Map<string, Date>();
  for (const day of byDay)
    for (const [time, slot] of day.byTime)
      if (!samples.has(time)) samples.set(time, slot);
  const rows = [...samples]
    .map(([time, sample]) => ({ time, sample }))
    .sort((a, b) => a.time.localeCompare(b.time));
  return {
    days: byDay.map(({ date, first }) => ({ date, first })),
    rows,
    cells: rows.map((row) => byDay.map((day) => day.byTime.get(row.time) ?? null)),
  };
}
