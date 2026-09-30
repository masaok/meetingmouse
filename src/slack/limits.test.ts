import { describe, expect, it } from "vitest";

import { POLL_LIMITS, SLOT_MINUTES } from "@/domain/constants";

import { SLACK_LIMITS } from "./limits";

/** The poll limits are derived from the Slack limits. These tests are the derivation. */
describe("poll limits fit inside Slack limits", () => {
  it("worst-case respond modal stays under the block cap", () => {
    const inputsPerDay = Math.ceil(
      POLL_LIMITS.MAX_SLOTS_PER_DAY / SLACK_LIMITS.CHECKBOX_OPTIONS,
    );
    const perDay = 1 /* header */ + inputsPerDay;
    const fixed = 3; // context line, divider, "can't make any" input
    expect(POLL_LIMITS.MAX_DAYS * perDay + fixed).toBeLessThanOrEqual(
      SLACK_LIMITS.BLOCKS_PER_MODAL,
    );
  });

  it("worst-case poll message stays under the block cap", () => {
    const fixed = 8; // header, context, best times, divider, everyone-free, respondents, actions, spare
    expect(POLL_LIMITS.MAX_DAYS + fixed).toBeLessThanOrEqual(
      SLACK_LIMITS.BLOCKS_PER_MESSAGE,
    );
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
