import type { App } from "@slack/bolt";
import { vi } from "vitest";

type Handler = (args: Record<string, unknown>) => Promise<void>;

/** Captures listeners registered on a Bolt App so tests can invoke them directly. */
export function fakeApp() {
  const handlers = new Map<string, Handler>();
  const capture = (kind: string) => (id: string, fn: Handler) =>
    handlers.set(`${kind}:${id}`, fn);
  const app = {
    command: capture("command"),
    shortcut: capture("shortcut"),
    action: capture("action"),
    view: capture("view"),
    event: capture("event"),
  } as unknown as App;
  const invoke = (kind: string, id: string, args: Record<string, unknown>) => {
    const h = handlers.get(`${kind}:${id}`);
    if (!h)
      throw new Error(
        `no listener for ${kind}:${id}; have ${[...handlers.keys()].join(", ")}`,
      );
    return h(args);
  };
  return { app, invoke, handlers };
}

/** A Slack WebClient stub with the methods this app uses. */
export function fakeClient() {
  return {
    views: {
      open: vi.fn().mockResolvedValue({ ok: true, view: { id: "V1", hash: "h1" } }),
      update: vi.fn().mockResolvedValue({ ok: true }),
      publish: vi.fn().mockResolvedValue({ ok: true }),
    },
    chat: {
      postMessage: vi
        .fn()
        .mockResolvedValue({ ok: true, ts: "1700000000.000100", channel: "C1" }),
      update: vi.fn().mockResolvedValue({ ok: true }),
      delete: vi.fn().mockResolvedValue({ ok: true }),
      postEphemeral: vi.fn().mockResolvedValue({ ok: true }),
      getPermalink: vi
        .fn()
        .mockResolvedValue({ ok: true, permalink: "https://slack.com/archives/C1/p1" }),
    },
    users: {
      info: vi.fn().mockResolvedValue({
        ok: true,
        user: {
          id: "U1",
          tz: "America/Los_Angeles",
          real_name: "Test User",
          profile: { display_name: "test" },
        },
      }),
    },
  };
}
