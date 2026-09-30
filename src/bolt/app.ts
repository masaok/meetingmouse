import "server-only";

import { App, LogLevel } from "@slack/bolt";
import { VercelReceiver } from "@vercel/slack-bolt";

import { registerFeatures } from "@/features";
import { env } from "@/lib/env";

export interface Bolt {
  app: App;
  receiver: VercelReceiver;
}

let bolt: Bolt | undefined;

/**
 * Built on first request, not at import time, so `next build` (which imports route modules to
 * collect metadata) and the smoke test never need real secrets.
 *
 * The receiver acks Slack within 3 s and runs the rest of each listener under `waitUntil`,
 * so DB writes and chat.update finish after the response is sent.
 */
export function getBolt(): Bolt {
  if (bolt) return bolt;
  const { SLACK_BOT_TOKEN, SLACK_SIGNING_SECRET } = env();
  const receiver = new VercelReceiver({
    signingSecret: SLACK_SIGNING_SECRET,
    logLevel: process.env.NODE_ENV === "production" ? LogLevel.INFO : LogLevel.DEBUG,
  });
  // Bolt resolves the bot identity with auth.test on the first event. Offline dev (fake
  // token, `pnpm slack:sign`) sets SLACK_TOKEN_VERIFICATION=off to supply a fixed identity
  // instead; never set it on Vercel.
  const offline = process.env.SLACK_TOKEN_VERIFICATION === "off";
  const app = new App({
    ...(offline
      ? {
          authorize: async () => ({
            botToken: SLACK_BOT_TOKEN,
            botId: "B0LOCAL",
            botUserId: "U0LOCAL",
          }),
        }
      : { token: SLACK_BOT_TOKEN }),
    signingSecret: SLACK_SIGNING_SECRET,
    receiver,
    deferInitialization: true,
  });
  registerFeatures(app);
  bolt = { app, receiver };
  return bolt;
}
