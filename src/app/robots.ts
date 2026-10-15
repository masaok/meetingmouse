import type { MetadataRoute } from "next";

/** The self-host page is the only page; the Slack endpoints and personal grid links are not. */
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/grid/"] } };
}
