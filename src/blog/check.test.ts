import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { checkBlog, type CheckInput } from "./check";
import { blogSitemapEntries, feedXml } from "./feed";
import { GOOD_POST } from "./fixtures";
import { readPostFiles } from "./posts";
import { parsePost, type Post } from "./schema";

const MAP = `| Keyword | Intent | Post title | Slug | Status |
| --- | --- | --- | --- | --- |
| when to meet | learn | When to meet with a grid | when-to-meet-with-a-grid | published |
`;

const SECOND = GOOD_POST.replaceAll("when-to-meet-with-a-grid", "doodle-free-and-a-grid")
  .replace('title: "When to meet with a grid"', 'title: "Doodle free and a grid"')
  .replaceAll("when to meet", "doodle free")
  .replace("Deciding doodle free", "Going doodle free");
const SECOND_ROW =
  "| doodle free | compare | Doodle free and a grid | doodle-free-and-a-grid | published |\n";

/** A passing input, with any part replaced by the fixture that breaks one rule. */
function input(sources: string[], over: Partial<CheckInput> = {}): CheckInput {
  return {
    files: sources.map((source, i) => ({ file: `post-${i}.md`, source })),
    keywordMap: MAP,
    sitemapUrls: [],
    feedXml: "",
    now: new Date("2026-10-01T00:00:00Z"),
    ...over,
  };
}

