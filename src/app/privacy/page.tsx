import type { Metadata } from "next";
import Link from "next/link";

import { SOCIAL_IMAGE } from "@/app/opengraph-image";
import { absoluteUrl } from "@/blog/paths";
import { DocPage } from "@/components/doc-page";
import {
  PRIVACY_UPDATED,
  RETENTION_MONTHS,
  STORED_DATA,
  SUPPORT_EMAIL,
} from "@/lib/hosted";
import { PRIVACY_PATH, SITE_NAME, SUPPORT_PATH } from "@/lib/site";

const TITLE = "Privacy policy | Meeting Mouse";
const DESCRIPTION = "What the hosted Meeting Mouse app stores, why, and for how long.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: absoluteUrl(PRIVACY_PATH) },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: absoluteUrl(PRIVACY_PATH),
    siteName: SITE_NAME,
    type: "website",
    images: [SOCIAL_IMAGE],
  },
  twitter: { card: "summary_large_image", images: [SOCIAL_IMAGE] },
};

/** The policy for the hosted app. `src/lib/hosted.ts` holds the facts it states. */
export default function Privacy() {
  return (
    <DocPage title="Privacy policy">
      <p>Last updated: {PRIVACY_UPDATED}.</p>
      <p>
        This policy covers the hosted Meeting Mouse app for Slack, the one you add from
        meetingmouse.net and that runs at app.meetingmouse.net. Meeting Mouse is also
        open-source software. If someone else runs their own copy, they decide what
        happens to its data, and this policy does not apply to it.
      </p>

      <h2>What we store</h2>
      <p>
        Meeting Mouse stores what it needs to run availability polls in your workspace,
        and nothing else. This is all of it.
      </p>
      {STORED_DATA.map((group) => (
        <section key={group.title}>
          <h3>{group.title}</h3>
          <p>{group.why}</p>
          <div className="table-scroll">
            <table>
              <tbody>
                {group.columns.map((c) => (
                  <tr key={`${c.table}.${c.column}`}>
                    <td>{c.what}</td>
                    <td>
                      <code>
                        {c.table}.{c.column}
                      </code>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}

      <h2>What we do not store</h2>
      <ul>
        <li>
          Messages, files, channel names and channel member lists. The app cannot read
          them.
        </li>
        <li>
          Email addresses, phone numbers, profile pictures and any profile field other
          than your display name and time zone. When you have no display name, your Slack
          name is used in its place.
        </li>
        <li>Calendar data. The app does not connect to a calendar.</li>
        <li>
          The rest of what Slack sends with each click or command. It is used to answer
          that request and is not kept.
        </li>
      </ul>
      <p>
        Our hosting provider records each web request in a log, such as the time, the
        address requested, the response status and the IP address. Our own log lines hold
        a workspace id when a workspace removes the app, and counts of what the retention
        job deleted. These logs expire on the provider&apos;s schedule.
      </p>

      <h2>How we use it</h2>
      <p>
        Only to run the app: to post a poll, show each person the times in their own time
        zone, show the group who is free when, and announce the final time. We do not sell
        this data, share it with anyone for their own use, use it for advertising, or use
        it to train or improve any AI or machine-learning model. The app has no analytics
        and no tracking.
      </p>

      <h2>Who handles it for us</h2>
      <ul>
        <li>Vercel hosts the app.</li>
        <li>Neon hosts the database.</li>
        <li>
          Slack delivers your commands and clicks to the app, and shows the poll messages
          the app posts.
        </li>
      </ul>
      <p>No one else receives the data.</p>

      <h2>How long we keep it</h2>
      <ul>
        <li>
          A poll, with its times and everyone&apos;s answers, is deleted{" "}
          {RETENTION_MONTHS} months after it is closed or its final time is picked.
        </li>
        <li>
          A poll that nobody closed is deleted {RETENTION_MONTHS} months after the last
          time it offered.
        </li>
        <li>
          The copy of your display name and time zone is deleted {RETENTION_MONTHS} months
          after the app last read them from Slack. It reads them again each week you use
          the app.
        </li>
        <li>
          A poll&apos;s organizer can delete it at any time from the menu on its message.
          That removes the poll and every answer on it at once.
        </li>
        <li>
          When a workspace removes the app, everything stored for that workspace is
          deleted at once: its polls, the answers, the copies of names and time zones, and
          the access token.
        </li>
      </ul>
      <p>
        Two things are outside our reach. A poll message that was already posted stays in
        your Slack channel until someone in the workspace deletes it there. Database
        backups and request logs kept by our hosting providers expire on those
        providers&apos; schedules.
      </p>

      <h2>Cookies and links</h2>
      <p>
        The app sets one cookie, for ten minutes, while you add it to a workspace. It
        protects the install from being hijacked and is not used to track you. The page
        where you mark your availability in a browser sets no cookie. The link to that
        page is personal: it opens one poll as you, so do not forward it.
      </p>

      <h2>How we protect it</h2>
      <p>
        Every connection uses TLS. Every request from Slack is checked against
        Slack&apos;s signature before the app acts on it. Each workspace&apos;s access
        token is encrypted with AES-256-GCM before it is stored.
      </p>

      <h2>Your choices</h2>
      <p>
        You can ask for a copy of the data stored about you, for a correction, or for
        deletion. Write to <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> and
        name your Slack workspace and your name in it. We answer within 30 days. A
        deletion request removes your answers on every poll in that workspace and the copy
        of your name and time zone. A poll you organized holds other people&apos;s answers
        too, so you delete it yourself from the menu on its message.
      </p>
      <p>
        An admin can remove the app from the workspace at any time in Slack, which deletes
        everything as described above. The <Link href={SUPPORT_PATH}>support page</Link>{" "}
        says how.
      </p>

      <h2>Changes</h2>
      <p>When this policy changes, the new text is posted here with a new date.</p>

      <h2>Contact</h2>
      <p>
        <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
      </p>
    </DocPage>
  );
}
