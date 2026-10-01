import type { PollStatus } from "@/domain/constants";
import { gridModel } from "@/domain/grid";
import { formatInTz, slotEnd } from "@/domain/slots";
import type { PollSnapshot } from "@/domain/types";

const seconds = (d: Date): number => Math.floor(d.getTime() / 1000);

/**
 * Everything the grid page draws, for one viewer, as plain JSON. The viewer's own slots are
 * kept apart from everyone else's so the page can redraw the group's side the instant the
 * viewer paints, before the save comes back.
 */
export interface GridState {
  title: string;
  status: PollStatus;
  /** The zone the labels and the day grouping are in: the viewer's Slack zone. */
  tz: string;
  slotMinutes: number;
  days: { label: string; weekday: string }[];
  rows: { label: string; onHour: boolean }[];
  /** The time the last row ends, for the label under the grid. */
  endLabel: string;
  /** `cells[row][day]`: the slot's epoch seconds, or null where the day lacks that time. */
  cells: (number | null)[][];
  me: { name: string; responded: boolean; slots: number[] };
  /** Display names of the other people free in each slot, keyed by epoch seconds. */
  others: Record<string, string[]>;
  /** How many other people have responded, with or without any slot. */
  othersTotal: number;
}

export function gridState(
  snapshot: PollSnapshot,
  viewer: { userId: string; displayName: string; tz: string },
): GridState {
  const { poll, slots, participants, availability } = snapshot;
  const { days, rows, cells } = gridModel(slots, viewer.tz);
  const nameOf = new Map(participants.map((p) => [p.userId, p.displayName]));
  const others: Record<string, string[]> = {};
  const mine: number[] = [];
  for (const { userId, slotStart } of availability) {
    const key = seconds(slotStart);
    if (userId === viewer.userId) mine.push(key);
    else (others[key] ??= []).push(nameOf.get(userId) ?? userId);
  }
  const responded = participants.some((p) => p.userId === viewer.userId);
  const last = rows.at(-1);
  return {
    title: poll.title,
    status: poll.status,
    tz: viewer.tz,
    slotMinutes: poll.slotMinutes,
    days: days.map(({ first }) => ({
      label: formatInTz(first, viewer.tz, "MMM d"),
      weekday: formatInTz(first, viewer.tz, "EEE"),
    })),
    rows: rows.map(({ time, sample }) => ({
      label: formatInTz(sample, viewer.tz, "h:mm a"),
      onHour: time.endsWith(":00"),
    })),
    endLabel: last
      ? formatInTz(slotEnd(last.sample, poll.slotMinutes), viewer.tz, "h:mm a")
      : "",
    cells: cells.map((row) => row.map((slot) => (slot ? seconds(slot) : null))),
    me: { name: viewer.displayName, responded, slots: mine },
    others,
    othersTotal: participants.length - (responded ? 1 : 0),
  };
}
