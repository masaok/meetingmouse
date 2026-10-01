import type { App } from "@slack/bolt";

/**
 * One Slack feature: a name (the directory name) and the function that subscribes its
 * listeners. `createMeetMouse` registers a list of these; a host application passes
 * `coreFeatures` plus its own.
 */
export interface Feature {
  readonly name: string;
  register(app: App): void;
}
