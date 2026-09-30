/**
 * Single home for every poll-shaped constant. The Slack modal, the zod parser, the DB
 * check constraint and the heatmap all derive from these, so they cannot disagree.
 */
export const SLOT_MINUTES = [15, 30, 60] as const;
export type SlotMinutes = (typeof SLOT_MINUTES)[number];
export const DEFAULT_SLOT_MINUTES: SlotMinutes = 30;

export const POLL_STATUSES = ["open", "closed", "scheduled"] as const;
export type PollStatus = (typeof POLL_STATUSES)[number];

export const POLL_LIMITS = {
  /** A poll may span at most this many calendar days (keeps the respond modal under 100 blocks). */
  MAX_DAYS: 14,
  /** At most this many slots per day (24 × 60-min, 24 × 30-min = 12 h, 24 × 15-min = 6 h). */
  MAX_SLOTS_PER_DAY: 24,
  MAX_TITLE_CHARS: 150,
  /** The create modal offers this many upcoming dates. */
  DATE_PICKER_DAYS: 21,
  /** Daily window bounds, in minutes from local midnight. */
  WINDOW_MIN_MINUTES: 6 * 60,
  WINDOW_MAX_MINUTES: 23 * 60,
  DEFAULT_FROM_MINUTES: 9 * 60,
  DEFAULT_TO_MINUTES: 17 * 60,
  /** Best-times list length. */
  BEST_TIMES: 3,
  /** Pick-final-time modal offers this many candidates. */
  PICK_CANDIDATES: 10,
} as const;
