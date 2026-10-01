import type { MetadataRoute } from "next";

import { absoluteUrl } from "@/blog/paths";

/** Pages are open to crawlers. The Slack endpoints and personal grid links are not pages. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/grid/"] },
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
