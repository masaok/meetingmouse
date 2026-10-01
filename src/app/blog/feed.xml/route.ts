import { feedXml } from "@/blog/feed";
import { loadPosts } from "@/blog/posts";

export const dynamic = "force-static";

/** The Atom feed, built with the site. */
export function GET(): Response {
  return new Response(feedXml(loadPosts()), {
    headers: { "content-type": "application/atom+xml; charset=utf-8" },
  });
}
