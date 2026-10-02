import "server-only";

import { z } from "zod";

import { getDb } from "@/db/client";
import { getPollSnapshot, saveResponse, type Db } from "@/db/queries";
import { POLL_LIMITS } from "@/domain/constants";
import type { PollSnapshot } from "@/domain/types";
import { log } from "@/lib/log";
import { refreshPollMessage, type ChatUpdater } from "@/lib/refresh";
import { slackErrorCode } from "@/lib/respond";
import {
  DeactivatedUserError,
  getUserProfile,
  type UserProfile,
  type UsersClient,
} from "@/lib/users";

import { verifyGridLink, type GridClaims } from "./link";
import { renderGridPage, renderMessagePage } from "./page";
import { gridState } from "./state";

/**
 * How long the page trusts a cached profile before asking Slack again whether the person is
 * still active. Every request asking would spend users.info's rate limit on the 5 s poll.
 */
export const GRID_PROFILE_MAX_AGE_MS = 5 * 60 * 1000;

/** The Slack calls the grid makes as the workspace's bot: the viewer's profile, the message. */
export type GridClient = UsersClient & ChatUpdater;

export interface GridHandlerOptions {
  /** The same secret the links were signed with. */
  secret: Buffer;
  /** A client holding the bot token of the workspace the link belongs to. */
  clientFor(teamId: string): Promise<GridClient>;
  /** Defaults to the core's lazy client. */
  db?: Db;
  now?: () => Date;
}

export interface GridHandlers {
  /** The page, or its state as JSON for `?format=json`. */
  GET(request: Request): Promise<Response>;
  /** Replaces the viewer's availability with the posted slots and re-renders the message. */
  POST(request: Request): Promise<Response>;
}

const SaveBody = z.object({
  slots: z
    .array(z.number().int().nonnegative())
    .max(POLL_LIMITS.MAX_DAYS * POLL_LIMITS.MAX_SLOTS_PER_DAY),
});

const COMMON_HEADERS = {
  "cache-control": "no-store",
  "referrer-policy": "no-referrer",
  "x-robots-tag": "noindex",
};
const HTML_HEADERS = {
  ...COMMON_HEADERS,
  "content-type": "text/html; charset=utf-8",
  "content-security-policy":
    "default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
};

const json = (body: unknown, status = 200): Response =>
  Response.json(body, { status, headers: COMMON_HEADERS });
const html = (body: string, status = 200): Response =>
  new Response(body, { status, headers: HTML_HEADERS });

const wantsJson = (request: Request): boolean =>
  request.method !== "GET" || new URL(request.url).searchParams.get("format") === "json";

const REFUSALS = {
  bad_link: {
    status: 404,
    heading: "This link has expired",
    message: "Click Add my availability on the poll in Slack for a fresh one.",
  },
  no_poll: {
    status: 404,
    heading: "This poll no longer exists",
    message: "Its organizer deleted it.",
  },
  deactivated: {
    status: 403,
    heading: "This link no longer works",
    message: "Your Slack account in this workspace is deactivated.",
  },
  slack_unavailable: {
    status: 503,
    heading: "Slack could not confirm this link",
    message:
      "Try again in a minute, or click Add my availability on the poll in Slack for a fresh link.",
  },
} as const;

const refuse = (request: Request, error: keyof typeof REFUSALS): Response => {
  const { status, heading, message } = REFUSALS[error];
  return wantsJson(request)
    ? json({ error }, status)
    : html(renderMessagePage(heading, message), status);
};

interface Loaded {
  claims: GridClaims;
  snapshot: PollSnapshot;
  client: GridClient;
  profile: UserProfile;
}

/**
 * The route a host mounts at `/grid/[token]`. The token in the path says who the viewer is
 * and which poll; there is no cookie and no session, so nothing here can be forged from
 * another site. Handlers read the token from the URL, so they need no framework context.
 */
export function createGridHandlers(options: GridHandlerOptions): GridHandlers {
  const now = options.now ?? (() => new Date());
  const database = (): Db => options.db ?? getDb();

  async function load(request: Request): Promise<Loaded | Response> {
    const token = decodeURIComponent(
      new URL(request.url).pathname.split("/").pop() ?? "",
    );
    const claims = verifyGridLink(options.secret, token, now());
    if (!claims) return refuse(request, "bad_link");
    const snapshot = await getPollSnapshot(database(), claims.pollId).catch(() => null);
    if (!snapshot || snapshot.poll.teamId !== claims.teamId)
      return refuse(request, "no_poll");
    // Fails closed: with no answer from Slack, nobody is shown the poll.
    try {
      const client = await options.clientFor(claims.teamId);
      const profile = await getUserProfile(
        database(),
        client,
        claims.teamId,
        claims.userId,
        now(),
        GRID_PROFILE_MAX_AGE_MS,
      );
      return { claims, snapshot, client, profile };
    } catch (error) {
      const deactivated = error instanceof DeactivatedUserError;
      log.warn({
        action: "grid_link_refused",
        poll_id: claims.pollId,
        user_id: claims.userId,
        reason: deactivated
          ? "deactivated"
          : `slack_unavailable:${slackErrorCode(error)}`,
      });
      return refuse(request, deactivated ? "deactivated" : "slack_unavailable");
    }
  }

  const stateOf = ({ claims, snapshot, profile }: Loaded) =>
    gridState(snapshot, { userId: claims.userId, ...profile });

  return {
    async GET(request) {
      const loaded = await load(request);
      if (loaded instanceof Response) return loaded;
      const state = stateOf(loaded);
      return wantsJson(request) ? json(state) : html(renderGridPage(state));
    },

    async POST(request) {
      const loaded = await load(request);
      if (loaded instanceof Response) return loaded;
      const { claims, snapshot, client, profile } = loaded;
      const body = SaveBody.safeParse(await request.json().catch(() => null));
      if (!body.success) return json({ error: "bad_request" }, 400);
      if (snapshot.poll.status !== "open")
        return json({ error: "closed", state: stateOf(loaded) }, 409);

      const wanted = new Set(body.data.slots);
      const slots = snapshot.slots.filter((s) =>
        wanted.has(Math.floor(s.getTime() / 1000)),
      );
      await saveResponse(database(), {
        pollId: claims.pollId,
        userId: claims.userId,
        tz: profile.tz,
        displayName: profile.displayName,
        slots,
      });
      // The save stands even when Slack cannot be reached: the next render picks it up.
      const refresh = await refreshPollMessage(database(), client, claims.pollId).catch(
        (error: unknown) => `failed:${slackErrorCode(error)}`,
      );
      log.info({
        action: "grid_response_saved",
        poll_id: claims.pollId,
        user_id: claims.userId,
        slots: slots.length,
        refresh,
      });
      const fresh = await getPollSnapshot(database(), claims.pollId);
      if (!fresh) return refuse(request, "no_poll");
      return json(stateOf({ ...loaded, snapshot: fresh }));
    },
  };
}
