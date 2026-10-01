import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

/** A host that authorizes per workspace has no bot token in its environment (#37). */
describe("getDb without SLACK_BOT_TOKEN", () => {
  const saved = process.env.SLACK_BOT_TOKEN;
  beforeEach(() => {
    vi.resetModules();
    delete process.env.SLACK_BOT_TOKEN;
    process.env.DATABASE_URL = "postgres://host-test:pw@localhost:5432/meetingmouse";
  });
  afterEach(() => {
    process.env.SLACK_BOT_TOKEN = saved;
  });

  it("builds the client from DATABASE_URL alone", async () => {
    const { getDb } = await import("./client");
    expect(() => getDb()).not.toThrow();
  });

  it("still names DATABASE_URL when that is what is missing", async () => {
    delete process.env.DATABASE_URL;
    const { getDb } = await import("./client");
    expect(() => getDb()).toThrow(/DATABASE_URL/);
  });
});
