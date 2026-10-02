import Link from "next/link";

import { BLOG_PATH, FEED_PATH } from "@/blog/paths";
import { AddToSlackButton } from "@/components/add-to-slack";
import { Logo } from "@/components/brand";
import { SUPPORT_EMAIL } from "@/lib/hosted";
import { POLICIES, type Policy } from "@/lib/policies";
import {
  INSTALLATION_PATH,
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
        <AddToSlackButton />
      </nav>
    </header>
  );
}

interface FooterLink {
  label: string;
  href: string;
}

const FOOTER_LINK =
  "hover:text-foreground underline-offset-4 [overflow-wrap:anywhere] hover:underline";
/** For the support address, which reads wrong when it breaks across lines. */
const FOOTER_LINK_NOWRAP =
  "hover:text-foreground underline-offset-4 whitespace-nowrap hover:underline";

/** A page of this site. The feed is a file and a section link is an anchor: both get a plain link. */
const isPage = (href: string): boolean =>
  href.startsWith("/") && !href.startsWith("/#") && href !== FEED_PATH;

function FooterColumn({ title, links }: { title: string; links: FooterLink[] }) {
  return (
    <nav aria-label={title}>
      <h2 className="text-foreground text-xs font-semibold tracking-wider uppercase">
        {title}
      </h2>
      <ul className="mt-3 space-y-2">
        {links.map(({ label, href }) => (
          <li key={href}>
            {isPage(href) ? (
              <Link href={href} className={FOOTER_LINK}>
                {label}
              </Link>
            ) : (
              <a href={href} className={FOOTER_LINK}>
                {label}
              </a>
            )}
          </li>
        ))}
      </ul>
    </nav>
  );
}

const policyLinks = (group: Policy["group"]): FooterLink[] =>
  POLICIES.filter((policy) => policy.group === group).map((policy) => ({
    label: policy.label,
    href: policy.path,
  }));

/** The footer every page shares: every public address of the site and the project, by column. */
export function SiteFooter({ home = false }: { home?: boolean }) {
  const section = (id: string) => (home ? `#${id}` : `/#${id}`);
  return (
    <footer className="mt-8 border-t border-stone-200 text-sm text-stone-600 dark:border-stone-800 dark:text-stone-400">
      {/* Four link columns of four or five links each. The address sits under the tagline, on one line. */}
      <div className="mx-auto grid w-full max-w-6xl grid-cols-2 gap-8 px-6 py-12 md:grid-cols-4 lg:grid-cols-[2fr_1fr_1fr_1fr_1.3fr]">
        <div className="col-span-2 md:col-span-4 lg:col-span-1">
          <Link href="/" aria-label="Meeting Mouse home">
            <Logo />
          </Link>
          <p className="mt-3 max-w-xs">
            Find the time everyone is free, right from Slack. Free and open source.
          </p>
          <p className="mt-3">
            <a href={`mailto:${SUPPORT_EMAIL}`} className={FOOTER_LINK_NOWRAP}>
              {SUPPORT_EMAIL}
            </a>
          </p>
        </div>
        <FooterColumn
          title="Product"
          links={[
            { label: "How it works", href: section("how") },
            { label: "Features", href: section("features") },
            { label: "Installation", href: INSTALLATION_PATH },
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
            { label: "GitHub", href: REPO_URL },
          ]}
        />
        <FooterColumn
          title="Legal"
          links={[
            { label: "All legal pages", href: LEGAL_PATH },
            { label: "Privacy policy", href: PRIVACY_PATH },
            ...policyLinks("legal"),
            { label: "MIT license", href: LICENSE_URL },
          ]}
        />
        <FooterColumn title="Data and security" links={policyLinks("data")} />
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
