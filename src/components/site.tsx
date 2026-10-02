import Link from "next/link";

import { BLOG_PATH, FEED_PATH } from "@/blog/paths";
import { Logo } from "@/components/brand";
import { SUPPORT_EMAIL } from "@/lib/hosted";
import { POLICIES } from "@/lib/policies";
import {
  LEGAL_PATH,
  LICENSE_URL,
  PRIVACY_PATH,
  REPO_URL,
  SELF_HOST_URL,
  SLACK_INSTALL_URL,
  SUPPORT_PATH,
} from "@/lib/site";

const NAV_LINK = "hover:text-foreground text-stone-600 dark:text-stone-400";

/** The header every page shares. On the homepage the section links stay on the page. */
export function SiteHeader({ home = false }: { home?: boolean }) {
  const section = (id: string) => (home ? `#${id}` : `/#${id}`);
  return (
    <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5">
      <Link href="/" aria-label="Meeting Mouse home">
        <Logo />
      </Link>
      <nav aria-label="Main" className="flex items-center gap-4 text-sm sm:gap-6">
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

interface FooterLink {
  label: string;
  href: string;
  /** Keep the label on one line. For an address, which reads wrong when it breaks. */
  nowrap?: boolean;
}

const FOOTER_LINK =
  "hover:text-foreground underline-offset-4 [overflow-wrap:anywhere] hover:underline";
const FOOTER_LINK_NOWRAP =
  "hover:text-foreground underline-offset-4 whitespace-nowrap hover:underline";

/** A page of this site. The feed is a file and a section link is an anchor: both get a plain link. */
const isPage = (href: string): boolean =>
  href.startsWith("/") && !href.startsWith("/#") && href !== FEED_PATH;

function FooterColumn({
  title,
  links,
  className,
}: {
  title: string;
  links: FooterLink[];
  className?: string;
}) {
  return (
    <nav aria-label={title} className={className}>
      <h2 className="text-foreground text-xs font-semibold tracking-wider uppercase">
        {title}
      </h2>
      <ul className="mt-3 space-y-2">
        {links.map(({ label, href, nowrap }) => (
          <li key={href}>
            {isPage(href) ? (
              <Link href={href} className={FOOTER_LINK}>
                {label}
              </Link>
            ) : (
              <a href={href} className={nowrap ? FOOTER_LINK_NOWRAP : FOOTER_LINK}>
                {label}
              </a>
            )}
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** The footer every page shares: every public address of the site and the project, by column. */
export function SiteFooter({ home = false }: { home?: boolean }) {
  const section = (id: string) => (home ? `#${id}` : `/#${id}`);
  return (
    <footer className="mt-8 border-t border-stone-200 text-sm text-stone-600 dark:border-stone-800 dark:text-stone-400">
      {/* The Contact column is the widest of the four so the support address fits on one line. */}
      <div className="mx-auto grid w-full max-w-6xl grid-cols-2 gap-8 px-6 py-12 md:grid-cols-[1fr_1fr_1.3fr_1.6fr] lg:grid-cols-[2fr_1fr_1fr_1.3fr_1.6fr]">
        <div className="col-span-2 md:col-span-4 lg:col-span-1">
          <Link href="/" aria-label="Meeting Mouse home">
            <Logo />
          </Link>
          <p className="mt-3 max-w-xs">
            Find the time everyone is free, right from Slack. Free and open source.
          </p>
        </div>
        <FooterColumn
          title="Product"
          links={[
            { label: "How it works", href: section("how") },
            { label: "Features", href: section("features") },
            { label: "Add to Slack", href: SLACK_INSTALL_URL },
          ]}
        />
        <FooterColumn
          title="Resources"
          links={[
            { label: "Blog", href: BLOG_PATH },
            { label: "RSS feed", href: FEED_PATH },
            { label: "Support", href: SUPPORT_PATH },
            { label: "Run it yourself", href: SELF_HOST_URL },
          ]}
        />
        <FooterColumn
          title="Legal"
          links={[
            { label: "All legal pages", href: LEGAL_PATH },
            { label: "Privacy policy", href: PRIVACY_PATH },
            ...POLICIES.map((policy) => ({ label: policy.label, href: policy.path })),
            { label: "MIT license", href: LICENSE_URL },
          ]}
        />
        <FooterColumn
          title="Contact"
          className="col-span-2 md:col-span-1"
          links={[
            { label: SUPPORT_EMAIL, href: `mailto:${SUPPORT_EMAIL}`, nowrap: true },
            { label: "GitHub", href: REPO_URL },
          ]}
        />
      </div>
      <div className="border-t border-stone-200 dark:border-stone-800">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-1 px-6 py-5 text-xs text-stone-500 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Meeting Mouse · meetingmouse.net</p>
          <p>Not affiliated with Slack Technologies.</p>
        </div>
      </div>
    </footer>
  );
}
