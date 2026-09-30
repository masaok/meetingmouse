import type { App } from "@slack/bolt";

import * as appHome from "./app-home/listener";
import * as pollCreate from "./poll-create/listener";
import * as pollOrganize from "./poll-organize/listener";
import * as pollRespond from "./poll-respond/listener";

/**
 * Features are colocated: each directory owns its listener, its block builders, its
 * payload schema and its tests. Surface ids live in src/slack/ids.ts and every one of
 * them is documented in docs/FEATURE_MAP.md (CI checks this).
 */
export function registerFeatures(app: App): void {
  pollCreate.register(app);
  pollRespond.register(app);
  pollOrganize.register(app);
  appHome.register(app);
}
