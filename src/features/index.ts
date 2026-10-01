import { feature as appHome } from "./app-home/listener";
import { feature as pollCreate } from "./poll-create/listener";
import { feature as pollOrganize } from "./poll-organize/listener";
import { feature as pollRespond } from "./poll-respond/listener";
import type { Feature } from "./types";

export type { Feature, FeatureContext } from "./types";

/**
 * Features are colocated: each directory owns its listener, its block builders, its
 * payload schema and its tests. Surface ids live in src/slack/ids.ts and every one of
 * them is documented in docs/FEATURE_MAP.md (CI checks this). A host application passes
 * this list, plus its own features, to `createMeetingMouse`.
 */
export const coreFeatures: readonly Feature[] = [
  pollCreate,
  pollRespond,
  pollOrganize,
  appHome,
];
