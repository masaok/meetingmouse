import { afterEach, describe, expect, it, vi } from "vitest";

import { log, withTiming } from "./log";

afterEach(() => vi.restoreAllMocks());

describe("log", () => {
  it("emits exactly one JSON line per call with level and fields", () => {
    const out = vi.spyOn(console, "log").mockImplementation(() => {});
    log.info({ action: "when_command", poll_id: "p1" });
    expect(out).toHaveBeenCalledTimes(1);
    const parsed = JSON.parse(out.mock.calls[0][0] as string);
    expect(parsed).toMatchObject({
      level: "info",
      action: "when_command",
      poll_id: "p1",
    });
    expect(typeof parsed.ts).toBe("string");
  });

  it("routes warn and error to their console channels", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    log.warn({ a: 1 });
    log.error({ b: 2 });
    expect(JSON.parse(warn.mock.calls[0][0] as string)).toMatchObject({
      level: "warn",
      a: 1,
    });
    expect(JSON.parse(err.mock.calls[0][0] as string)).toMatchObject({
      level: "error",
      b: 2,
    });
  });

  it("withTiming logs duration on success and rethrows on failure", async () => {
    const out = vi.spyOn(console, "log").mockImplementation(() => {});
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await withTiming({ action: "ok" }, async () => 42)).toBe(42);
    expect(JSON.parse(out.mock.calls[0][0] as string)).toMatchObject({ action: "ok" });
    expect(JSON.parse(out.mock.calls[0][0] as string).duration_ms).toBeGreaterThanOrEqual(
      0,
    );

    await expect(
      withTiming({ action: "x" }, async () => Promise.reject(new Error("boom"))),
    ).rejects.toThrow("boom");
    expect(JSON.parse(err.mock.calls[0][0] as string)).toMatchObject({
      level: "error",
      action: "x",
      error: "boom",
    });
  });
});
