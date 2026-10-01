# Blog

The blog is a set of Markdown files rendered as static pages at `/blog`. It exists to answer
the questions people search for before they know Meeting Mouse exists. Each post targets one
keyword from the [keyword map](./BLOG_KEYWORDS.md).

## Surfaces

| Surface    | Route                          | File                                      | Reproduce                                                        |
| ---------- | ------------------------------ | ----------------------------------------- | ---------------------------------------------------------------- |
| Index      | `/blog`                        | `src/app/blog/page.tsx`                   | `curl -s localhost:3000/blog`                                    |
| Post page  | `/blog/<slug>`                 | `src/app/blog/[slug]/page.tsx`            | `curl -s localhost:3000/blog/<slug>`                             |
| Post image | `/blog/<slug>/opengraph-image` | `src/app/blog/[slug]/opengraph-image.tsx` | `curl -s -o post.png localhost:3000/blog/<slug>/opengraph-image` |
| Feed       | `/blog/feed.xml`               | `src/app/blog/feed.xml/route.ts`          | `curl -s localhost:3000/blog/feed.xml`                           |
| Sitemap    | `/sitemap.xml`                 | `src/app/sitemap.ts`                      | `curl -s localhost:3000/sitemap.xml`                             |
| Nav links  | header and footer              | `src/components/site.tsx`                 | open `/` and click Blog                                          |

An unknown slug returns the 404 page: the post route sets `dynamicParams = false`, so only the
slugs the loader returns exist. All four routes are prerendered by `next build`.

## Where things live

```
content/blog/<slug>.md      one post per file: YAML front matter, then a Markdown body
docs/BLOG_KEYWORDS.md       the keyword map: which post owns which keyword
src/blog/schema.ts          the Post shape (zod) and parsePost, the one parser
src/blog/posts.ts           loadPosts, the one loader every page, the sitemap and the feed call
src/blog/markdown.ts        Markdown to HTML, heading ids, the table of contents
src/blog/feed.ts            sitemap rows and the Atom feed
src/blog/paths.ts           blog routes and the pages a post may link to
src/blog/check.ts           the content rules
scripts/check-blog.ts       `pnpm blog:check`, part of `pnpm verify`
src/lib/site.ts             the site URL, the name and the two call-to-action links
```

## The post shape

Front matter, validated by `postMetaSchema` in `src/blog/schema.ts`. An unknown field is an
error, so a typo in a field name fails the check.

| Field               | Rule                                                                 |
| ------------------- | -------------------------------------------------------------------- |
| `slug`              | Lowercase words joined by hyphens. Contains the primary keyword.     |
| `title`             | At most 60 characters. Contains the primary keyword.                 |
| `description`       | 120 to 160 characters. The meta description.                         |
| `primaryKeyword`    | Exactly one, with a row in the keyword map, owned by this post alone |
| `secondaryKeywords` | A list, possibly empty. Never another post's primary keyword.        |
| `tags`              | At least one. Related posts are chosen by shared tags.               |
| `author`            | Shown in the feed and the structured data.                           |
| `createdAt`         | ISO 8601. When the file was first written.                           |
| `publishedAt`       | ISO 8601. The date readers see. Never backdated.                     |
| `updatedAt`         | ISO 8601, optional. Set only when the post changes.                  |
| `draft`             | `true` shows the post under `pnpm dev` only.                         |

The body is Markdown and starts with a paragraph, not a heading. The page renders the title as
the only top-level heading, so sections start at `##`. A post with three or more `##` sections
gets a table of contents. The page adds the date, the call to action and three related posts;
none of those belong in the body.

## What the content check enforces

`pnpm blog:check` reads every post and the keyword map and reports. It never rewrites a post.
Each rule has a fixture that breaks it in `src/blog/check.test.ts`.

| Rule                         | Fails when                                                                                   |
| ---------------------------- | -------------------------------------------------------------------------------------------- |
| Valid shape                  | A post does not match the schema                                                             |
| Unique slugs                 | Two posts share a slug                                                                       |
| One owner per keyword        | A keyword has two owners, a mapped keyword has no post, or the row disagrees                 |
| Keyword placement            | The primary keyword is missing from the title, slug, description or first paragraph          |
| Title and description length | A title is over 60 characters, or a description is outside 120 to 160                        |
| One top-level heading        | The body has a `#` heading                                                                   |
| Links resolve                | An internal link points at a missing page or post, a draft, or is relative                   |
| Images described             | An image has no alt text                                                                     |
| Honest dates                 | `publishedAt` is in the future on a non-draft, before `createdAt`, or after `updatedAt`      |
| Connected                    | A post links to fewer than two other posts or to no page of the site, once three posts exist |
| Drafts stay home             | A draft is in the sitemap or the feed                                                        |

There is no keyword-density rule. Repeating a phrase to satisfy a counter makes a post worse.
`pnpm prose:check` also covers `content/`: no long dashes, no curly quotes.

## What a post may claim

- Every claim about Meeting Mouse comes from this repository: the README, the homepage copy
  and the living docs.
- No invented statistics, studies, quotes, customers or benchmarks.
- A claim about another product is limited to what is common knowledge, and prices and plan
  limits are never quoted. Send the reader to that product's own page.
- A post links to two other posts and to one page of the site.

## Adding a post

Use the `add-blog-post` skill in `.claude/skills/add-blog-post/`. By hand: add the keyword-map
row, write `content/blog/<slug>.md`, run `pnpm blog:check`, then `pnpm verify`, then open the
post under `pnpm dev`.

## What is not built

There are no tag pages and no pagination. The sitemap exists at `/sitemap.xml` and
`robots.txt` points at it; submitting it to a search console is a human step.

## Social preview and robots

Preview images are drawn at build time by `socialImage` in `src/components/social-image.tsx`:
the logo, a headline, one line under it and the mascot.

| Page       | Image route                               | Headline       |
| ---------- | ----------------------------------------- | -------------- |
| Homepage   | `src/app/opengraph-image.tsx`             | The site's own |
| Blog index | the homepage's image, as `SOCIAL_IMAGE`   | The site's own |
| A post     | `src/app/blog/[slug]/opengraph-image.tsx` | The post title |

A new post needs no image work: its preview is prerendered from its title, and an unknown
slug returns 404. A page that sets its own `openGraph` metadata replaces the root's, image
included, so the blog index passes `SOCIAL_IMAGE` and the post page passes its own image URL
in `openGraph.images` and `twitter.images`. A new page with its own `openGraph` has to do the
same.

`src/app/robots.ts` allows every page, disallows `/api/` and `/grid/`, and names the sitemap.
