import type { MetadataRoute } from "next";

import { blogSitemapEntries } from "@/blog/feed";
import { absoluteUrl } from "@/blog/paths";
import { loadPosts } from "@/blog/posts";

export default function sitemap(): MetadataRoute.Sitemap {
  const blog = blogSitemapEntries(loadPosts());
  return [{ url: absoluteUrl("/"), lastModified: blog[0].lastModified }, ...blog];
}
