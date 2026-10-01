import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  getPollSnapshot,
  getUserAvailability,
  removeResponse,
  saveResponse,
  toggleSlot,
} from "@/db/queries";
import { refreshPollMessage } from "@/lib/refresh";
import { fixture } from "@/slack/fixtures";
import { epochSeconds } from "@/slack/format";
import { ACTION_GRID_LINK, ACTION_RESPOND_BUTTON, ACTION_TOGGLE_NONE } from "@/slack/ids";

import { fakeApp, fakeClient } from "../../../tests/helpers/fakeApp";
import { register } from "./listener";
import { SLOT_ACTION, slotActionId } from "./schema";

vi.mock("@/db/client", () => ({ db: {} }));
vi.mock("@/db/queries", () => ({
  getPollSnapshot: vi.fn(),
  getUserAvailability: vi.fn().mockResolvedValue([]),
  removeResponse: vi.fn().mockResolvedValue(undefined),
  saveResponse: vi.fn().mockResolvedValue(undefined),
  toggleSlot: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/lib/users", () => ({
  getUserProfile: vi.fn().mockResolvedValue({ tz: "Asia/Tokyo", displayName: "taro" }),
}));
vi.mock("@/lib/refresh", () => ({
  refreshPollMessage: vi.fn().mockResolvedValue("updated"),
}));

const snapshot = fixture("three-day");
const POLL_ID = snapshot.poll.id;
const SLOT = snapshot.slots[1];
const profile = { tz: "Asia/Tokyo", displayName: "taro" };

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

/** A click on a button inside the open form. */
const clickArgs = (
  client: ReturnType<typeof fakeClient>,
  action: { action_id: string; value?: string },
  userId = "U0002",
) => ({
  ack: vi.fn(),
  client,
  action: { type: "button", ...action },
  body: {
    user: { id: userId },
    team: { id: "T1" },
    view: { id: "V7", private_metadata: JSON.stringify({ pollId: POLL_ID }) },
  },
});
const slotClick = (client: ReturnType<typeof fakeClient>, slot: Date) =>
  clickArgs(client, {
    action_id: slotActionId(epochSeconds(slot)),
    value: String(epochSeconds(slot)),
  });
const SLOT_KEY = String(SLOT_ACTION);
const buttonsOf = (view: { blocks: { type: string; elements?: unknown[] }[] }) =>
  view.blocks.flatMap((b) => (b.type === "actions" ? (b.elements ?? []) : [])) as {
    action_id: string;
    text: { text: string };
    style?: string;
    value: string;
  }[];

