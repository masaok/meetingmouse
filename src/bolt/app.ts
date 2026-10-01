import "server-only";

import { LogLevel } from "@slack/bolt";

import { createMeetingMouse, type Bolt } from "@/bolt/create";
import { coreFeatures } from "@/features";
import { env } from "@/lib/env";

export type { Bolt } from "@/bolt/create";

let bolt: Bolt | undefined;

/**
 * The reference wiring: env in, the core features, built on first request. Not at import
 * time, so `next build` (which imports route modules to collect metadata) and the smoke test
 * never need real secrets.
 *
 * Bolt resolves the bot identity with auth.test on the first event. Offline dev (fake token,
 * `pnpm slack:sign`) sets SLACK_TOKEN_VERIFICATION=off to supply a fixed identity instead;
 * never set it on Vercel.
 */
export function getBolt(): Bolt {
  if (bolt) return bolt;
  const { SLACK_BOT_TOKEN, SLACK_SIGNING_SECRET } = env();
  const offline = process.env.SLACK_TOKEN_VERIFICATION === "off";
  bolt = createMeetingMouse({
    features: coreFeatures,
    signingSecret: SLACK_SIGNING_SECRET,
    auth: offline
      ? {
          authorize: async () => ({
            botToken: SLACK_BOT_TOKEN,
            botId: "B0LOCAL",
            botUserId: "U0LOCAL",
          }),
        }
      : { token: SLACK_BOT_TOKEN },
    logLevel: process.env.NODE_ENV === "production" ? LogLevel.INFO : LogLevel.DEBUG,
  });
  return bolt;
}
