import { afterEach, expect, test, vi } from "vitest";

vi.mock("server-only", () => ({}));

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

test("the database client is built on a host that has no bot token", async () => {
  vi.stubEnv("SLACK_BOT_TOKEN", undefined);
  vi.stubEnv("DATABASE_URL", "postgres://test:test@localhost/test");
  const { getDb } = await import("./client");

  expect(typeof getDb().select).toBe("function");
});

test("a missing DATABASE_URL is named in the error", async () => {
  vi.stubEnv("DATABASE_URL", undefined);
  const { getDb } = await import("./client");

  expect(() => getDb()).toThrow(/DATABASE_URL/);
});
