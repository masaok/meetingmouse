import type { MetadataRoute } from "next";

/** The Slack endpoints and personal grid links are not pages; nothing else is worth indexing. */
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/grid/"] } };
}
