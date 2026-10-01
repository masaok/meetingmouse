---
name: add-blog-post
description: Add one post to the Meeting Mouse blog. Use when asked to write, add or publish a blog post, or to target a new keyword.
---

# Add a blog post

1. **Read `docs/BLOG.md` and `docs/BLOG_KEYWORDS.md`.** If the keyword, or a near-duplicate of it, already has a row, improve that post and do not write a second one.
2. **Add the keyword-map row first:** keyword, intent (`learn`, `compare`, `do` or `buy`), title, slug, status `planned`. The title is at most 60 characters. The slug and the title both contain the keyword.
3. **Write `content/blog/<slug>.md`.** Copy the front matter of `content/blog/when-to-meet-find-a-time-that-works-for-everyone.md` and change every field. `createdAt` and `publishedAt` are today. The description is 120 to 160 characters and contains the keyword.
4. **Write the body.** The first paragraph answers the question and contains the keyword. Sections start at `##`. Include one thing a reader can use directly: a table, a checklist, a template or a worked example.
5. **Keep it true.** Every claim about Meeting Mouse comes from `README.md`, `src/app/page.tsx` or `docs/`. No invented numbers, quotes or customers. For another product, state only common knowledge and never quote its prices or limits.
6. **Link** to two other posts as `/blog/<slug>` and to one page of the site, such as `/#how`.
7. **Set the row's status to `published`,** then run `pnpm blog:check`. Fix what it reports.
8. **Run `pnpm verify`.**
9. **Open the post:** `pnpm exec next dev -p 3111`, then `curl -s -o /dev/null -w '%{http_code}' localhost:3111/blog/<slug>` prints `200`. Read the page in a browser at desktop and phone width. Stop the server you started by its PID.
10. **Have a reviewer that did not write the post** read it against step 5 before it merges.
