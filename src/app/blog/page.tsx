import type { Metadata } from "next";
import Link from "next/link";

import { absoluteUrl, BLOG_PATH, FEED_PATH, postPath } from "@/blog/paths";
import { visiblePosts } from "@/blog/posts";
import { PostDate, PostTags } from "@/components/post";
import { SiteFooter, SiteHeader } from "@/components/site";
import { SITE_NAME } from "@/lib/site";

const TITLE = "Meeting Mouse blog · finding a time everyone can meet";
const DESCRIPTION =
  "Guides to scheduling a group: availability polls, time zones, comparing tools, and getting an answer without leaving Slack.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: {
    canonical: absoluteUrl(BLOG_PATH),
    types: { "application/atom+xml": absoluteUrl(FEED_PATH) },
  },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: absoluteUrl(BLOG_PATH),
    siteName: SITE_NAME,
    type: "website",
  },
};

export default function BlogIndex() {
  const posts = visiblePosts();
  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12 md:py-16">
        <h1 className="text-4xl leading-tight font-semibold tracking-tight">Blog</h1>
        <p className="mt-4 text-lg leading-8 text-stone-600 dark:text-stone-400">
          {DESCRIPTION}
        </p>
        <ul className="mt-10 space-y-6">
          {posts.map((post) => (
            <li
              key={post.slug}
              className="rounded-2xl border border-stone-200 bg-white p-6 dark:border-stone-800 dark:bg-stone-950"
            >
              <PostDate post={post} />
              <h2 className="mt-2 text-xl font-semibold tracking-tight">
                <Link href={postPath(post.slug)} className="hover:underline">
                  {post.title}
                </Link>
              </h2>
              <p className="mt-2 text-sm leading-6 text-stone-600 dark:text-stone-400">
                {post.description}
              </p>
              <PostTags post={post} />
            </li>
          ))}
        </ul>
      </main>
      <SiteFooter />
    </div>
  );
}
