import { describe, expect, it } from "vitest";

import {
  parsePickSubmission,
  parsePrivateMetadata,
  PICK,
  pollIdFromBlockId,
} from "./schema";

const ID = "00000000-0000-4000-8000-000000000001";

describe("pollIdFromBlockId", () => {
  it("round-trips the poll message's actions block id", () => {
    expect(pollIdFromBlockId(`poll_actions_${ID}`)).toBe(ID);
  });

  it("rejects garbage", () => {
    expect(pollIdFromBlockId(undefined)).toBeNull();
    expect(pollIdFromBlockId("poll_actions_")).toBeNull();
    expect(pollIdFromBlockId("poll_actions_not-a-uuid")).toBeNull();
    expect(pollIdFromBlockId(`other_${ID}`)).toBeNull();
  });
});

describe("parsePickSubmission", () => {
  it("returns the selected slot start", () => {
    const d = parsePickSubmission({
      [PICK.block]: { [PICK.action]: { selected_option: { value: "1791302400" } } },
    });
    expect(d?.toISOString()).toBe("2026-10-06T16:00:00.000Z");
  });

  it("returns null for nothing selected, garbage, or malformed state", () => {
    expect(
      parsePickSubmission({ [PICK.block]: { [PICK.action]: { selected_option: null } } }),
    ).toBeNull();
    expect(
      parsePickSubmission({
        [PICK.block]: { [PICK.action]: { selected_option: { value: "abc" } } },
      }),
    ).toBeNull();
    expect(parsePickSubmission("nope")).toBeNull();
  });
});

describe("parsePrivateMetadata", () => {
  it("parses defensively", () => {
    expect(parsePrivateMetadata(JSON.stringify({ pollId: ID }))).toEqual({ pollId: ID });
    expect(parsePrivateMetadata('{"pollId":"x"}')).toBeNull();
    expect(parsePrivateMetadata(undefined)).toBeNull();
    expect(parsePrivateMetadata("{")).toBeNull();
  });
});
