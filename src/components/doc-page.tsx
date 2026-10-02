import type { ReactNode } from "react";

import { SiteFooter, SiteHeader } from "@/components/site";

/** A page of prose in the site's frame: the privacy policy and the support page. */
export function DocPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12 md:py-16">
        <h1 className="text-4xl leading-tight font-semibold tracking-tight">{title}</h1>
        <div className="post-body mt-8">{children}</div>
      </main>
      <SiteFooter />
    </div>
  );
}
