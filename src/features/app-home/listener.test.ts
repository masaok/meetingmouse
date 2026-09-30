import { beforeEach, describe, expect, it, vi } from "vitest";

import { listPollsForUser } from "@/db/queries";
import { fixture } from "@/slack/fixtures";
import { EVENT_APP_HOME_OPENED } from "@/slack/ids";

import { fakeApp, fakeClient } from "../../../tests/helpers/fakeApp";
import { register } from "./listener";

vi.mock("@/db/client", () => ({ db: {} }));
vi.mock("@/db/queries", () => ({ listPollsForUser: vi.fn() }));

const poll = fixture("three-day").poll;

const eventArgs = (client: ReturnType<typeof fakeClient>, tab = "home") => ({
  client,
  event: { type: "app_home_opened", user: "U0000TEST", tab, channel: "D1" },
  body: { team_id: "T0000TEST" },
});

describe("app-home listener", () => {
  const { app, invoke } = fakeApp();
  register(app);

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(listPollsForUser).mockResolvedValue({ organized: [poll], responded: [] });
  });

  it("publishes the home view for the user", async () => {
    const client = fakeClient();
    await invoke("event", EVENT_APP_HOME_OPENED, eventArgs(client));
    expect(listPollsForUser).toHaveBeenCalledWith({}, "T0000TEST", "U0000TEST");
    expect(client.chat.getPermalink).toHaveBeenCalledWith({
      channel: poll.channelId,
      message_ts: poll.messageTs,
    });
    expect(client.views.publish).toHaveBeenCalledOnce();
    const { user_id, view } = client.views.publish.mock.calls[0][0];
    expect(user_id).toBe("U0000TEST");
    expect(JSON.stringify(view)).toContain("https://slack.com/archives/C1/p1");
  });

  it("ignores other tabs", async () => {
    const client = fakeClient();
    await invoke("event", EVENT_APP_HOME_OPENED, eventArgs(client, "messages"));
    expect(listPollsForUser).not.toHaveBeenCalled();
    expect(client.views.publish).not.toHaveBeenCalled();
  });

  it("still publishes when a permalink lookup fails", async () => {
    const client = fakeClient();
    client.chat.getPermalink.mockRejectedValueOnce(
      Object.assign(new Error("x"), { data: { error: "message_not_found" } }),
    );
    await invoke("event", EVENT_APP_HOME_OPENED, eventArgs(client));
    expect(client.views.publish).toHaveBeenCalledOnce();
    expect(JSON.stringify(client.views.publish.mock.calls[0][0].view)).not.toContain(
      "slack.com/archives",
    );
  });
});
