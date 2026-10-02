import "server-only";

import type { WebClientOptions } from "@slack/web-api";
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

/**
 * How long a grid request waits for the host's client and Slack before it answers 503. A
 * default WebClient has no timeout and sleeps through a rate limit, so without this a slow
 * Slack would hang the request. Kept under the page's 5 s poll.
 */
export const GRID_SLACK_DEADLINE_MS = 3000;

/** After a refusal by Slack or a failure to ask, the same person's link is not checked again for this long. */
export const GRID_RECHECK_AFTER_REFUSAL_MS = 30 * 1000;

/**
 * Options for the WebClient a host hands to `clientFor`: one attempt, a rate limit rejected
 * instead of slept through, and a timeout, so a failing call ends and does not pile up
 * behind the deadline.
 */
export const GRID_CLIENT_OPTIONS = {
  retryConfig: { retries: 0 },
  rejectRateLimitedCalls: true,
  timeout: GRID_SLACK_DEADLINE_MS,
} as const satisfies WebClientOptions;

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
  /** Defaults to `GRID_SLACK_DEADLINE_MS`. */
  slackDeadlineMs?: number;
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

const refuse = (request: Request, error: Refusal): Response => {
  const { status, heading, message } = REFUSALS[error];
  return wantsJson(request)
    ? json({ error }, status)
    : html(renderMessagePage(heading, message), status);
};

type Refusal = keyof typeof REFUSALS;

function withDeadline<T>(work: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`no answer in ${ms} ms`)), ms);
  });
  return Promise.race([work, deadline]).finally(() => clearTimeout(timer));
}

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
  const deadlineMs = options.slackDeadlineMs ?? GRID_SLACK_DEADLINE_MS;
  // Per instance and lost on restart: it only keeps one process from asking Slack on every
  // 5 s poll and 3 s save retry while Slack is failing.
  const refused = new Map<string, { until: number; refusal: Refusal }>();

  async function load(request: Request): Promise<Loaded | Response> {
    const token = decodeURIComponent(
      new URL(request.url).pathname.split("/").pop() ?? "",
    );
    const claims = verifyGridLink(options.secret, token, now());
    if (!claims) return refuse(request, "bad_link");
    const snapshot = await getPollSnapshot(database(), claims.pollId).catch(() => null);
    if (!snapshot || snapshot.poll.teamId !== claims.teamId)
      return refuse(request, "no_poll");
    const at = now();
    const person = `${claims.teamId}:${claims.userId}`;
    const earlier = refused.get(person);
    if (earlier && at.getTime() < earlier.until) return refuse(request, earlier.refusal);
    refused.delete(person);
    // Fails closed: with no answer from Slack, nobody is shown the poll.
    try {
      const check = async () => {
        const client = await options.clientFor(claims.teamId);
        const profile = await getUserProfile(
          database(),
          client,
          claims.teamId,
          claims.userId,
          at,
          GRID_PROFILE_MAX_AGE_MS,
        );
        return { client, profile };
      };
      return { claims, snapshot, ...(await withDeadline(check(), deadlineMs)) };
    } catch (error) {
      const refusal: Refusal =
        error instanceof DeactivatedUserError ? "deactivated" : "slack_unavailable";
      refused.set(person, {
        until: at.getTime() + GRID_RECHECK_AFTER_REFUSAL_MS,
        refusal,
      });
      log.warn({
        action: "grid_link_refused",
        poll_id: claims.pollId,
        user_id: claims.userId,
        reason: refusal,
        error: slackErrorCode(error),
      });
      return refuse(request, refusal);
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
