import { VercelReceiver } from "@vercel/slack-bolt";
import { describe, expect, it, vi } from "vitest";

import type { Feature } from "@/features/types";

import { createMeetMouse } from "./create";

vi.mock("server-only", () => ({}));

const spy = (name: string, seen: unknown[][]): Feature => ({
  name,
  register: (app) => {
    seen.push([name, app]);
  },
});

describe("createMeetMouse", () => {
  it("registers every feature once, in order, on the app it returns", () => {
    const seen: unknown[][] = [];
    const bolt = createMeetMouse({
      features: [spy("a", seen), spy("b", seen)],
      signingSecret: "secret",
      auth: { token: "xoxb-test" },
    });
    expect(seen).toEqual([
      ["a", bolt.app],
      ["b", bolt.app],
    ]);
    expect(bolt.receiver).toBeInstanceOf(VercelReceiver);
  });

  it("gives the Web API client the single token when one is supplied", () => {
    const bolt = createMeetMouse({
      features: [],
      signingSecret: "secret",
      auth: { token: "xoxb-test" },
    });
    expect(bolt.app.client.token).toBe("xoxb-test");
  });

  it("leaves the client without a fixed token when an authorize function is supplied", () => {
    const authorize = vi
      .fn()
      .mockResolvedValue({ botToken: "xoxb-from-store", botId: "B1", botUserId: "U1" });
    const bolt = createMeetMouse({
      features: [],
      signingSecret: "secret",
      auth: { authorize },
    });
    expect(bolt.app.client.token).toBeUndefined();
  });

  it("rejects two features with the same name", () => {
    expect(() =>
      createMeetMouse({
        features: [spy("poll-create", []), spy("poll-create", [])],
        signingSecret: "secret",
        auth: { token: "xoxb-test" },
      }),
    ).toThrow('duplicate feature name "poll-create"');
  });
});
