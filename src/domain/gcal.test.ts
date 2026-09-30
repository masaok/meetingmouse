import { describe, expect, it } from "vitest";

import { gcalInstant, gcalUrl } from "./gcal";

describe("gcal", () => {
  it("formats an instant as UTC with the Z suffix", () => {
    expect(gcalInstant(new Date("2026-10-01T16:30:00.000Z"))).toBe("20261001T163000Z");
  });

  it("builds a template URL with encoded title and details", () => {
    const url = gcalUrl({
      title: "Sprint & planning",
      start: new Date("2026-10-01T16:00:00Z"),
      end: new Date("2026-10-01T16:30:00Z"),
      details: "Picked via Meet Mouse",
    });
    const parsed = new URL(url);
    expect(parsed.origin + parsed.pathname).toBe(
      "https://calendar.google.com/calendar/render",
    );
    expect(parsed.searchParams.get("action")).toBe("TEMPLATE");
    expect(parsed.searchParams.get("text")).toBe("Sprint & planning");
    expect(parsed.searchParams.get("dates")).toBe("20261001T160000Z/20261001T163000Z");
    expect(parsed.searchParams.get("details")).toBe("Picked via Meet Mouse");
    expect(url).toContain("text=Sprint+%26+planning");
  });

  it("omits optional fields when absent", () => {
    const url = gcalUrl({
      title: "x",
      start: new Date("2026-10-01T16:00:00Z"),
      end: new Date("2026-10-01T17:00:00Z"),
    });
    expect(url).not.toContain("details=");
    expect(url).not.toContain("location=");
  });
});
