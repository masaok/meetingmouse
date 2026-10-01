import type { Post } from "@/blog/schema";

const DATE = new Intl.DateTimeFormat("en-US", { dateStyle: "long", timeZone: "UTC" });

export function PostDate({ post }: { post: Post }) {
  return (
    <p className="text-xs font-medium text-stone-500 dark:text-stone-400">
      <time dateTime={post.publishedAt}>{DATE.format(new Date(post.publishedAt))}</time>
      {post.draft ? " · Draft" : null}
    </p>
  );
}

export function PostTags({ post }: { post: Post }) {
  return (
    <ul className="mt-4 flex flex-wrap gap-2">
      {post.tags.map((tag) => (
        <li
          key={tag}
          className="rounded-full border border-stone-200 px-3 py-1 text-xs font-medium text-stone-600 dark:border-stone-800 dark:text-stone-400"
        >
          {tag}
        </li>
      ))}
    </ul>
  );
}
