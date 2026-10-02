import type { MetadataRoute } from "next";

import { blogSitemapEntries } from "@/blog/feed";
import { absoluteUrl } from "@/blog/paths";
import { loadPosts } from "@/blog/posts";
import { PRIVACY_PATH, SUPPORT_PATH } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const blog = blogSitemapEntries(loadPosts());
  const lastModified = blog[0].lastModified;
  return [
    { url: absoluteUrl("/"), lastModified },
    ...blog,
    { url: absoluteUrl(PRIVACY_PATH), lastModified },
    { url: absoluteUrl(SUPPORT_PATH), lastModified },
  ];
}
