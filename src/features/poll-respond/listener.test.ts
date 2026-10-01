import { beforeEach, describe, expect, it, vi } from "vitest";

import { getPollSnapshot, getUserAvailability, saveResponse } from "@/db/queries";
import { refreshPollMessage } from "@/lib/refresh";
import { fixture } from "@/slack/fixtures";
import { epochSeconds } from "@/slack/format";
import {
  ACTION_GRID_LINK,
  ACTION_RESPOND_BUTTON,
  ACTION_RESPOND_CHECKBOXES,
  CALLBACK_RESPOND_MODAL,
} from "@/slack/ids";

import { fakeApp, fakeClient } from "../../../tests/helpers/fakeApp";
import { register } from "./listener";
import { dayBlockId, RESPOND } from "./schema";

vi.mock("@/db/client", () => ({ db: {} }));
vi.mock("@/db/queries", () => ({
  getPollSnapshot: vi.fn(),
  getUserAvailability: vi.fn().mockResolvedValue([]),
  saveResponse: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/lib/users", () => ({
  getUserProfile: vi.fn().mockResolvedValue({ tz: "Asia/Tokyo", displayName: "taro" }),
}));
vi.mock("@/lib/refresh", () => ({
  refreshPollMessage: vi.fn().mockResolvedValue("updated"),
}));

const snapshot = fixture("three-day");
const POLL_ID = snapshot.poll.id;

const buttonArgs = (client: ReturnType<typeof fakeClient>) => ({
  ack: vi.fn(),
  client,
  respond: vi.fn().mockResolvedValue(undefined),
  action: { type: "button", action_id: ACTION_RESPOND_BUTTON, value: POLL_ID },
  body: {
    user: { id: "U0002" },
    team: { id: "T1" },
    trigger_id: "tr",
    type: "block_actions",
  },
});

const submitArgs = (
  client: ReturnType<typeof fakeClient>,
  values: Record<string, unknown>,
) => ({
  ack: vi.fn(),
  client,
  view: {
    private_metadata: JSON.stringify({ pollId: POLL_ID }),
    team_id: "T1",
    state: { values },
  },
  body: { user: { id: "U0002" }, team: { id: "T1" } },
});

describe("poll-respond listener", () => {
  const { app, invoke } = fakeApp();
  register(app);

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getPollSnapshot).mockResolvedValue(snapshot);
    vi.mocked(getUserAvailability).mockResolvedValue([]);
  });

  it("opens the loading view before touching the database, then swaps in the real modal", async () => {
    const order: string[] = [];
    const client = fakeClient();
    client.views.open.mockImplementation(async () => {
      order.push("views.open");
      return { ok: true, view: { id: "V1" } };
    });
    vi.mocked(getPollSnapshot).mockImplementation(async () => {
      order.push("getPollSnapshot");
      return snapshot;
    });
    vi.mocked(getUserAvailability).mockResolvedValue([snapshot.slots[2]]);

    await invoke("action", ACTION_RESPOND_BUTTON, buttonArgs(client));

    expect(order).toEqual(["views.open", "getPollSnapshot"]);
    expect(client.views.update).toHaveBeenCalledOnce();
    const view = client.views.update.mock.calls[0][0].view;
    expect(client.views.update.mock.calls[0][0].view_id).toBe("V1");
    expect(JSON.stringify(view.blocks[0])).toContain("Asia/Tokyo");
    expect(JSON.stringify(view)).toContain(
      `"value":"${epochSeconds(snapshot.slots[2])}"`,
    );
    expect(JSON.stringify(view)).toContain("pre-filled");
  });

  it("shows the closed view instead of the form when the poll is not open", async () => {
    vi.mocked(getPollSnapshot).mockResolvedValue(fixture("closed"));
    const client = fakeClient();
    await invoke("action", ACTION_RESPOND_BUTTON, buttonArgs(client));
    expect(JSON.stringify(client.views.update.mock.calls[0][0].view)).toContain("closed");
    expect(getUserAvailability).not.toHaveBeenCalled();
  });

  it("recovers from a failure by updating the modal and replying ephemerally", async () => {
    vi.mocked(getPollSnapshot).mockRejectedValueOnce(
      Object.assign(new Error("boom"), { data: { error: "fatal_error" } }),
    );
    const client = fakeClient();
    const args = buttonArgs(client);
    await invoke("action", ACTION_RESPOND_BUTTON, args);
    expect(JSON.stringify(client.views.update.mock.calls[0][0].view)).toContain(
      "went wrong",
    );
    expect(args.respond).toHaveBeenCalledWith(
      expect.objectContaining({ text: expect.stringContaining("fatal_error") }),
    );
  });

  it("saves only known slots, replace-all, then refreshes the message", async () => {
    const client = fakeClient();
    const args = submitArgs(client, {
      [dayBlockId("2026-10-07", 0)]: {
        [RESPOND.SLOTS_ACTION]: {
          selected_options: [
            { value: String(epochSeconds(snapshot.slots[1])) },
            { value: "1234567890" },
          ],
        },
      },
      [RESPOND.NONE_BLOCK]: { [RESPOND.NONE_ACTION]: { selected_options: [] } },
    });
    await invoke("view", CALLBACK_RESPOND_MODAL, args);
    expect(args.ack).toHaveBeenCalledWith();
    expect(saveResponse).toHaveBeenCalledWith(
      {},
      {
        pollId: POLL_ID,
        userId: "U0002",
        tz: "Asia/Tokyo",
        displayName: "taro",
        slots: [snapshot.slots[1]],
      },
    );
    expect(refreshPollMessage).toHaveBeenCalledWith({}, client, POLL_ID);
  });

  it("records 'none of these' as a participant with zero slots", async () => {
    const client = fakeClient();
    const args = submitArgs(client, {
      [RESPOND.NONE_BLOCK]: {
        [RESPOND.NONE_ACTION]: { selected_options: [{ value: RESPOND.NONE_VALUE }] },
      },
    });
    await invoke("view", CALLBACK_RESPOND_MODAL, args);
    expect(vi.mocked(saveResponse).mock.calls[0][1].slots).toEqual([]);
  });

  it("refuses a submission to a poll that closed meanwhile", async () => {
    vi.mocked(getPollSnapshot).mockResolvedValue(fixture("scheduled"));
    const client = fakeClient();
    const args = submitArgs(client, {});
    await invoke("view", CALLBACK_RESPOND_MODAL, args);
    expect(args.ack).toHaveBeenCalledWith(
      expect.objectContaining({ response_action: "update" }),
    );
    expect(saveResponse).not.toHaveBeenCalled();
  });

  it("tells the user ephemerally when saving fails", async () => {
    vi.mocked(saveResponse).mockRejectedValueOnce(new Error("Failed query"));
    const client = fakeClient();
    await invoke("view", CALLBACK_RESPOND_MODAL, submitArgs(client, {}));
    expect(client.chat.postEphemeral).toHaveBeenCalledWith(
      expect.objectContaining({
        user: "U0002",
        text: expect.stringContaining("not saved"),
      }),
    );
    expect(refreshPollMessage).not.toHaveBeenCalled();
  });
});

