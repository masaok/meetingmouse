import { describe, expect, it } from "vitest";

import { GOOD_POST } from "./fixtures";
import { loadPosts, published } from "./posts";
import { parsePost } from "./schema";

describe("parsePost", () => {
  it("returns the typed post", () => {
    const parsed = parsePost("good.md", GOOD_POST);
    expect(parsed.ok && parsed.post.slug).toBe("when-to-meet-with-a-grid");
    expect(parsed.ok && parsed.post.body.startsWith("Working out when to meet")).toBe(
      true,
    );
  });

  it("names the field a post is missing", () => {
    const parsed = parsePost("bad.md", GOOD_POST.replace("author: Meeting Mouse\n", ""));
    expect(parsed).toEqual({
      ok: false,
      problems: ["bad.md: author: Invalid input: expected string, received undefined"],
    });
  });

  it("rejects a field the shape does not have", () => {
    const parsed = parsePost(
      "bad.md",
      GOOD_POST.replace("draft: false", "draft: false\nhero: x"),
    );
    expect(parsed.ok).toBe(false);
  });
});

describe("loadPosts", () => {
  it("returns the real posts, newest first", () => {
    const posts = loadPosts();
    expect(posts.length).toBeGreaterThan(0);
    const times = posts.map((post) => Date.parse(post.publishedAt));
    expect(times).toEqual([...times].sort((a, b) => b - a));
    expect(published(posts).every((post) => !post.draft)).toBe(true);
  });
});
