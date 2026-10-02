import type { Metadata } from "next";
import Link from "next/link";
import { Fragment, type ReactNode } from "react";

import { SOCIAL_IMAGE } from "@/app/opengraph-image";
import { absoluteUrl } from "@/blog/paths";
import { DocPage } from "@/components/doc-page";
import { POLICIES_UPDATED } from "@/lib/hosted";
import { POLICIES, type Policy, type PolicyBlock } from "@/lib/policies";
import { PRIVACY_PATH, SITE_NAME } from "@/lib/site";

export function policyMetadata(policy: Policy): Metadata {
  const title = `${policy.title} | ${SITE_NAME}`;
  return {
    title,
    description: policy.summary,
    alternates: { canonical: absoluteUrl(policy.path) },
    openGraph: {
      title,
      description: policy.summary,
      url: absoluteUrl(policy.path),
      siteName: SITE_NAME,
      type: "website",
      images: [SOCIAL_IMAGE],
    },
    twitter: { card: "summary_large_image", images: [SOCIAL_IMAGE] },
  };
}

const LINKABLE = /([\w.+-]+@[\w-]+(?:\.[\w-]+)+|https:\/\/[^\s,]+[^\s,.:])/;

/** Plain text, with any email address or https address in it turned into a link. */
function Text({ children }: { children: string }): ReactNode {
  return children.split(LINKABLE).map((part, i) =>
    i % 2 === 0 ? (
      part
    ) : (
      <a key={i} href={part.includes("@") ? `mailto:${part}` : part}>
        {part}
      </a>
    ),
  );
}

function Block({ block }: { block: PolicyBlock }) {
  if (block.kind === "p")
    return (
      <p>
        <Text>{block.text}</Text>
      </p>
    );
  if (block.kind === "list")
    return (
      <ul>
        {block.items.map((item) => (
          <li key={item}>
            <Text>{item}</Text>
          </li>
        ))}
      </ul>
    );
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[32rem] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-stone-300 dark:border-stone-700">
            {block.head.map((cell) => (
              <th key={cell} scope="col" className="py-2 pr-4 font-semibold">
                {cell}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {block.rows.map((row) => (
            <tr
              key={row[0]}
              className="border-b border-stone-200 align-top dark:border-stone-800"
            >
              {row.map((cell, i) => (
                <td key={i} className="py-2 pr-4">
                  <Text>{cell}</Text>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** One of the terms and data policy pages, drawn from `src/lib/policies.ts`. */
export function PolicyPage({ policy }: { policy: Policy }) {
  return (
    <DocPage title={policy.title}>
      <p>Last updated: {POLICIES_UPDATED}.</p>
      {policy.sections.map((section) => (
        // A fragment, not a wrapper: `.post-body` spaces its direct children.
        <Fragment key={section.heading}>
          <h2>{section.heading}</h2>
          {section.blocks.map((block, i) => (
            <Block key={i} block={block} />
          ))}
        </Fragment>
      ))}

      <h2>Related pages</h2>
      <ul>
        <li>
          <Link href={PRIVACY_PATH}>Privacy policy</Link>
        </li>
        {POLICIES.filter((other) => other.path !== policy.path).map((other) => (
          <li key={other.path}>
            <Link href={other.path}>{other.title}</Link>
          </li>
        ))}
      </ul>
    </DocPage>
  );
}
