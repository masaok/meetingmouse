import { beforeEach, describe, expect, it, vi } from "vitest";

import { deletePoll, getPoll, getPollSnapshot, setStatus } from "@/db/queries";
import { refreshPollMessage } from "@/lib/refresh";
import { fixture } from "@/slack/fixtures";
import { epochSeconds } from "@/slack/format";
import {
  ACTION_GCAL_LINK,
  ACTION_ORGANIZER_MENU,
  CALLBACK_PICK_TIME_MODAL,
  ORGANIZER_MENU,
} from "@/slack/ids";

import { fakeApp, fakeClient } from "../../../tests/helpers/fakeApp";
import { ALREADY_SCHEDULED, ORGANIZER_ONLY, register } from "./listener";
import { PICK } from "./schema";

vi.mock("@/db/client", () => ({ db: {} }));
vi.mock("@/db/queries", () => ({
  getPoll: vi.fn(),
  getPollSnapshot: vi.fn(),
  setStatus: vi.fn().mockResolvedValue(undefined),
  deletePoll: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/lib/refresh", () => ({
  refreshPollMessage: vi.fn().mockResolvedValue("updated"),
}));

const snapshot = fixture("three-day");
const POLL_ID = snapshot.poll.id;
const ORGANIZER = snapshot.poll.creatorId;

const menuArgs = (
  client: ReturnType<typeof fakeClient>,
  value: string,
  userId = ORGANIZER,
) => ({
  ack: vi.fn(),
  client,
  respond: vi.fn().mockResolvedValue(undefined),
  action: {
    type: "overflow",
    action_id: ACTION_ORGANIZER_MENU,
    block_id: `poll_actions_${POLL_ID}`,
    selected_option: { value },
  },
  body: {
    user: { id: userId },
    team: { id: "T1" },
    trigger_id: "tr",
    type: "block_actions",
  },
});

const pickArgs = (
  client: ReturnType<typeof fakeClient>,
  value: string,
  userId = ORGANIZER,
) => ({
  ack: vi.fn(),
  client,
  view: {
    private_metadata: JSON.stringify({ pollId: POLL_ID }),
    team_id: "T1",
    state: {
      values: { [PICK.block]: { [PICK.action]: { selected_option: { value } } } },
    },
  },
  body: { user: { id: userId }, team: { id: "T1" } },
});

