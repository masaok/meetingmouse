import type { App } from "@slack/bolt";

import type { GridLinks } from "@/web/link";

/** What `createMeetingMouse` hands every feature besides the app. */
export interface FeatureContext {
  /** Present when the host serves the web grid; absent, features stay inside Slack. */
  grid?: GridLinks;
}

/**
 * One Slack feature: a name (the directory name) and the function that subscribes its
 * listeners. `createMeetingMouse` registers a list of these; a host application passes
 * `coreFeatures` plus its own.
 */
export interface Feature {
  readonly name: string;
  register(app: App, context: FeatureContext): void;
}
