import type { WebClient } from "@slack/web-api";

import { getCachedUser, upsertCachedUser, type Db } from "@/db/queries";

export interface UserProfile {
  /** IANA zone from users.info; "UTC" when Slack has none. */
  tz: string;
  displayName: string;
}

/** Cached profiles are refetched after this long. Time zones change rarely. */
export const USER_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export type UsersClient = Pick<WebClient, "users">;

/** Slack says this person's account in the workspace is deactivated. */
export class DeactivatedUserError extends Error {
  constructor(userId: string) {
    super(`${userId} is deactivated`);
    this.name = "DeactivatedUserError";
  }
}

/**
 * users.info with a DB-backed cache, so opening a modal doesn't call Slack every time
 * (tier-4 rate limit) and stays well inside the 3 s window. A cached profile older than
 * `maxAgeMs` is refetched. Throws `DeactivatedUserError` for a deactivated person, who is
 * never cached, so only a profile fetched before the deactivation can outlive it.
 */
export async function getUserProfile(
  db: Db,
  client: UsersClient,
  teamId: string,
  userId: string,
  now: Date = new Date(),
  maxAgeMs: number = USER_CACHE_TTL_MS,
): Promise<UserProfile> {
  const cached = await getCachedUser(db, teamId, userId);
  if (cached && now.getTime() - cached.fetchedAt.getTime() < maxAgeMs) {
    return { tz: cached.tz, displayName: cached.displayName };
  }
  const res = await client.users.info({ user: userId });
  const user = res.user;
  if (!user) throw new Error(`users.info returned no user for ${userId}`);
  if (user.deleted) throw new DeactivatedUserError(userId);
  const profile: UserProfile = {
    tz: user.tz || "UTC",
    displayName: user.profile?.display_name || user.real_name || user.name || userId,
  };
  await upsertCachedUser(db, { teamId, userId, ...profile, fetchedAt: now });
  return profile;
}
