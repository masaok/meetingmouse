import { beforeEach, describe, expect, it, vi } from "vitest";

import { getPollSnapshot } from "@/db/queries";
import { fixture } from "@/slack/fixtures";

import { fakeClient } from "../../tests/helpers/fakeApp";
import { refreshPollMessage } from "./refresh";

vi.mock("@/db/queries", () => ({ getPollSnapshot: vi.fn() }));

const db = {} as never;

describe("refreshPollMessage", () => {
  beforeEach(() => vi.clearAllMocks());

  it("re-renders from a fresh snapshot and updates in place", async () => {
    vi.mocked(getPollSnapshot).mockResolvedValue(fixture("three-day"));
    const client = fakeClient();
    expect(await refreshPollMessage(db, client, "P1")).toBe("updated");
    expect(client.chat.update).toHaveBeenCalledWith(
      expect.objectContaining({
        channel: "C0000TEST",
        ts: "1700000000.000100",
        blocks: expect.any(Array),
      }),
    );
  });

  it("reports a missing poll or message without calling Slack", async () => {
    vi.mocked(getPollSnapshot).mockResolvedValue(null);
    const client = fakeClient();
    expect(await refreshPollMessage(db, client, "P1")).toBe("no_poll");
    const s = fixture("three-day");
    vi.mocked(getPollSnapshot).mockResolvedValue({
      ...s,
      poll: { ...s.poll, messageTs: null },
    });
    expect(await refreshPollMessage(db, client, "P1")).toBe("no_message");
    expect(client.chat.update).not.toHaveBeenCalled();
  });

  it("tolerates a manually deleted message and rethrows anything else", async () => {
    vi.mocked(getPollSnapshot).mockResolvedValue(fixture("three-day"));
    const client = fakeClient();
    client.chat.update.mockRejectedValueOnce(
      Object.assign(new Error("x"), { data: { error: "message_not_found" } }),
    );
    expect(await refreshPollMessage(db, client, "P1")).toBe("message_gone");
    client.chat.update.mockRejectedValueOnce(
      Object.assign(new Error("x"), { data: { error: "ratelimited" } }),
    );
    await expect(refreshPollMessage(db, client, "P1")).rejects.toThrow();
  });
});
