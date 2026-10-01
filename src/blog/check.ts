import type { Tokens } from "marked";

import { allTokens, firstParagraph, renderMarkdown, wordCount } from "./markdown";
import { absoluteUrl, postPath, SITE_ROUTES } from "./paths";
import type { PostFile } from "./posts";
import { parsePost, type Post } from "./schema";

export interface KeywordRow {
  keyword: string;
  intent: string;
  title: string;
  slug: string;
  status: string;
}

/** A row marked `planned` has no post yet. Any other status must have one. */
export const STATUS_PLANNED = "planned";

/** Rows of the keyword table in `docs/BLOG_KEYWORDS.md`. */
export function parseKeywordMap(markdown: string): KeywordRow[] {
  return markdown
    .split("\n")
    .filter((line) => line.trim().startsWith("|"))
    .map((line) =>
      line
        .trim()
        .replace(/^\||\|$/g, "")
        .split("|")
        .map((cell) => cell.trim().replace(/^`|`$/g, "")),
    )
    .filter(
      (cells) => cells.length === 5 && cells[0] !== "Keyword" && !/^:?-+/.test(cells[0]),
    )
    .map(([keyword, intent, title, slug, status]) => ({
      keyword,
      intent,
      title,
      slug,
      status,
    }));
}

export interface CheckInput {
  files: PostFile[];
  keywordMap: string;
  /** Every URL the sitemap lists. */
  sitemapUrls: string[];
  /** The feed as served. */
  feedXml: string;
  now: Date;
}

const lower = (text: string): string => text.toLowerCase();
const hyphenated = (text: string): string =>
  lower(text)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

function placementProblems(post: Post): string[] {
  const keyword = lower(post.primaryKeyword);
  const places: [string, boolean][] = [
    ["title", lower(post.title).includes(keyword)],
    ["slug", post.slug.includes(hyphenated(keyword))],
    ["description", lower(post.description).includes(keyword)],
    ["first paragraph", lower(firstParagraph(post.body)).includes(keyword)],
  ];
  return places
    .filter(([, found]) => !found)
    .map(
      ([place]) =>
        `${post.slug}: the primary keyword "${post.primaryKeyword}" is missing from the ${place}`,
    );
}

/** Once the blog has more posts than this, each post links to this many others. */
export const MIN_POST_LINKS = 2;

