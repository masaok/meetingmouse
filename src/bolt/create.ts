import "server-only";

import { App, LogLevel, type AppOptions } from "@slack/bolt";
import { VercelReceiver } from "@vercel/slack-bolt";

import type { Feature } from "@/features/types";

export interface Bolt {
  app: App;
  receiver: VercelReceiver;
}

/** Bolt's per-request token resolver, for hosts that install into many workspaces. */
export type Authorize = NonNullable<AppOptions["authorize"]>;

export interface CreateMeetMouseOptions {
  /** Registered in order. A host passes `coreFeatures` plus its own. Names must be unique. */
  features: readonly Feature[];
  signingSecret: string;
  /** One bot token for a single workspace, or a resolver that finds the token per request. */
  auth: { token: string } | { authorize: Authorize };
  logLevel?: LogLevel;
}

/**
 * Build the Bolt app and the Vercel receiver for a list of features. Nothing here reads the
 * environment: the caller decides where credentials come from, so the same function serves
 * the reference app in this repo and a host that embeds it.
 */
export function createMeetMouse(options: CreateMeetMouseOptions): Bolt {
  const { features, signingSecret, auth, logLevel = LogLevel.INFO } = options;
  const names = new Set<string>();
  for (const { name } of features) {
    if (names.has(name)) throw new Error(`duplicate feature name "${name}"`);
    names.add(name);
  }
  const receiver = new VercelReceiver({ signingSecret, logLevel });
  const app = new App({
    ...("token" in auth ? { token: auth.token } : { authorize: auth.authorize }),
    signingSecret,
    receiver,
    deferInitialization: true,
  });
  for (const feature of features) feature.register(app);
  return { app, receiver };
}
