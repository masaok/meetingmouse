import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { lastChanged } from "@/blog/feed";
import { renderMarkdown } from "@/blog/markdown";
import { absoluteUrl, BLOG_PATH, postPath } from "@/blog/paths";
import { visiblePosts } from "@/blog/posts";
import type { Post } from "@/blog/schema";
import { PostDate, PostTags } from "@/components/post";
import { SiteFooter, SiteHeader } from "@/components/site";
import { SOCIAL_IMAGE_SIZE } from "@/components/social-image";
import { SELF_HOST_URL, SITE_NAME, SITE_URL, SLACK_INSTALL_URL } from "@/lib/site";

/** A post with at least this many sections gets a table of contents. */
const TOC_MIN_SECTIONS = 3;
const RELATED_POSTS = 3;

export const dynamicParams = false;

export function generateStaticParams(): { slug: string }[] {
  return visiblePosts().map((post) => ({ slug: post.slug }));
}

const findPost = (slug: string): Post | undefined =>
  visiblePosts().find((post) => post.slug === slug);

export async function generateMetadata({
  params,
}: PageProps<"/blog/[slug]">): Promise<Metadata> {
  const post = findPost((await params).slug);
  if (!post) return {};
  const url = absoluteUrl(postPath(post.slug));
  const image = {
    url: `${postPath(post.slug)}/opengraph-image`,
    ...SOCIAL_IMAGE_SIZE,
    alt: post.title,
  };
  return {
    title: post.title,
    description: post.description,
    keywords: [post.primaryKeyword, ...post.secondaryKeywords],
    alternates: { canonical: url },
    openGraph: {
      title: post.title,
      description: post.description,
      url,
      siteName: SITE_NAME,
      type: "article",
      publishedTime: new Date(post.publishedAt).toISOString(),
      modifiedTime: lastChanged(post).toISOString(),
      authors: [post.author],
      tags: post.tags,
      images: [image],
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.description,
      images: [image],
    },
  };
}

/** Posts that share the most tags with this one, newest first among equals. */
function relatedTo(post: Post, posts: Post[]): Post[] {
  const shared = (other: Post) =>
    other.tags.filter((tag) => post.tags.includes(tag)).length;
  return posts
    .filter((other) => other.slug !== post.slug)
    .sort((a, b) => shared(b) - shared(a))
    .slice(0, RELATED_POSTS);
}

export default async function BlogPost({ params }: PageProps<"/blog/[slug]">) {
  const { slug } = await params;
  const post = findPost(slug);
  if (!post) notFound();

  const { html, toc } = renderMarkdown(post.body);
  const url = absoluteUrl(postPath(post.slug));
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.description,
    url,
    mainEntityOfPage: url,
    datePublished: new Date(post.publishedAt).toISOString(),
    dateModified: lastChanged(post).toISOString(),
    keywords: [post.primaryKeyword, ...post.secondaryKeywords].join(", "),
    author: { "@type": "Organization", name: post.author, url: SITE_URL },
    publisher: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
  };

  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12 md:py-16">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
          }}
        />
        <article>
          <p className="text-sm">
            <Link
              href={BLOG_PATH}
              className="text-stone-600 underline underline-offset-4 dark:text-stone-400"
            >
              Blog
            </Link>
          </p>
          <h1 className="mt-4 text-4xl leading-tight font-semibold tracking-tight">
            {post.title}
          </h1>
          <div className="mt-4">
            <PostDate post={post} />
          </div>

          {toc.length >= TOC_MIN_SECTIONS ? (
            <nav
              aria-label="On this page"
              className="mt-8 rounded-2xl border border-stone-200 bg-white p-6 text-sm dark:border-stone-800 dark:bg-stone-950"
            >
              <p className="font-semibold">On this page</p>
              <ol className="mt-3 space-y-2">
                {toc.map((entry) => (
                  <li key={entry.id}>
                    <a
                      href={`#${entry.id}`}
                      className="text-stone-600 hover:underline dark:text-stone-400"
                    >
                      {entry.text}
                    </a>
                  </li>
                ))}
              </ol>
            </nav>
          ) : null}

          <div className="post-body mt-8" dangerouslySetInnerHTML={{ __html: html }} />
          <PostTags post={post} />
        </article>

        <section className="mt-12 rounded-2xl border border-stone-200 bg-white p-6 dark:border-stone-800 dark:bg-stone-950">
          <h2 className="text-xl font-semibold tracking-tight">
            Find the time everyone is free, right from Slack
          </h2>
          <p className="mt-2 text-sm leading-6 text-stone-600 dark:text-stone-400">
            Run /meet in a channel, let everyone mark when they are free, and pick the
            time most people can make.
          </p>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <a
              href={SLACK_INSTALL_URL}
              className="bg-accent hover:bg-accent-hover inline-flex h-12 items-center justify-center rounded-full px-6 font-medium text-white transition-colors dark:text-stone-950"
            >
              Add to Slack
            </a>
            <a
              href={SELF_HOST_URL}
              className="inline-flex h-12 items-center justify-center rounded-full border border-stone-300 px-6 font-medium transition-colors hover:bg-stone-100 dark:border-stone-700 dark:hover:bg-stone-900"
            >
              Self-host it
            </a>
          </div>
        </section>

        <section className="mt-12">
          <h2 className="text-xl font-semibold tracking-tight">Related posts</h2>
          <ul className="mt-4 space-y-3">
            {relatedTo(post, visiblePosts()).map((other) => (
              <li key={other.slug}>
                <Link
                  href={postPath(other.slug)}
                  className="font-medium underline underline-offset-4"
                >
                  {other.title}
                </Link>
                <p className="mt-1 text-sm leading-6 text-stone-600 dark:text-stone-400">
                  {other.description}
                </p>
              </li>
            ))}
          </ul>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
