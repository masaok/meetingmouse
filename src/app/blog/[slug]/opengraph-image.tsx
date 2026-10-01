import { notFound } from "next/navigation";

import { visiblePosts } from "@/blog/posts";
import { socialImage } from "@/components/social-image";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export const dynamicParams = false;

export function generateStaticParams(): { slug: string }[] {
  return visiblePosts().map((post) => ({ slug: post.slug }));
}

/** A post's social preview: its title in place of the site headline, drawn at build time. */
export default async function PostOpengraphImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = visiblePosts().find((candidate) => candidate.slug === slug);
  if (!post) notFound();
  return socialImage({ headline: post.title, footer: "meetingmouse.net/blog" });
}
