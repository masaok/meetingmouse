import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import { parsePost, type Post } from "./schema";

export const POSTS_DIR = path.join(process.cwd(), "content", "blog");

export interface PostFile {
  file: string;
  source: string;
}

export function readPostFiles(dir: string = POSTS_DIR): PostFile[] {
  return readdirSync(dir)
    .filter((name) => name.endsWith(".md"))
    .sort()
    .map((name) => ({
      file: path.join(dir, name),
      source: readFileSync(path.join(dir, name), "utf8"),
    }));
}

export function newestFirst(posts: Post[]): Post[] {
  return [...posts].sort(
    (a, b) =>
      Date.parse(b.publishedAt) - Date.parse(a.publishedAt) ||
      a.title.localeCompare(b.title),
  );
}

/**
 * Every post, drafts included, newest first. The index, the post page, the sitemap and the
 * feed all read posts through this function. An invalid post throws, naming its field.
 */
export function loadPosts(dir: string = POSTS_DIR): Post[] {
  const posts = readPostFiles(dir).map(({ file, source }) => {
    const parsed = parsePost(file, source);
    if (!parsed.ok) throw new Error(parsed.problems.join("\n"));
    return parsed.post;
  });
  return newestFirst(posts);
}

export const published = (posts: Post[]): Post[] => posts.filter((post) => !post.draft);

/** What the pages render: drafts show in development and never in a production build. */
export function visiblePosts(): Post[] {
  const posts = loadPosts();
  return process.env.NODE_ENV === "production" ? published(posts) : posts;
}