function bodyProblems(post: Post, livePaths: Set<string>): string[] {
  const out: string[] = [];
  const postLinks = new Set<string>();
  let siteLinks = 0;
  for (const token of allTokens(post.body)) {
    if (token.type === "heading" && (token as Tokens.Heading).depth === 1) {
      out.push(
        `${post.slug}: the body has a top-level heading; the title is the only one`,
      );
    }
    if (token.type === "image" && !(token as Tokens.Image).text.trim()) {
      out.push(`${post.slug}: image ${(token as Tokens.Image).href} has no alt text`);
    }
    if (token.type === "html" && /<img\b(?![^>]*\balt="[^"]+")/i.test(token.raw)) {
      out.push(`${post.slug}: an <img> tag has no alt text`);
    }
    if (token.type === "link") {
      const href = (token as Tokens.Link).href;
      if (/^(https?:|mailto:|#)/.test(href)) continue;
      if (!href.startsWith("/")) {
        out.push(`${post.slug}: link ${href} is relative; start internal links with /`);
      } else if (!livePaths.has(href.split("#")[0])) {
        out.push(`${post.slug}: link ${href} points at a page that does not exist`);
      } else if (SITE_ROUTES.includes(href.split("#")[0])) siteLinks += 1;
      else if (href.split("#")[0] !== postPath(post.slug))
        postLinks.add(href.split("#")[0]);
    }
  }
  const otherPosts = livePaths.size - SITE_ROUTES.length - (post.draft ? 0 : 1);
  if (!post.draft && otherPosts >= MIN_POST_LINKS) {
    if (postLinks.size < MIN_POST_LINKS) {
      out.push(
        `${post.slug}: links to ${postLinks.size} other posts; link to at least ${MIN_POST_LINKS}`,
      );
    }
    if (siteLinks === 0)
      out.push(`${post.slug}: links to no page of the site, such as /#how`);
  }
  return out;
}

/** A published post has at least this many words of prose. */
export const MIN_POST_WORDS = 1500;
/** And at least this many `##` sections, which are the entries of its table of contents. */
export const MIN_POST_SECTIONS = 4;

/** A floor on length and on sections. It cannot tell substance from padding; a reviewer does. */
function sizeProblems(post: Post): string[] {
  if (post.draft) return [];
  const out: string[] = [];
  const words = wordCount(post.body);
  if (words < MIN_POST_WORDS) {
    out.push(
      `${post.slug}: the body has ${words} words; write at least ${MIN_POST_WORDS}`,
    );
  }
  const sections = renderMarkdown(post.body).toc.map((entry) => entry.text);
  if (sections.length < MIN_POST_SECTIONS) {
    out.push(
      `${post.slug}: the body has ${sections.length} sections; the table of contents needs at least ${MIN_POST_SECTIONS} second-level headings`,
    );
  }
  for (const text of new Set(sections.filter((t, i) => sections.indexOf(t) !== i))) {
    out.push(`${post.slug}: two sections share the heading "${text}"`);
  }
  return out;
}

function dateProblems(post: Post, now: Date): string[] {
  const out: string[] = [];
  if (!post.draft && Date.parse(post.publishedAt) > now.getTime()) {
    out.push(`${post.slug}: publishedAt ${post.publishedAt} is in the future`);
  }
  if (Date.parse(post.publishedAt) < Date.parse(post.createdAt)) {
    out.push(`${post.slug}: publishedAt ${post.publishedAt} is before createdAt`);
  }
  if (post.updatedAt && Date.parse(post.updatedAt) < Date.parse(post.publishedAt)) {
    out.push(`${post.slug}: updatedAt ${post.updatedAt} is before publishedAt`);
  }
  return out;
}

function keywordProblems(posts: Post[], rows: KeywordRow[]): string[] {
  const out: string[] = [];
  const owners = new Map<string, string>();
  for (const post of posts) {
    const keyword = lower(post.primaryKeyword);
    const owner = owners.get(keyword);
    if (owner) {
      out.push(
        `${post.slug}: the primary keyword "${post.primaryKeyword}" is already owned by ${owner}`,
      );
    } else owners.set(keyword, post.slug);
  }
  for (const post of posts) {
    for (const secondary of post.secondaryKeywords) {
      const owner = owners.get(lower(secondary));
      if (owner && owner !== post.slug) {
        out.push(
          `${post.slug}: the secondary keyword "${secondary}" is the primary keyword of ${owner}`,
        );
      }
    }
  }
  const mapped = new Map<string, KeywordRow>();
  for (const row of rows) {
    if (mapped.has(lower(row.keyword))) {
      out.push(`keyword map: "${row.keyword}" has more than one row`);
    }
    mapped.set(lower(row.keyword), row);
    if (row.status === STATUS_PLANNED) continue;
    const post = posts.find((p) => p.slug === row.slug);
    if (!post) out.push(`keyword map: "${row.keyword}" has no post at ${row.slug}`);
  }
  for (const post of posts) {
    const row = mapped.get(lower(post.primaryKeyword));
    if (!row) {
      out.push(
        `${post.slug}: the primary keyword "${post.primaryKeyword}" is not in the keyword map`,
      );
    } else if (row.slug !== post.slug || row.title !== post.title) {
      out.push(
        `${post.slug}: the keyword map row for "${post.primaryKeyword}" names another slug or title`,
      );
    }
  }
  return out;
}

/** Every rule in `docs/BLOG.md`. Read-only: it reports and never rewrites a post. */
export function checkBlog(input: CheckInput): string[] {
  const problems: string[] = [];
  const posts: Post[] = [];
  for (const { file, source } of input.files) {
    const parsed = parsePost(file, source);
    if (parsed.ok) posts.push(parsed.post);
    else problems.push(...parsed.problems);
  }

  const slugs = new Set<string>();
  for (const post of posts) {
    if (slugs.has(post.slug)) problems.push(`${post.slug}: two posts share this slug`);
    slugs.add(post.slug);
  }

  problems.push(...keywordProblems(posts, parseKeywordMap(input.keywordMap)));

  const livePaths = new Set([
    ...SITE_ROUTES,
    ...posts.filter((post) => !post.draft).map((post) => postPath(post.slug)),
  ]);
  for (const post of posts) {
    problems.push(...placementProblems(post));
    problems.push(...bodyProblems(post, livePaths));
    problems.push(...sizeProblems(post));
    problems.push(...dateProblems(post, input.now));
    if (post.draft) {
      const url = absoluteUrl(postPath(post.slug));
      if (input.sitemapUrls.includes(url)) {
        problems.push(`${post.slug}: a draft is in the sitemap`);
      }
      if (input.feedXml.includes(`<id>${url}</id>`)) {
        problems.push(`${post.slug}: a draft is in the feed`);
      }
    }
  }
  return problems;
}
