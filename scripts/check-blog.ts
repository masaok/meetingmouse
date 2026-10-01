/**
 * The blog's content rules: post shape, one owner per keyword, keyword placement, links,
 * alt text, dates, drafts. `docs/BLOG.md` lists each rule. Read-only.
 *
 *   pnpm blog:check
 */
import { readFileSync } from "node:fs";

import { checkBlog } from "../src/blog/check";
import { blogSitemapEntries, feedXml } from "../src/blog/feed";
import { readPostFiles } from "../src/blog/posts";
import { parsePost, type Post } from "../src/blog/schema";

const files = readPostFiles();
const posts = files.flatMap(({ file, source }): Post[] => {
  const parsed = parsePost(file, source);
  return parsed.ok ? [parsed.post] : [];
});
const problems = checkBlog({
  files,
  keywordMap: readFileSync("docs/BLOG_KEYWORDS.md", "utf8"),
  sitemapUrls: blogSitemapEntries(posts).map((entry) => entry.url),
  feedXml: feedXml(posts),
  now: new Date(),
});
for (const problem of problems) console.error(problem);
console.log(`${files.length} posts, ${problems.length} problems`);
process.exit(problems.length ? 1 : 0);
