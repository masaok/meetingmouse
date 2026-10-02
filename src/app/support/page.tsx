import type { Metadata } from "next";
import Link from "next/link";

import { SOCIAL_IMAGE } from "@/app/opengraph-image";
import { absoluteUrl } from "@/blog/paths";
import { DocPage } from "@/components/doc-page";
import { FREE_PLAN_OPEN_POLLS, SUPPORT_EMAIL, SUPPORT_REPLY_DAYS } from "@/lib/hosted";
import { PRIVACY_PATH, SITE_NAME, SLACK_INSTALL_URL, SUPPORT_PATH } from "@/lib/site";

import manifest from "../../../manifest.json";

const TITLE = "Support | Meeting Mouse";
const DESCRIPTION =
  "How to use the hosted Meeting Mouse app for Slack, and how to reach us.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: absoluteUrl(SUPPORT_PATH) },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: absoluteUrl(SUPPORT_PATH),
    siteName: SITE_NAME,
    type: "website",
    images: [SOCIAL_IMAGE],
  },
  twitter: { card: "summary_large_image", images: [SOCIAL_IMAGE] },
};

const [COMMAND, ...ALIASES] = manifest.features.slash_commands.map((c) => c.command);
const SHORTCUT = manifest.features.shortcuts[0].name;

export default function Support() {
  return (
    <DocPage title="Support">
      <h2>Contact</h2>
      <p>
        Write to <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>. You need no
        account. We reply within {SUPPORT_REPLY_DAYS} business days. It helps to name your
        Slack workspace and say what you did and what you saw.
      </p>

      <h2>Add Meeting Mouse to a workspace</h2>
      <p>
        Open <a href={SLACK_INSTALL_URL}>Add to Slack</a>, choose the workspace and click
        Allow. The page that follows confirms the install. If your workspace requires
        approval for apps, Slack sends the request to an admin first.
      </p>

      <h2>Start a poll</h2>
      <ol>
        <li>
          In the channel where the poll should appear, run <code>{COMMAND}</code> followed
          by a title, for example <code>{COMMAND} Sprint planning</code>.
          {ALIASES.map((alias) => (
            <span key={alias}>
              {" "}
              <code>{alias}</code> does the same.
            </span>
          ))}{" "}
          You can also use the shortcut <em>{SHORTCUT}</em> and pick the channel in the
          form.
        </li>
        <li>Pick the dates, the hours of the day and the slot length, then submit.</li>
        <li>
          Meeting Mouse posts one message. Each person clicks <em>Add my availability</em>{" "}
          and marks the times that work, shown in their own time zone.
        </li>
        <li>
          The organizer picks the final time from the menu on the message. A reply in the
          thread announces it.
        </li>
      </ol>

      <h2>Common questions</h2>
      <h3>The poll did not appear in a private channel</h3>
      <p>
        The app can post in a private channel only after it was invited. Run{" "}
        <code>/invite @Meeting Mouse</code> in that channel, then start the poll again.
      </p>
      <h3>It says the poll limit is reached</h3>
      <p>
        A workspace can have {FREE_PLAN_OPEN_POLLS} polls open at once. Close or delete
        one from the menu on its message, then start the new one. Closed polls do not
        count.
      </p>
      <h3>
        <code>{COMMAND}</code> opens a different app
      </h3>
      <p>
        Another app in your workspace uses the same command.
        {ALIASES.length > 0 && (
          <>
            {" "}
            Use <code>{ALIASES[0]}</code>, which opens the same form.
          </>
        )}
      </p>
      <h3>Who can close or delete a poll</h3>
      <p>Only the person who started it, from the menu on the poll&apos;s message.</p>
      <h3>What does it cost</h3>
      <p>Meeting Mouse is free.</p>

      <h2>Remove the app</h2>
      <p>
        A workspace admin opens Slack&apos;s app management page for the workspace,
        selects Meeting Mouse and chooses <em>Remove App</em>. Everything Meeting Mouse
        stored for the workspace is deleted at once. Poll messages already posted stay in
        their channels until someone deletes them in Slack.
      </p>

      <h2>Ask for your data or have it deleted</h2>
      <p>
        Write to <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> and name your
        Slack workspace. The <Link href={PRIVACY_PATH}>privacy policy</Link> says what is
        stored and for how long.
      </p>
    </DocPage>
  );
}
