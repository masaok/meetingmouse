import { createHmac, timingSafeEqual } from "node:crypto";

/** Who a grid link acts as, and on which poll. */
export interface GridClaims {
  pollId: string;
  teamId: string;
  userId: string;
}

/** A link stays good for this long; a fresh one is one click away in Slack. */
export const GRID_LINK_TTL_SECONDS = 30 * 24 * 60 * 60;

const VERSION = "v1";

/**
 * A key for grid links derived from a secret the host already holds, so the grid needs no
 * variable of its own. The label keeps this key apart from every other use of the parent.
 */
export function deriveGridSecret(parent: string): Buffer {
  return createHmac("sha256", parent).update("meetingmouse/grid-link/v1").digest();
}

const mac = (secret: Buffer, body: string): Buffer =>
  createHmac("sha256", secret).update(`${VERSION}.${body}`).digest();

/**
 * The token is the bearer credential in the page's URL: the claims and an expiry, signed.
 * Whoever holds it can read the poll and set that one person's availability on it.
 */
export function signGridLink(
  secret: Buffer,
  claims: GridClaims,
  now: Date = new Date(),
  ttlSeconds: number = GRID_LINK_TTL_SECONDS,
): string {
  const expires = Math.floor(now.getTime() / 1000) + ttlSeconds;
  const body = Buffer.from(
    JSON.stringify([claims.pollId, claims.teamId, claims.userId, expires]),
  ).toString("base64url");
  return `${VERSION}.${body}.${mac(secret, body).toString("base64url")}`;
}

/** The claims, or null for a token that is malformed, forged or expired. */
export function verifyGridLink(
  secret: Buffer,
  token: string,
  now: Date = new Date(),
): GridClaims | null {
  const [version, body, signature, ...rest] = token.split(".");
  if (version !== VERSION || !body || !signature || rest.length > 0) return null;
  const given = Buffer.from(signature, "base64url");
  const expected = mac(secret, body);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  } catch {
    return null;
  }
  if (!Array.isArray(parsed) || parsed.length !== 4) return null;
  const [pollId, teamId, userId, expires] = parsed as unknown[];
  if (
    typeof pollId !== "string" ||
    typeof teamId !== "string" ||
    typeof userId !== "string" ||
    typeof expires !== "number"
  )
    return null;
  if (expires <= Math.floor(now.getTime() / 1000)) return null;
  return { pollId, teamId, userId };
}

/** What a feature needs to hand a person their link. Built by `createMeetingMouse`. */
export interface GridLinks {
  urlFor(claims: GridClaims): string;
}

export interface GridOptions {
  /** The origin that serves the grid route, such as `https://app.example.com`. */
  baseUrl: string;
  /** Signs the links. `deriveGridSecret` makes one from a secret the host already has. */
  secret: Buffer;
}

export function gridLinks({ baseUrl, secret }: GridOptions): GridLinks {
  const origin = baseUrl.replace(/\/+$/, "");
  return { urlFor: (claims) => `${origin}/grid/${signGridLink(secret, claims)}` };
}