describe("poll-respond listener", () => {
  const { app, invoke } = fakeApp();
  register(app);

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getPollSnapshot).mockResolvedValue(snapshot);
    vi.mocked(getUserAvailability).mockResolvedValue([]);
  });

  it("opens the loading view before touching the database, then swaps in the form", async () => {
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
    const call = client.views.update.mock.calls[0][0];
    expect(call.view_id).toBe("V1");
    expect(JSON.stringify(call.view.blocks[0])).toContain("Asia/Tokyo");
    const chosen = buttonsOf(call.view).filter((b) => b.style === "primary");
    expect(chosen.map((b) => b.value)).toEqual([String(epochSeconds(snapshot.slots[2]))]);
    expect(call.view.submit).toBeUndefined();
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

  it("a click on a time flips that slot, redraws the form, then refreshes the message", async () => {
    const order: string[] = [];
    const client = fakeClient();
    vi.mocked(toggleSlot).mockImplementation(async () => {
      order.push("toggleSlot");
    });
    vi.mocked(getUserAvailability).mockImplementation(async () => {
      order.push("getUserAvailability");
      return [SLOT];
    });
    client.views.update.mockImplementation(async () => {
      order.push("views.update");
      return { ok: true };
    });
    vi.mocked(refreshPollMessage).mockImplementation(async () => {
      order.push("refreshPollMessage");
      return "updated";
    });
    const args = slotClick(client, SLOT);

    await invoke("action", SLOT_KEY, args);

    expect(args.ack).toHaveBeenCalledWith();
    expect(toggleSlot).toHaveBeenCalledWith(
      {},
      { pollId: POLL_ID, userId: "U0002", ...profile, slot: SLOT },
    );
    expect(order).toEqual([
      "toggleSlot",
      "getUserAvailability",
      "views.update",
      "refreshPollMessage",
    ]);
    const call = client.views.update.mock.calls[0][0];
    expect(call.view_id).toBe("V7");
    const chip = buttonsOf(call.view).find((b) => b.value === String(epochSeconds(SLOT)));
    expect(chip?.style).toBe("primary");
    expect(chip?.text.text.startsWith("✓ ")).toBe(true);
    expect(refreshPollMessage).toHaveBeenCalledWith({}, client, POLL_ID);
  });

  it("ignores a time that is not in the poll", async () => {
    const client = fakeClient();
    await invoke(
      "action",
      SLOT_KEY,
      clickArgs(client, { action_id: slotActionId(1234567890), value: "1234567890" }),
    );
    expect(toggleSlot).not.toHaveBeenCalled();
    expect(client.views.update).not.toHaveBeenCalled();
    expect(refreshPollMessage).not.toHaveBeenCalled();
  });

  it("'I can't make any of these' records an answer with no times", async () => {
    const client = fakeClient();
    await invoke(
      "action",
      ACTION_TOGGLE_NONE,
      clickArgs(client, { action_id: ACTION_TOGGLE_NONE, value: POLL_ID }),
    );
    expect(saveResponse).toHaveBeenCalledWith(
      {},
      { pollId: POLL_ID, userId: "U0002", ...profile, slots: [] },
    );
    const view = client.views.update.mock.calls[0][0].view;
    const none = buttonsOf(view).find((b) => b.action_id === ACTION_TOGGLE_NONE);
    expect(none?.style).toBe("danger");
    expect(JSON.stringify(view)).toContain("none of these times work");
    expect(refreshPollMessage).toHaveBeenCalledWith({}, client, POLL_ID);
  });

  it("clicking it again withdraws the answer", async () => {
    // U0004 is the fixture's participant who answered that none of the times work.
    const client = fakeClient();
    await invoke(
      "action",
      ACTION_TOGGLE_NONE,
      clickArgs(client, { action_id: ACTION_TOGGLE_NONE, value: POLL_ID }, "U0004"),
    );
    expect(removeResponse).toHaveBeenCalledWith({}, POLL_ID, "U0004");
    expect(saveResponse).not.toHaveBeenCalled();
    const view = client.views.update.mock.calls[0][0].view;
    expect(JSON.stringify(view)).toContain("You have not answered yet");
  });

  it("refuses a click on a poll that closed meanwhile", async () => {
    vi.mocked(getPollSnapshot).mockResolvedValue(fixture("scheduled"));
    const client = fakeClient();
    await invoke("action", SLOT_KEY, slotClick(client, SLOT));
    expect(toggleSlot).not.toHaveBeenCalled();
    expect(JSON.stringify(client.views.update.mock.calls[0][0].view)).toContain(
      "scheduled",
    );
  });

  it("shows the error view when a save fails, and leaves the message alone", async () => {
    vi.mocked(toggleSlot).mockRejectedValueOnce(new Error("Failed query"));
    const client = fakeClient();
    await invoke("action", SLOT_KEY, slotClick(client, SLOT));
    expect(JSON.stringify(client.views.update.mock.calls[0][0].view)).toContain(
      "went wrong",
    );
    expect(refreshPollMessage).not.toHaveBeenCalled();
  });

  it("does nothing for a click that carries no form", async () => {
    const client = fakeClient();
    const args = slotClick(client, SLOT);
    await invoke("action", SLOT_KEY, { ...args, body: { user: { id: "U0002" } } });
    expect(args.ack).toHaveBeenCalledWith();
    expect(getPollSnapshot).not.toHaveBeenCalled();
  });
});

describe("poll-respond listener with the web grid", () => {
  const { app, invoke } = fakeApp();
  register(app, {
    grid: { urlFor: (c) => `https://host.test/grid/${c.pollId}.${c.teamId}.${c.userId}` },
  });
  const linkOf = (view: {
    blocks: { accessory?: { action_id?: string; url?: string } }[];
  }) =>
    view.blocks.find((b) => b.accessory?.action_id === ACTION_GRID_LINK)?.accessory?.url;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getPollSnapshot).mockResolvedValue(snapshot);
    vi.mocked(getUserAvailability).mockResolvedValue([]);
  });

  it("opens the form with the viewer's own grid link above it", async () => {
    const client = fakeClient();
    await invoke("action", ACTION_RESPOND_BUTTON, buttonArgs(client));
    expect(linkOf(client.views.update.mock.calls[0][0].view)).toBe(
      `https://host.test/grid/${POLL_ID}.T1.U0002`,
    );
  });

  it("keeps the grid link when a click redraws the form", async () => {
    const client = fakeClient();
    await invoke("action", SLOT_KEY, slotClick(client, SLOT));
    expect(linkOf(client.views.update.mock.calls[0][0].view)).toBe(
      `https://host.test/grid/${POLL_ID}.T1.U0002`,
    );
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
