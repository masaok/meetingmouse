import type { Metadata } from "next";
import Link from "next/link";

import { SOCIAL_IMAGE } from "@/app/opengraph-image";
import { absoluteUrl } from "@/blog/paths";
import { DocPage } from "@/components/doc-page";
import { POLICIES_UPDATED } from "@/lib/hosted";
import { POLICIES } from "@/lib/policies";
import { LEGAL_PATH, LICENSE_URL, PRIVACY_PATH, SITE_NAME } from "@/lib/site";

const TITLE = "Legal | Meeting Mouse";
const DESCRIPTION =
  "Every legal page for the hosted Meeting Mouse app: the privacy policy, the terms of service, the data policies and the vulnerability disclosure program.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: absoluteUrl(LEGAL_PATH) },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: absoluteUrl(LEGAL_PATH),
    siteName: SITE_NAME,
    type: "website",
    images: [SOCIAL_IMAGE],
  },
  twitter: { card: "summary_large_image", images: [SOCIAL_IMAGE] },
};

const PRIVACY = {
  path: PRIVACY_PATH,
  title: "Privacy policy",
  summary: "What the hosted Meeting Mouse app stores, why, and for how long.",
};

/** One place that lists every legal page, each of which is its own address. */
export default function Legal() {
  return (
    <DocPage title="Legal">
      <p>
        These pages cover the hosted Meeting Mouse app for Slack. Each one is a separate
        page with its own address. Last updated: {POLICIES_UPDATED}.
      </p>
      <ul>
        {[PRIVACY, ...POLICIES].map((page) => (
          <li key={page.path}>
            <Link href={page.path}>{page.title}</Link>. {page.summary}
          </li>
        ))}
        <li>
          <a href={LICENSE_URL}>MIT license</a>. The license of the open-source code, for
          anyone who runs their own copy.
        </li>
      </ul>
    </DocPage>
  );
}
