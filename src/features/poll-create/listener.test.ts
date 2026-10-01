import { beforeEach, describe, expect, it, vi } from "vitest";

import { createPoll, deletePoll, setMessageTs } from "@/db/queries";
import type * as RespondModule from "@/lib/respond";
import { respondViaUrl } from "@/lib/respond";
import { FIXTURE_NOW } from "@/slack/fixtures";
import {
  CALLBACK_CREATE_POLL_MODAL,
  COMMAND_WHEN,
  SHORTCUT_CREATE_POLL,
} from "@/slack/ids";

import { fakeApp, fakeClient } from "../../../tests/helpers/fakeApp";
import { DM_HINT, INVITE_HINT, register } from "./listener";
import { INPUT } from "./schema";

vi.mock("@/db/client", () => ({ db: {} }));
vi.mock("@/db/queries", () => ({
  createPoll: vi.fn(),
  deletePoll: vi.fn().mockResolvedValue(undefined),
  setMessageTs: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/lib/users", () => ({
  getUserProfile: vi
    .fn()
    .mockResolvedValue({ tz: "America/Los_Angeles", displayName: "org" }),
}));
vi.mock("@/lib/respond", async (importOriginal) => ({
  ...(await importOriginal<typeof RespondModule>()),
  respondViaUrl: vi.fn().mockResolvedValue(undefined),
}));

const validState = {
  [INPUT.TITLE.block]: { [INPUT.TITLE.action]: { value: "Sprint planning" } },
  [INPUT.DATES.block]: {
    [INPUT.DATES.action]: { selected_options: [{ value: "2026-10-07" }] },
  },
  [INPUT.FROM.block]: { [INPUT.FROM.action]: { selected_option: { value: "540" } } },
  [INPUT.TO.block]: { [INPUT.TO.action]: { selected_option: { value: "600" } } },
  [INPUT.SLOT.block]: { [INPUT.SLOT.action]: { selected_option: { value: "30" } } },
  [INPUT.CHANNEL.block]: { [INPUT.CHANNEL.action]: { selected_conversation: "C123" } },
};

const submission = (client: ReturnType<typeof fakeClient>, ack = vi.fn()) => ({
  ack,
  client,
  view: {
    state: { values: validState },
    team_id: "T1",
    private_metadata: '{"channelId":"C123"}',
  },
  body: {
    user: { id: "U1" },
    team: { id: "T1" },
    response_urls: [{ channel_id: "C123", response_url: "https://hooks.slack.com/x" }],
  },
});

