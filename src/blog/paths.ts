import { POLICIES } from "../lib/policies";
import {
  INSTALLATION_PATH,
  LEGAL_PATH,
  PRIVACY_PATH,
  SITE_URL,
  SUPPORT_PATH,
} from "../lib/site";

export const BLOG_PATH = "/blog";
export const FEED_PATH = "/blog/feed.xml";

export const postPath = (slug: string): string => `${BLOG_PATH}/${slug}`;
export const absoluteUrl = (path: string): string =>
  `${SITE_URL}${path === "/" ? "" : path}`;

/** Pages a post may link to besides other posts. The link rule in `check.ts` reads this. */
export const SITE_ROUTES: readonly string[] = [
  "/",
  BLOG_PATH,
  FEED_PATH,
  PRIVACY_PATH,
  SUPPORT_PATH,
  INSTALLATION_PATH,
  LEGAL_PATH,
  ...POLICIES.map((policy) => policy.path),
];