/** Proof-of-failure: each rule must reject the fixture built to break it. */
describe("checkBlog", () => {
  it("passes the good fixture", () => {
    expect(checkBlog(input([GOOD_POST]))).toEqual([]);
  });

  it("valid shape: rejects a post that does not match the schema", () => {
    expect(
      checkBlog(input([GOOD_POST.replace("draft: false", "draft: maybe")])),
    ).toContain("post-0.md: draft: Invalid input: expected boolean, received string");
  });

  it("unique slugs: rejects two posts with one slug", () => {
    expect(checkBlog(input([GOOD_POST, GOOD_POST]))).toContain(
      "when-to-meet-with-a-grid: two posts share this slug",
    );
  });

  it("one owner per keyword: rejects a keyword claimed twice", () => {
    const twin = GOOD_POST.replaceAll("when-to-meet-with-a-grid", "when-to-meet-again");
    expect(checkBlog(input([GOOD_POST, twin]))).toContain(
      'when-to-meet-again: the primary keyword "when to meet" is already owned by when-to-meet-with-a-grid',
    );
  });

  it("one owner per keyword: rejects a mapped keyword with no post", () => {
    expect(checkBlog(input([GOOD_POST], { keywordMap: MAP + SECOND_ROW }))).toEqual([
      'keyword map: "doodle free" has no post at doodle-free-and-a-grid',
    ]);
  });

  it("one owner per keyword: allows a planned row with no post", () => {
    const planned = SECOND_ROW.replace("published", "planned");
    expect(checkBlog(input([GOOD_POST], { keywordMap: MAP + planned }))).toEqual([]);
  });

  it("one owner per keyword: rejects a post whose keyword is not in the map", () => {
    expect(checkBlog(input([GOOD_POST, SECOND]))).toEqual([
      'doodle-free-and-a-grid: the primary keyword "doodle free" is not in the keyword map',
    ]);
  });

  it("one owner per keyword: rejects a secondary keyword another post owns", () => {
    const greedy = SECOND.replace(
      "secondaryKeywords: []",
      "secondaryKeywords: [when to meet]",
    );
    expect(
      checkBlog(input([GOOD_POST, greedy], { keywordMap: MAP + SECOND_ROW })),
    ).toEqual([
      'doodle-free-and-a-grid: the secondary keyword "when to meet" is the primary keyword of when-to-meet-with-a-grid',
    ]);
  });

  it("keyword placement: rejects a keyword missing from each of the four places", () => {
    const moved = GOOD_POST.replace(
      "primaryKeyword: when to meet",
      "primaryKeyword: doodle free",
    );
    const map = MAP.replace("| when to meet |", "| doodle free |");
    expect(checkBlog(input([moved], { keywordMap: map }))).toEqual([
      'when-to-meet-with-a-grid: the primary keyword "doodle free" is missing from the title',
      'when-to-meet-with-a-grid: the primary keyword "doodle free" is missing from the slug',
      'when-to-meet-with-a-grid: the primary keyword "doodle free" is missing from the description',
      'when-to-meet-with-a-grid: the primary keyword "doodle free" is missing from the first paragraph',
    ]);
  });

  it("title and description length: rejects a long title and a short description", () => {
    const long = GOOD_POST.replace(
      'title: "When to meet with a grid"',
      `title: "When to meet with a grid ${"and more ".repeat(5)}"`,
    );
    expect(checkBlog(input([long]))[0]).toBe(
      "post-0.md: title: Too big: expected string to have <=60 characters",
    );
    const short = GOOD_POST.replace(/description: ".*"/, 'description: "When to meet."');
    expect(checkBlog(input([short]))[0]).toBe(
      "post-0.md: description: Too small: expected string to have >=120 characters",
    );
  });

  it("one top-level heading: rejects a body with its own", () => {
    expect(checkBlog(input([GOOD_POST.replace("## A section", "# A section")]))).toEqual([
      "when-to-meet-with-a-grid: the body has a top-level heading; the title is the only one",
    ]);
  });

  it("links resolve: rejects a missing page, a missing post and a relative link", () => {
    const broken = GOOD_POST.replace(
      "More text.",
      "[a](/pricing) [b](/blog/nope) [c](other-post) [d](/#how) [e](https://example.com)",
    );
    expect(checkBlog(input([broken]))).toEqual([
      "when-to-meet-with-a-grid: link /pricing points at a page that does not exist",
      "when-to-meet-with-a-grid: link /blog/nope points at a page that does not exist",
      "when-to-meet-with-a-grid: link other-post is relative; start internal links with /",
    ]);
  });

  it("links resolve: rejects a link to a draft", () => {
    const draft = SECOND.replace("draft: false", "draft: true");
    const linked = GOOD_POST.replace("More text.", "[a](/blog/doodle-free-and-a-grid)");
    expect(checkBlog(input([linked, draft], { keywordMap: MAP + SECOND_ROW }))).toEqual([
      "when-to-meet-with-a-grid: link /blog/doodle-free-and-a-grid points at a page that does not exist",
    ]);
  });

  it("images described: rejects an image with no alt text", () => {
    const bare = GOOD_POST.replace(
      "More text.",
      '![](/grid.png)\n\n<img src="/grid.png">',
    );
    expect(checkBlog(input([bare]))).toEqual([
      "when-to-meet-with-a-grid: image /grid.png has no alt text",
      "when-to-meet-with-a-grid: an <img> tag has no alt text",
    ]);
  });

  it("honest dates: rejects a future date and a date before the file was written", () => {
    const future = GOOD_POST.replace(
      "publishedAt: 2026-09-02",
      "publishedAt: 2026-12-25",
    );
    expect(checkBlog(input([future]))).toEqual([
      "when-to-meet-with-a-grid: publishedAt 2026-12-25 is in the future",
    ]);
    const backdated = GOOD_POST.replace(
      "publishedAt: 2026-09-02",
      "publishedAt: 2024-01-01",
    );
    expect(checkBlog(input([backdated]))).toEqual([
      "when-to-meet-with-a-grid: publishedAt 2024-01-01 is before createdAt",
    ]);
  });

  it("honest dates: rejects a date that does not exist and an update before publication", () => {
    const impossible = GOOD_POST.replace(
      "createdAt: 2026-09-01",
      "createdAt: 2026-02-30",
    );
    expect(checkBlog(input([impossible]))[0]).toBe(
      "post-0.md: createdAt: must be an ISO 8601 date, such as 2026-10-01",
    );
    const early = GOOD_POST.replace(
      "draft: false",
      "updatedAt: 2026-08-01\ndraft: false",
    );
    expect(checkBlog(input([early]))).toEqual([
      "when-to-meet-with-a-grid: updatedAt 2026-08-01 is before publishedAt",
    ]);
  });

  it("connected: rejects a post with too few links once there are posts to link to", () => {
    const third = SECOND.replaceAll(
      "doodle-free-and-a-grid",
      "doodle-calendar-and-a-grid",
    )
      .replace("Doodle free and a grid", "Doodle calendar and a grid")
      .replaceAll("doodle free", "doodle calendar");
    const row = (keyword: string, title: string, slug: string) =>
      `| ${keyword} | compare | ${title} | ${slug} | published |\n`;
    const map =
      MAP +
      SECOND_ROW +
      row("doodle calendar", "Doodle calendar and a grid", "doodle-calendar-and-a-grid");
    const linked = (source: string, a: string, b: string) =>
      source.replace("More text.", `[a](/blog/${a}) [b](/blog/${b})`);
    const first = "when-to-meet-with-a-grid";
    const lonely = GOOD_POST.replace("See [the homepage](/).", "No links here.");
    expect(
      checkBlog(
        input(
          [
            lonely,
            linked(SECOND, first, "doodle-calendar-and-a-grid"),
            linked(third, first, "doodle-free-and-a-grid"),
          ],
          { keywordMap: map },
        ),
      ),
    ).toEqual([
      "when-to-meet-with-a-grid: links to 0 other posts; link to at least 2",
      "when-to-meet-with-a-grid: links to no page of the site, such as /#how",
    ]);
  });

  it("drafts stay home: rejects a draft in the sitemap or the feed", () => {
    const draft = GOOD_POST.replace("draft: false", "draft: true");
    const url = "https://www.meetingmouse.net/blog/when-to-meet-with-a-grid";
    expect(
      checkBlog(input([draft], { sitemapUrls: [url], feedXml: `<id>${url}</id>` })),
    ).toEqual([
      "when-to-meet-with-a-grid: a draft is in the sitemap",
      "when-to-meet-with-a-grid: a draft is in the feed",
    ]);
  });

  it("the real sitemap and feed builders leave drafts out", () => {
    const parsed = parsePost("d.md", GOOD_POST.replace("draft: false", "draft: true"));
    const posts: Post[] = parsed.ok ? [parsed.post] : [];
    expect(posts).toHaveLength(1);
    expect(blogSitemapEntries(posts).map((e) => e.url)).toEqual([
      "https://www.meetingmouse.net/blog",
    ]);
    expect(feedXml(posts)).not.toContain("<entry>");
  });

  it("passes on the real posts and keyword map", () => {
    const files = readPostFiles();
    const posts = files.flatMap(({ file, source }) => {
      const p = parsePost(file, source);
      return p.ok ? [p.post] : [];
    });
    expect(
      checkBlog({
        files,
        keywordMap: readFileSync("docs/BLOG_KEYWORDS.md", "utf8"),
        sitemapUrls: blogSitemapEntries(posts).map((e) => e.url),
        feedXml: feedXml(posts),
        now: new Date(),
      }),
    ).toEqual([]);
  });
});
