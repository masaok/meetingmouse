import { describe, expect, it } from "vitest";

import { deriveGridSecret, gridLinks, signGridLink, verifyGridLink } from "./link";

const secret = deriveGridSecret("parent-secret");
const claims = { pollId: "poll-1", teamId: "T1", userId: "U1" };
const now = new Date("2026-10-06T16:00:00Z");
const later = (seconds: number) => new Date(now.getTime() + seconds * 1000);

describe("grid links", () => {
  it("round-trips the claims", () => {
    expect(verifyGridLink(secret, signGridLink(secret, claims, now), now)).toEqual(
      claims,
    );
  });

  it("rejects a token signed with another secret", () => {
    const token = signGridLink(deriveGridSecret("someone-else"), claims, now);
    expect(verifyGridLink(secret, token, now)).toBeNull();
  });

  it("rejects a token whose claims were edited", () => {
    const [version, , signature] = signGridLink(secret, claims, now).split(".");
    const forged = Buffer.from(
      JSON.stringify(["poll-1", "T1", "U2", 9_999_999_999]),
    ).toString("base64url");
    expect(verifyGridLink(secret, `${version}.${forged}.${signature}`, now)).toBeNull();
  });

  it("expires 24 hours after it was signed", () => {
    const token = signGridLink(secret, claims, now);
    expect(verifyGridLink(secret, token, later(86_399))).toEqual(claims);
    expect(verifyGridLink(secret, token, later(86_400))).toBeNull();
  });

  it("rejects garbage", () => {
    for (const token of ["", "v1", "v1.a.b", "v2.a.b", "v1.a.b.c", "not a token"])
      expect(verifyGridLink(secret, token, now)).toBeNull();
  });

  it("derives a key that differs from its parent and is stable", () => {
    expect(deriveGridSecret("parent-secret").toString("hex")).toBe(
      deriveGridSecret("parent-secret").toString("hex"),
    );
    expect(deriveGridSecret("parent-secret").toString("utf8")).not.toBe("parent-secret");
    expect(deriveGridSecret("parent-secret")).toHaveLength(32);
  });

  it("builds a URL under /grid on the host's origin", () => {
    const url = gridLinks({ baseUrl: "https://app.example.com/", secret }).urlFor(claims);
    expect(url.startsWith("https://app.example.com/grid/v1.")).toBe(true);
    expect(verifyGridLink(secret, url.split("/grid/")[1])).toEqual(claims);
  });
});
