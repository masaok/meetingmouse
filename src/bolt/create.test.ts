import { LogLevel } from "@slack/bolt";
import type { Installation, InstallationStore } from "@slack/bolt";
import { VercelReceiver } from "@vercel/slack-bolt";
import { describe, expect, it, vi } from "vitest";

import type { Feature, FeatureContext } from "@/features/types";
import { deriveGridSecret } from "@/web/link";

import { CORE_BOT_SCOPES, createMeetingMouse, type OAuthOptions } from "./create";

vi.mock("server-only", () => ({}));

const spy = (name: string, seen: unknown[][]): Feature => ({
  name,
  register: (app) => {
    seen.push([name, app]);
  },
});

describe("createMeetingMouse", () => {
  it("hands every feature a grid link builder when the host serves the web grid", () => {
    const contexts: FeatureContext[] = [];
    const feature: Feature = {
      name: "a",
      register: (_app, context) => contexts.push(context),
    };
    createMeetingMouse({
      features: [feature],
      signingSecret: "secret",
      auth: { token: "xoxb-test" },
      grid: { baseUrl: "https://app.example.com", secret: deriveGridSecret("secret") },
    });
    createMeetingMouse({
      features: [feature],
      signingSecret: "secret",
      auth: { token: "xoxb-test" },
    });

    const url = contexts[0].grid?.urlFor({ pollId: "p", teamId: "T", userId: "U" });
    expect(url?.startsWith("https://app.example.com/grid/v1.")).toBe(true);
    expect(contexts[1].grid).toBeUndefined();
  });

  it("hands every feature the support URL when the host sets one", () => {
    const contexts: FeatureContext[] = [];
    const feature: Feature = {
      name: "a",
      register: (_app, context) => contexts.push(context),
    };
    const base = {
      features: [feature],
      signingSecret: "secret",
      auth: { token: "xoxb-test" },
    };
    createMeetingMouse({ ...base, supportUrl: "https://example.com/help?a=1|2" });
    createMeetingMouse(base);

    expect(contexts[0].supportUrl).toBe("https://example.com/help?a=1%7C2");
    expect(contexts[1].supportUrl).toBeUndefined();
  });

  it.each(["", "example.com/help", "mailto:help@example.com", "javascript:alert(1)"])(
    "rejects the support URL %j, which is not http(s)",
    (supportUrl) => {
      expect(() =>
        createMeetingMouse({
          features: [],
          signingSecret: "secret",
          auth: { token: "xoxb-test" },
          supportUrl,
        }),
      ).toThrow(`supportUrl must be an http(s) URL, got "${supportUrl}"`);
    },
  );

  it("registers every feature once, in order, on the app it returns", () => {
    const seen: unknown[][] = [];
    const bolt = createMeetingMouse({
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
    const bolt = createMeetingMouse({
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
    const bolt = createMeetingMouse({
      features: [],
      signingSecret: "secret",
      auth: { authorize },
    });
    expect(bolt.app.client.token).toBeUndefined();
  });

  it("hands each incoming request's workspace to the supplied authorize function", async () => {
    const authorize = vi
      .fn()
      .mockResolvedValue({ botToken: "xoxb-T123", botId: "B1", botUserId: "U1" });
    const bolt = createMeetingMouse({
      features: [],
      signingSecret: "secret",
      auth: { authorize },
      logLevel: LogLevel.ERROR,
    });
    await bolt.app.init();
    await bolt.app.processEvent({
      body: {
        command: "/when",
        team_id: "T123",
        user_id: "U42",
        channel_id: "C7",
        trigger_id: "trigger",
        text: "",
      },
      ack: async () => {},
    });
    expect(authorize).toHaveBeenCalledTimes(1);
    expect(authorize.mock.calls[0][0]).toMatchObject({
      teamId: "T123",
      userId: "U42",
      isEnterpriseInstall: false,
    });
  });

  describe("with Slack OAuth", () => {
    const installation = {
      team: { id: "T1", name: "Acme" },
      enterprise: undefined,
      user: { id: "U9", token: undefined, scopes: undefined },
      bot: {
        id: "B1",
        userId: "UB1",
        token: "xoxb-from-store",
        scopes: [...CORE_BOT_SCOPES],
      },
      isEnterpriseInstall: false,
      authVersion: "v2",
    } satisfies Installation<"v2", false>;
    const store = (): InstallationStore & { fetched: unknown[] } => {
      const fetched: unknown[] = [];
      return {
        fetched,
        storeInstallation: async () => {},
        fetchInstallation: async (query) => {
          fetched.push(query);
          return installation;
        },
      };
    };
    const oauth = (installationStore: InstallationStore): OAuthOptions => ({
      clientId: "123.456",
      clientSecret: "shh",
      stateSecret: "state-secret",
      scopes: CORE_BOT_SCOPES,
      redirectUri: "https://host.example/api/slack/oauth_redirect",
      installationStore,
    });

    it("answers the install path with a redirect to Slack carrying the client id, scopes and a state", async () => {
      const bolt = createMeetingMouse({
        features: [],
        signingSecret: "secret",
        auth: { oauth: oauth(store()) },
        logLevel: LogLevel.ERROR,
      });
      const res = await bolt.receiver.handleInstall(
        new Request("https://host.example/api/slack/install"),
      );
      expect(res.status).toBe(302);
      const to = new URL(res.headers.get("location") ?? "");
      expect(`${to.origin}${to.pathname}`).toBe("https://slack.com/oauth/v2/authorize");
      expect(to.searchParams.get("client_id")).toBe("123.456");
      expect(to.searchParams.get("scope")).toBe(CORE_BOT_SCOPES.join(","));
      expect(to.searchParams.get("redirect_uri")).toBe(
        "https://host.example/api/slack/oauth_redirect",
      );
      expect(to.searchParams.get("state")?.length ?? 0).toBeGreaterThan(20);
    });

    it("resolves each request's token from the installation store, by workspace", async () => {
      const s = store();
      const bolt = createMeetingMouse({
        features: [],
        signingSecret: "secret",
        auth: { oauth: oauth(s) },
        logLevel: LogLevel.ERROR,
      });
      expect(bolt.app.client.token).toBeUndefined();
      await bolt.app.init();
      await bolt.app.processEvent({
        body: {
          command: "/when",
          team_id: "T1",
          user_id: "U9",
          channel_id: "C1",
          trigger_id: "t",
          text: "",
        },
        ack: async () => {},
      });
      expect(s.fetched).toEqual([
        expect.objectContaining({ teamId: "T1", isEnterpriseInstall: false }),
      ]);
    });
  });

  it("rejects two features with the same name", () => {
    expect(() =>
      createMeetingMouse({
        features: [spy("poll-create", []), spy("poll-create", [])],
        signingSecret: "secret",
        auth: { token: "xoxb-test" },
      }),
    ).toThrow('duplicate feature name "poll-create"');
  });
});
