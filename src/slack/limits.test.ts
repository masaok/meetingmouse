import { describe, expect, it } from "vitest";

import { POLL_LIMITS, SLOT_MINUTES } from "@/domain/constants";

import { SLACK_LIMITS } from "./limits";

/** The poll limits are derived from the Slack limits. These tests are the derivation. */
describe("poll limits fit inside Slack limits", () => {
  it("worst-case respond modal stays under the block cap", () => {
    // A responder in another zone can see one more local day than the organizer picked.
    // Each day is one heading plus one actions block holding every slot.
    const days = POLL_LIMITS.MAX_DAYS + 1;
    const perDay = 2;
    const fixed = 5; // context line, web grid link, divider, "can't make any" button, status line
    expect(days * perDay + fixed).toBeLessThanOrEqual(SLACK_LIMITS.BLOCKS_PER_MODAL);
    expect(POLL_LIMITS.MAX_SLOTS_PER_DAY).toBeLessThanOrEqual(
      SLACK_LIMITS.ACTIONS_ELEMENTS,
    );
  });

  it("worst-case poll message stays under the block cap", () => {
    const fixed = 9; // header, context, best times, everyone-free, divider, table, legend, respondents, actions
    expect(fixed).toBeLessThanOrEqual(SLACK_LIMITS.BLOCKS_PER_MESSAGE);
  });

  it("worst-case availability grid fits in one table", () => {
    expect(1 + POLL_LIMITS.MAX_SLOTS_PER_DAY).toBeLessThanOrEqual(
      SLACK_LIMITS.TABLE_ROWS,
    );
    expect(1 + POLL_LIMITS.MAX_DAYS).toBeLessThanOrEqual(SLACK_LIMITS.TABLE_COLUMNS);
  });

  it("date picker fits in a static select", () => {
    expect(POLL_LIMITS.DATE_PICKER_DAYS).toBeLessThanOrEqual(
      SLACK_LIMITS.STATIC_SELECT_OPTIONS,
    );
  });

  it("an epoch-seconds option value fits", () => {
    expect(String(2_000_000_000).length).toBeLessThanOrEqual(
      SLACK_LIMITS.OPTION_VALUE_CHARS,
    );
  });

  it("slot lengths divide an hour", () => {
    for (const m of SLOT_MINUTES) expect(60 % m).toBe(0);
  });
});