describe("poll-respond listener with the web grid", () => {
  const { app, invoke } = fakeApp();
  register(app, {
    grid: { urlFor: (c) => `https://host.test/grid/${c.pollId}.${c.teamId}.${c.userId}` },
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getPollSnapshot).mockResolvedValue(snapshot);
    vi.mocked(getUserAvailability).mockResolvedValue([]);
  });

  it("leads with the viewer's own grid link, and offers the checkboxes", async () => {
    const client = fakeClient();
    await invoke("action", ACTION_RESPOND_BUTTON, buttonArgs(client));

    const view = client.views.update.mock.calls[0][0].view;
    const buttons = view.blocks.find(
      (b: { type: string }) => b.type === "actions",
    ).elements;
    expect(buttons.map((b: { action_id: string }) => b.action_id)).toEqual([
      ACTION_GRID_LINK,
      ACTION_RESPOND_CHECKBOXES,
    ]);
    expect(buttons[0].url).toBe(`https://host.test/grid/${POLL_ID}.T1.U0002`);
    expect(buttons[1].value).toBe(POLL_ID);
    expect(view.submit).toBeUndefined();
  });

  it("swaps the chooser for the checkbox form on request", async () => {
    const client = fakeClient();
    await invoke("action", ACTION_RESPOND_CHECKBOXES, {
      ack: vi.fn(),
      client,
      action: { type: "button", action_id: ACTION_RESPOND_CHECKBOXES, value: POLL_ID },
      body: { user: { id: "U0002" }, team: { id: "T1" }, view: { id: "V9" } },
    });

    const call = client.views.update.mock.calls[0][0];
    expect(call.view_id).toBe("V9");
    expect(call.view.submit.text).toBe("Save");
    expect(JSON.stringify(call.view.blocks)).toContain("Tick every slot");
  });

  it("still refuses a closed poll before offering the grid", async () => {
    vi.mocked(getPollSnapshot).mockResolvedValue(fixture("closed"));
    const client = fakeClient();
    await invoke("action", ACTION_RESPOND_BUTTON, buttonArgs(client));

    expect(JSON.stringify(client.views.update.mock.calls[0][0].view)).toContain(
      "This poll is closed",
    );
  });

  it("acks the link button, which Slack reports like any other action", async () => {
    const ack = vi.fn();
    await invoke("action", ACTION_GRID_LINK, { ack });
    expect(ack).toHaveBeenCalledTimes(1);
  });
});
