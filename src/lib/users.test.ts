import { beforeAll, describe, expect, it, vi } from "vitest";

import type { Db } from "@/db/queries";

import { testDb } from "../../tests/db/pglite";
import {
  DeactivatedUserError,
  getUserProfile,
  USER_CACHE_TTL_MS,
  type UsersClient,
} from "./users";

let db: Db;
beforeAll(async () => {
  db = await testDb();
});

function fakeClient(user: Record<string, unknown> | undefined) {
  const info = vi.fn().mockResolvedValue({ ok: true, user });
  return { client: { users: { info } } as unknown as UsersClient, info };
}

describe("getUserProfile", () => {
  it("fetches once, then serves from the cache", async () => {
    const { client, info } = fakeClient({
      id: "U1",
      tz: "Asia/Tokyo",
      real_name: "Ichiro",
      profile: { display_name: "ichi" },
    });
    const first = await getUserProfile(db, client, "T1", "U1");
    const second = await getUserProfile(db, client, "T1", "U1");
    expect(first).toEqual({ tz: "Asia/Tokyo", displayName: "ichi" });
    expect(second).toEqual(first);
    expect(info).toHaveBeenCalledTimes(1);
    expect(info).toHaveBeenCalledWith({ user: "U1" });
  });

  it("refetches after the TTL", async () => {
    const { client, info } = fakeClient({ id: "U2", tz: "UTC", real_name: "Two" });
    await getUserProfile(db, client, "T1", "U2");
    const later = new Date(Date.now() + USER_CACHE_TTL_MS + 1000);
    await getUserProfile(db, client, "T1", "U2", later);
    expect(info).toHaveBeenCalledTimes(2);
  });

  it("falls back to real_name, then name, then UTC", async () => {
    const { client } = fakeClient({
      id: "U3",
      name: "u3",
      profile: { display_name: "" },
    });
    expect(await getUserProfile(db, client, "T1", "U3")).toEqual({
      tz: "UTC",
      displayName: "u3",
    });
  });

  it("throws when Slack returns no user", async () => {
    const { client } = fakeClient(undefined);
    await expect(getUserProfile(db, client, "T1", "U4")).rejects.toThrow(/no user/);
  });

  it("refetches sooner for a caller that asks for a fresher profile", async () => {
    const { client, info } = fakeClient({ id: "U5", tz: "UTC", real_name: "Five" });
    const at = new Date("2026-10-06T16:00:00Z");
    await getUserProfile(db, client, "T1", "U5", at);
    await getUserProfile(db, client, "T1", "U5", new Date(at.getTime() + 59_999), 60_000);
    expect(info).toHaveBeenCalledTimes(1);
    await getUserProfile(db, client, "T1", "U5", new Date(at.getTime() + 60_000), 60_000);
    expect(info).toHaveBeenCalledTimes(2);
  });

  it("throws for a deactivated person and caches nothing", async () => {
    const { client, info } = fakeClient({ id: "U6", deleted: true, name: "six" });
    await expect(getUserProfile(db, client, "T1", "U6")).rejects.toBeInstanceOf(
      DeactivatedUserError,
    );
    await expect(getUserProfile(db, client, "T1", "U6")).rejects.toBeInstanceOf(
      DeactivatedUserError,
    );
    expect(info).toHaveBeenCalledTimes(2);
  });
});
