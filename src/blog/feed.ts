import { SITE_NAME } from "../lib/site";
import { absoluteUrl, BLOG_PATH, FEED_PATH, postPath } from "./paths";
import { published } from "./posts";
import type { Post } from "./schema";

export interface SitemapEntry {
  url: string;
  lastModified: Date;
}

export const lastChanged = (post: Post): Date =>
  new Date(post.updatedAt ?? post.publishedAt);

function newest(posts: Post[]): Date {
  return new Date(Math.max(0, ...posts.map((post) => lastChanged(post).getTime())));
}

/** The blog's sitemap rows: the index and every published post. */
export function blogSitemapEntries(posts: Post[]): SitemapEntry[] {
  const live = published(posts);
  return [
    { url: absoluteUrl(BLOG_PATH), lastModified: newest(live) },
    ...live.map((post) => ({
      url: absoluteUrl(postPath(post.slug)),
      lastModified: lastChanged(post),
    })),
  ];
}

const escapeXml = (text: string): string =>
  text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

/** An Atom feed of every published post. */
export function feedXml(posts: Post[]): string {
  const live = published(posts);
  const entries = live.map((post) => {
    const url = escapeXml(absoluteUrl(postPath(post.slug)));
    return [
      "  <entry>",
      `    <id>${url}</id>`,
      `    <title>${escapeXml(post.title)}</title>`,
      `    <link href="${url}"/>`,
      `    <published>${new Date(post.publishedAt).toISOString()}</published>`,
      `    <updated>${lastChanged(post).toISOString()}</updated>`,
      `    <author><name>${escapeXml(post.author)}</name></author>`,
      `    <summary>${escapeXml(post.description)}</summary>`,
      ...post.tags.map((tag) => `    <category term="${escapeXml(tag)}"/>`),
      "  </entry>",
    ].join("\n");
  });
  return [
    '<?xml version="1.0" encoding="utf-8"?>',
    '<feed xmlns="http://www.w3.org/2005/Atom">',
    `  <id>${absoluteUrl(BLOG_PATH)}</id>`,
    `  <title>${escapeXml(SITE_NAME)} blog</title>`,
    `  <link href="${absoluteUrl(BLOG_PATH)}"/>`,
    `  <link rel="self" href="${absoluteUrl(FEED_PATH)}"/>`,
    `  <updated>${newest(live).toISOString()}</updated>`,
    ...entries,
    "</feed>",
    "",
  ].join("\n");
}
