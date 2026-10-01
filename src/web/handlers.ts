import "server-only";

import { z } from "zod";

import { getDb } from "@/db/client";
import { getPollSnapshot, saveResponse, type Db } from "@/db/queries";
import { POLL_LIMITS } from "@/domain/constants";
import type { PollSnapshot } from "@/domain/types";
import { log } from "@/lib/log";
import { refreshPollMessage, type ChatUpdater } from "@/lib/refresh";
import { slackErrorCode } from "@/lib/respond";
import { getUserProfile, type UserProfile, type UsersClient } from "@/lib/users";

import { verifyGridLink, type GridClaims } from "./link";
import { renderGridPage, renderMessagePage } from "./page";
import { gridState } from "./state";

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

const gone = (request: Request, error: "bad_link" | "no_poll"): Response => {
  if (wantsJson(request)) return json({ error }, 404);
  return html(
    error === "bad_link"
      ? renderMessagePage(
          "This link has expired",
          "Click Add my availability on the poll in Slack for a fresh one.",
        )
      : renderMessagePage("This poll no longer exists", "Its organizer deleted it."),
    404,
  );
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
    if (!claims) return gone(request, "bad_link");
    const snapshot = await getPollSnapshot(database(), claims.pollId).catch(() => null);
    if (!snapshot || snapshot.poll.teamId !== claims.teamId)
      return gone(request, "no_poll");
    const client = await options.clientFor(claims.teamId);
    const profile = await getUserProfile(
      database(),
      client,
      claims.teamId,
      claims.userId,
    );
    return { claims, snapshot, client, profile };
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
      if (!fresh) return gone(request, "no_poll");
      return json(stateOf({ ...loaded, snapshot: fresh }));
    },
  };
}
