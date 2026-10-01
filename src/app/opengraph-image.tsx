import { socialImage } from "@/components/social-image";

export const alt = "Meeting Mouse: find the time everyone is free, right from Slack";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * A page that sets its own `openGraph` replaces the root's, image included, so it passes
 * this in `openGraph.images` and `twitter.images` to keep the preview.
 */
export const SOCIAL_IMAGE = { url: "/opengraph-image", ...size, alt };

/** The social preview for the homepage and the blog index, drawn at build time. */
export default function OpengraphImage() {
  return socialImage({
    headline: "Find the time everyone is free, right from Slack.",
    footer: "Availability polls in one Slack message.",
  });
}
