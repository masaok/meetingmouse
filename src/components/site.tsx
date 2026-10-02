import Link from "next/link";

import { BLOG_PATH } from "@/blog/paths";
import { Logo } from "@/components/brand";
import { PRIVACY_URL, SLACK_INSTALL_URL, SUPPORT_URL } from "@/lib/site";

const NAV_LINK = "hover:text-foreground text-stone-600 dark:text-stone-400";

/** The header every page shares. On the homepage the section links stay on the page. */
export function SiteHeader({ home = false }: { home?: boolean }) {
  const section = (id: string) => (home ? `#${id}` : `/#${id}`);
  return (
    <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5">
      <Link href="/" aria-label="Meeting Mouse home">
        <Logo />
      </Link>
      <nav className="flex items-center gap-4 text-sm sm:gap-6">
        <a href={section("how")} className={`${NAV_LINK} hidden sm:inline`}>
          How it works
        </a>
        <a href={section("features")} className={`${NAV_LINK} hidden sm:inline`}>
          Features
        </a>
        <Link href={BLOG_PATH} className={NAV_LINK}>
          Blog
        </Link>
        <a
          href={SLACK_INSTALL_URL}
          className="bg-accent hover:bg-accent-hover rounded-full px-4 py-2 font-medium whitespace-nowrap text-white transition-colors dark:text-stone-950"
        >
          Add to Slack
        </a>
      </nav>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-6 py-8 text-sm text-stone-500 sm:flex-row sm:items-center sm:justify-between dark:text-stone-500">
      <p>
        © {new Date().getFullYear()} Meeting Mouse · meetingmouse.net ·{" "}
        <Link href={BLOG_PATH} className="underline underline-offset-4">
          Blog
        </Link>{" "}
        ·{" "}
        <a href={PRIVACY_URL} className="underline underline-offset-4">
          Privacy
        </a>{" "}
        ·{" "}
        <a href={SUPPORT_URL} className="underline underline-offset-4">
          Support
        </a>
      </p>
      <p>Not affiliated with Slack Technologies.</p>
    </footer>
  );
}
