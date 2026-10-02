"use client";

import { useEffect, useState } from "react";

import type { TocEntry } from "@/blog/markdown";

/** A heading counts as reached once its top is this close to the top of the window. */
const ACTIVE_LINE_PX = 120;

/**
 * A post's table of contents: a box above the body on a phone, a sticky sidebar from `lg` up.
 * The entries are plain links, so they work before this script runs. The script only marks
 * the section being read.
 */
export function PostToc({ toc }: { toc: TocEntry[] }) {
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    const update = () => {
      let current: string | null = null;
      for (const { id } of toc) {
        const heading = document.getElementById(id);
        if (heading && heading.getBoundingClientRect().top <= ACTIVE_LINE_PX)
          current = id;
      }
      setActive(current);
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [toc]);

  return (
    <nav
      aria-label="On this page"
      className="mt-8 rounded-2xl border border-stone-200 bg-white p-5 text-sm lg:sticky lg:top-6 lg:mt-0 lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto lg:rounded-none lg:border-0 lg:border-l lg:bg-transparent lg:py-1 lg:pr-0 lg:pl-4 dark:border-stone-800 dark:bg-stone-950 lg:dark:bg-transparent"
    >
      <p className="font-semibold">On this page</p>
      <ol className="mt-2 space-y-1.5 leading-5">
        {toc.map((entry) => (
          <li key={entry.id}>
            <a
              href={`#${entry.id}`}
              aria-current={active === entry.id ? "location" : undefined}
              className="aria-[current]:text-accent text-stone-600 hover:underline aria-[current]:font-medium dark:text-stone-400"
            >
              {entry.text}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