describe("poll-create listener", () => {
  const { app, invoke } = fakeApp();
  register(app);

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(createPoll).mockResolvedValue({
      id: "P1",
      teamId: "T1",
      channelId: "C123",
      messageTs: null,
      creatorId: "U1",
      title: "Sprint planning",
      creatorTz: "America/Los_Angeles",
      slotMinutes: 30,
      status: "open",
      finalSlotStart: null,
      createdAt: FIXTURE_NOW,
      updatedAt: FIXTURE_NOW,
    });
  });

  it("/when acks then opens the create modal with the title and channel", async () => {
    const client = fakeClient();
    const ack = vi.fn();
    await invoke("command", COMMAND_WHEN, {
      ack,
      client,
      command: {
        team_id: "T1",
        user_id: "U1",
        channel_id: "C123",
        channel_name: "general",
        text: " Sprint planning ",
        trigger_id: "tr",
      },
    });
    expect(ack).toHaveBeenCalledOnce();
    expect(client.views.open).toHaveBeenCalledOnce();
    const view = client.views.open.mock.calls[0][0].view;
    expect(view.callback_id).toBe(CALLBACK_CREATE_POLL_MODAL);
    expect(JSON.stringify(view)).toContain('"initial_value":"Sprint planning"');
    expect(JSON.stringify(view)).toContain('"initial_conversation":"C123"');
  });

  it.each([
    ["a 1:1 DM", { channel_id: "D123", channel_name: "directmessage" }],
    ["a group DM", { channel_id: "C999", channel_name: "mpdm-ann--bob--cy-1" }],
  ])("/when in %s answers with the hint and opens nothing", async (_name, channel) => {
    const client = fakeClient();
    const ack = vi.fn();
    await invoke("command", COMMAND_WHEN, {
      ack,
      client,
      command: {
        team_id: "T1",
        user_id: "U1",
        ...channel,
        text: "Sprint planning",
        trigger_id: "tr",
      },
    });
    expect(ack).toHaveBeenCalledOnce();
    expect(ack).toHaveBeenCalledWith(DM_HINT);
    expect(client.views.open).not.toHaveBeenCalled();
  });

  it("the shortcut opens the modal without a channel", async () => {
    const client = fakeClient();
    await invoke("shortcut", SHORTCUT_CREATE_POLL, {
      ack: vi.fn(),
      client,
      shortcut: { team: { id: "T1" }, user: { id: "U1" }, trigger_id: "tr" },
    });
    expect(JSON.stringify(client.views.open.mock.calls[0][0].view)).not.toContain(
      "initial_conversation",
    );
  });

  it("returns field errors without touching the database", async () => {
    const client = fakeClient();
    const ack = vi.fn();
    const args = submission(client, ack);
    args.view.state.values = {
      ...validState,
      [INPUT.TITLE.block]: { [INPUT.TITLE.action]: { value: "" } },
    };
    await invoke("view", CALLBACK_CREATE_POLL_MODAL, args);
    expect(ack).toHaveBeenCalledWith({
      response_action: "errors",
      errors: { [INPUT.TITLE.block]: "Give the poll a title." },
    });
    expect(createPoll).not.toHaveBeenCalled();
  });

  it("creates the poll, posts the message, and stores the ts", async () => {
    const client = fakeClient();
    await invoke("view", CALLBACK_CREATE_POLL_MODAL, submission(client));
    expect(createPoll).toHaveBeenCalledOnce();
    const input = vi.mocked(createPoll).mock.calls[0][1];
    expect(input.slots.length).toBe(2); // 9:00–10:00 in 30-min slots
    expect(input.creatorTz).toBe("America/Los_Angeles");
    expect(client.chat.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ channel: "C123", blocks: expect.any(Array) }),
    );
    expect(setMessageTs).toHaveBeenCalledWith({}, "P1", "1700000000.000100");
  });

  it("on not_in_channel deletes the poll and sends the invite hint via response_url", async () => {
    const client = fakeClient();
    client.chat.postMessage.mockRejectedValueOnce(
      Object.assign(new Error("An API error occurred: not_in_channel"), {
        data: { error: "not_in_channel" },
      }),
    );
    await invoke("view", CALLBACK_CREATE_POLL_MODAL, submission(client));
    expect(deletePoll).toHaveBeenCalledWith({}, "P1");
    expect(setMessageTs).not.toHaveBeenCalled();
    expect(respondViaUrl).toHaveBeenCalledWith("https://hooks.slack.com/x", INVITE_HINT);
  });

  it("on channel_not_found (a DM, or a private channel without the bot) does the same", async () => {
    const client = fakeClient();
    client.chat.postMessage.mockRejectedValueOnce(
      Object.assign(new Error("An API error occurred: channel_not_found"), {
        data: { error: "channel_not_found" },
      }),
    );
    const args = submission(client);
    args.view.state.values = {
      ...validState,
      [INPUT.CHANNEL.block]: {
        [INPUT.CHANNEL.action]: { selected_conversation: "D123" },
      },
    };
    args.body.response_urls = [
      { channel_id: "D123", response_url: "https://hooks.slack.com/dm" },
    ];
    await invoke("view", CALLBACK_CREATE_POLL_MODAL, args);
    expect(client.chat.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ channel: "D123" }),
    );
    expect(deletePoll).toHaveBeenCalledWith({}, "P1");
    expect(setMessageTs).not.toHaveBeenCalled();
    expect(respondViaUrl).toHaveBeenCalledWith("https://hooks.slack.com/dm", INVITE_HINT);
  });

  it("surfaces other Slack errors with their code", async () => {
    const client = fakeClient();
    client.chat.postMessage.mockRejectedValueOnce(
      Object.assign(new Error("x"), { data: { error: "ratelimited" } }),
    );
    await invoke("view", CALLBACK_CREATE_POLL_MODAL, submission(client));
    expect(vi.mocked(respondViaUrl).mock.calls[0][1]).toContain("`ratelimited`");
  });
});