describe("poll-organize listener", () => {
  const { app, invoke } = fakeApp();
  register(app);

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getPoll).mockResolvedValue(snapshot.poll);
    vi.mocked(getPollSnapshot).mockResolvedValue(snapshot);
  });

  it("denies a non-organizer and does nothing else", async () => {
    const client = fakeClient();
    for (const value of Object.values(ORGANIZER_MENU)) {
      const args = menuArgs(client, value, "U0002");
      await invoke("action", ACTION_ORGANIZER_MENU, args);
      expect(args.ack).toHaveBeenCalledOnce();
      expect(args.respond).toHaveBeenCalledWith(
        expect.objectContaining({ response_type: "ephemeral", text: ORGANIZER_ONLY }),
      );
    }
    expect(setStatus).not.toHaveBeenCalled();
    expect(deletePoll).not.toHaveBeenCalled();
    expect(client.views.open).not.toHaveBeenCalled();
    expect(client.chat.delete).not.toHaveBeenCalled();
  });

  it("close sets the status and refreshes the message", async () => {
    const client = fakeClient();
    await invoke("action", ACTION_ORGANIZER_MENU, menuArgs(client, ORGANIZER_MENU.CLOSE));
    expect(setStatus).toHaveBeenCalledWith({}, POLL_ID, "closed");
    expect(refreshPollMessage).toHaveBeenCalledWith({}, client, POLL_ID);
  });

  it("delete removes the message then the row, even when the message is already gone", async () => {
    const client = fakeClient();
    await invoke(
      "action",
      ACTION_ORGANIZER_MENU,
      menuArgs(client, ORGANIZER_MENU.DELETE),
    );
    expect(client.chat.delete).toHaveBeenCalledWith({
      channel: snapshot.poll.channelId,
      ts: snapshot.poll.messageTs,
    });
    expect(deletePoll).toHaveBeenCalledWith({}, POLL_ID);

    vi.clearAllMocks();
    vi.mocked(getPoll).mockResolvedValue(snapshot.poll);
    client.chat.delete.mockRejectedValueOnce(
      Object.assign(new Error("x"), { data: { error: "message_not_found" } }),
    );
    await invoke(
      "action",
      ACTION_ORGANIZER_MENU,
      menuArgs(client, ORGANIZER_MENU.DELETE),
    );
    expect(deletePoll).toHaveBeenCalledWith({}, POLL_ID);
  });

  it("pick opens a modal listing the best times with counts", async () => {
    const client = fakeClient();
    await invoke("action", ACTION_ORGANIZER_MENU, menuArgs(client, ORGANIZER_MENU.PICK));
    expect(client.views.open).toHaveBeenCalledOnce();
    const { trigger_id, view } = client.views.open.mock.calls[0][0];
    expect(trigger_id).toBe("tr");
    expect(view.callback_id).toBe(CALLBACK_PICK_TIME_MODAL);
    expect(JSON.stringify(view)).toMatch(/— \d\/4/);
  });

  it("refuses close and pick on a scheduled poll, but still allows delete", async () => {
    const scheduled = fixture("scheduled");
    vi.mocked(getPoll).mockResolvedValue(scheduled.poll);
    const client = fakeClient();
    for (const value of [ORGANIZER_MENU.CLOSE, ORGANIZER_MENU.PICK]) {
      const args = menuArgs(client, value);
      await invoke("action", ACTION_ORGANIZER_MENU, args);
      expect(args.respond).toHaveBeenCalledWith(
        expect.objectContaining({ text: ALREADY_SCHEDULED }),
      );
    }
    expect(setStatus).not.toHaveBeenCalled();
    expect(client.views.open).not.toHaveBeenCalled();
    await invoke(
      "action",
      ACTION_ORGANIZER_MENU,
      menuArgs(client, ORGANIZER_MENU.DELETE),
    );
    expect(deletePoll).toHaveBeenCalledWith({}, POLL_ID);
  });

  it("surfaces a Slack failure ephemerally with its code", async () => {
    const client = fakeClient();
    vi.mocked(setStatus).mockRejectedValueOnce(
      Object.assign(new Error("x"), { data: { error: "fatal_error" } }),
    );
    const args = menuArgs(client, ORGANIZER_MENU.CLOSE);
    await invoke("action", ACTION_ORGANIZER_MENU, args);
    expect(args.respond).toHaveBeenCalledWith(
      expect.objectContaining({ text: expect.stringContaining("fatal_error") }),
    );
  });

  it("pick submit schedules, refreshes, and announces in the thread with a calendar link", async () => {
    const client = fakeClient();
    const slot = snapshot.slots[2];
    const args = pickArgs(client, String(epochSeconds(slot)));
    await invoke("view", CALLBACK_PICK_TIME_MODAL, args);
    expect(args.ack).toHaveBeenCalledWith();
    expect(setStatus).toHaveBeenCalledWith({}, POLL_ID, "scheduled", slot);
    expect(refreshPollMessage).toHaveBeenCalledWith({}, client, POLL_ID);
    expect(client.chat.postMessage).toHaveBeenCalledOnce();
    const reply = client.chat.postMessage.mock.calls[0][0];
    expect(reply.thread_ts).toBe(snapshot.poll.messageTs);
    expect(reply.channel).toBe(snapshot.poll.channelId);
    expect(reply.text).toContain("calendar.google.com");
    for (const p of snapshot.participants) expect(reply.text).toContain(`<@${p.userId}>`);
  });

  it("pick submit rejects a non-organizer and a foreign slot before acking", async () => {
    const client = fakeClient();
    const other = pickArgs(client, String(epochSeconds(snapshot.slots[0])), "U0002");
    await invoke("view", CALLBACK_PICK_TIME_MODAL, other);
    expect(other.ack).toHaveBeenCalledWith({
      response_action: "errors",
      errors: { [PICK.block]: ORGANIZER_ONLY },
    });

    const foreign = pickArgs(client, "1234567890");
    await invoke("view", CALLBACK_PICK_TIME_MODAL, foreign);
    expect(foreign.ack).toHaveBeenCalledWith(
      expect.objectContaining({ response_action: "errors" }),
    );
    expect(setStatus).not.toHaveBeenCalled();
    expect(client.chat.postMessage).not.toHaveBeenCalled();
  });

  it("pick submit refuses an already scheduled poll", async () => {
    vi.mocked(getPollSnapshot).mockResolvedValue(fixture("scheduled"));
    const client = fakeClient();
    const args = pickArgs(client, String(epochSeconds(snapshot.slots[0])));
    await invoke("view", CALLBACK_PICK_TIME_MODAL, args);
    expect(args.ack).toHaveBeenCalledWith({
      response_action: "errors",
      errors: { [PICK.block]: ALREADY_SCHEDULED },
    });
    expect(setStatus).not.toHaveBeenCalled();
  });

  it("acks the calendar link button", async () => {
    const ack = vi.fn();
    await invoke("action", ACTION_GCAL_LINK, { ack });
    expect(ack).toHaveBeenCalledOnce();
  });
});
