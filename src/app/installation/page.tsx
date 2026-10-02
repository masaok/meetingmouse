import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Fragment } from "react";

import { SOCIAL_IMAGE } from "@/app/opengraph-image";
import { absoluteUrl } from "@/blog/paths";
import { DocPage } from "@/components/doc-page";
import { INSTALL_STEPS, PERMISSION_REASONS } from "@/lib/installation";
import {
  INSTALLATION_PATH,
  PRIVACY_PATH,
  SITE_NAME,
  SLACK_INSTALL_URL,
  SUPPORT_PATH,
} from "@/lib/site";

import manifest from "../../../manifest.json";

const TITLE = "Installation | Meeting Mouse";
const DESCRIPTION =
  "How to add Meeting Mouse to a Slack workspace, step by step with screenshots, and what each permission is for.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: absoluteUrl(INSTALLATION_PATH) },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: absoluteUrl(INSTALLATION_PATH),
    siteName: SITE_NAME,
    type: "website",
    images: [SOCIAL_IMAGE],
  },
  twitter: { card: "summary_large_image", images: [SOCIAL_IMAGE] },
};

const SCOPES = manifest.oauth_config.scopes.bot;
const [COMMAND] = manifest.features.slash_commands.map((c) => c.command);

/** Adding the hosted app to a workspace, one screenshot per step. */
export default function Installation() {
  return (
    <DocPage title="Installation">
      <p>
        Adding Meeting Mouse to a Slack workspace takes about a minute and{" "}
        {INSTALL_STEPS.length} steps. It is free, and you need no account with us.{" "}
        <a href={SLACK_INSTALL_URL}>Add to Slack</a> starts it.
      </p>

      {INSTALL_STEPS.map((step, i) => (
        <Fragment key={step.title}>
          <h2>
            {i + 1}. {step.title}
          </h2>
          <p>{step.body}</p>
          {step.image && (
            <Image
              src={`/install/${step.image.file}`}
              alt={step.image.alt}
              width={step.image.width}
              height={step.image.height}
              sizes="(min-width: 768px) 42rem, 100vw"
              className="rounded-lg border border-stone-200 dark:border-stone-800"
            />
          )}
        </Fragment>
      ))}

      <h2>What Slack asks you to allow</h2>
      <p>
        Slack&apos;s page in step 3 lists these {SCOPES.length} permissions. Meeting Mouse
        asks for nothing else, and it cannot read your messages, files or channel member
        lists.
      </p>
      <ul>
        {SCOPES.map((scope) => (
          <li key={scope}>
            <code>{scope}</code>: {PERMISSION_REASONS[scope]}
          </li>
        ))}
      </ul>

      <h2>After installing</h2>
      <p>
        In a channel, run <code>{COMMAND} Sprint planning</code> to start your first poll.
        The <Link href={SUPPORT_PATH}>support page</Link> walks through the rest, and the{" "}
        <Link href={PRIVACY_PATH}>privacy policy</Link> says what the app stores.
      </p>

      <h2>Removing the app</h2>
      <p>
        A workspace admin can remove Meeting Mouse at any time from the workspace&apos;s
        app management page in Slack. Everything the app stored for the workspace is
        deleted at once.
      </p>
    </DocPage>
  );
}
