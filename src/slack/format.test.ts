import { describe, expect, it } from "vitest";

import { dateToken, epochSeconds, escapeMrkdwn, truncate, userMention } from "./format";

describe("format", () => {
  it("escapes mrkdwn control characters", () => {
    expect(escapeMrkdwn("a & <b> c")).toBe("a &amp; &lt;b&gt; c");
  });

  it("renders a localized date token with an escaped fallback", () => {
    const d = new Date("2026-09-30T16:00:00Z");
    expect(dateToken(d, "{time}", "9:00 AM <PT>")).toBe(
      `<!date^${epochSeconds(d)}^{time}|9:00 AM &lt;PT&gt;>`,
    );
  });

  it("truncates with an ellipsis inside the limit", () => {
    expect(truncate("abcdef", 4)).toBe("abc…");
    expect(truncate("abc", 4)).toBe("abc");
  });

  it("mentions users", () => {
    expect(userMention("U1")).toBe("<@U1>");
  });
});
