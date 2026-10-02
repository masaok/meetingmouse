import {
  DELETION_REQUEST_DAYS,
  DISCLOSURE_ACK_DAYS,
  FREE_PLAN_OPEN_POLLS,
  GRID_LINK_HOURS,
  INSTALL_COOKIE_MINUTES,
  RESTORE_HISTORY_MAX_DAYS,
  RETENTION_MONTHS,
  SUPPORT_EMAIL,
  SUPPORT_REPLY_DAYS,
} from "./hosted";
import { REPO_URL } from "./site";

/**
 * The terms and the data policies of the hosted service, as data: one list feeds the pages, the
 * footer, the sitemap and the links a blog post may use. Every number comes from `hosted.ts`.
 */
export type PolicyBlock =
  | { kind: "p"; text: string }
  | { kind: "list"; items: string[] }
  | { kind: "table"; head: string[]; rows: string[][] };

export interface PolicySection {
  heading: string;
  blocks: PolicyBlock[];
}

export interface Policy {
  path: string;
  title: string;
  /** The short name used in the footer. */
  label: string;
  /** The footer column it is listed in. */
  group: "legal" | "data";
  /** One line for the meta description. */
  summary: string;
  sections: PolicySection[];
}

/** The studio that runs the hosted service. */
export const OPERATOR = "Expedition Labs";

const p = (text: string): PolicyBlock => ({ kind: "p", text });
const list = (...items: string[]): PolicyBlock => ({ kind: "list", items });
const table = (head: string[], rows: string[][]): PolicyBlock => ({
  kind: "table",
  head,
  rows,
});

const SCOPE =
  "This page covers the hosted Meeting Mouse app for Slack, the one you add from meetingmouse.net and that runs at app.meetingmouse.net. Meeting Mouse is also open-source software. If someone else runs their own copy, they decide what happens to its data, and this page does not apply to it.";

const RESTORE_HISTORY = `a rolling window of at most ${RESTORE_HISTORY_MAX_DAYS} days`;

const CONTACT_SECTION: PolicySection = {
  heading: "Contact",
  blocks: [
    p(`Write to ${SUPPORT_EMAIL}. We reply within ${SUPPORT_REPLY_DAYS} business days.`),
  ],
};

const terms: Policy = {
  path: "/terms",
  title: "Terms of service",
  label: "Terms of service",
  group: "legal",
  summary: "The terms for using the hosted Meeting Mouse app for Slack and this website.",
  sections: [
    {
      heading: "What these terms cover",
      blocks: [
        p(
          `These terms are an agreement between you and ${OPERATOR}, the software studio in Los Angeles, California that runs Meeting Mouse. They apply when you use the hosted Meeting Mouse app for Slack at app.meetingmouse.net, and when you use this website. By using either one you accept these terms. If you add the app for an organization, you accept them for that organization.`,
        ),
        p(
          "Meeting Mouse is also open-source software. If you run your own copy, the license in its repository governs that copy, you are responsible for it, and these terms do not apply to it.",
        ),
      ],
    },
    {
      heading: "Using Meeting Mouse",
      blocks: [
        p(
          "Meeting Mouse is added to a Slack workspace by someone with permission to install apps there. That person confirms they have the authority to add it for the workspace. Your use of Slack itself stays subject to your agreement with Slack.",
        ),
        p(
          `The hosted app is free while it is in beta. A workspace can have ${FREE_PLAN_OPEN_POLLS} polls open at once. We may change the price or the limits later, and we will post the change on this website before it takes effect.`,
        ),
      ],
    },
    {
      heading: "Acceptable use",
      blocks: [
        p("When you use the app or this website, you agree to the following."),
        list(
          "Use them only in ways the law allows.",
          "Leave their security alone. Do not probe, scan or overload them, and do not try to reach data that belongs to another workspace.",
          "Do not use the app to send spam, malware or content that harasses or harms others.",
          "Do not resell the hosted app or present it as your own.",
        ),
        p(
          "If you find a security problem, report it privately as the vulnerability disclosure program describes, so we can fix it before it is disclosed.",
        ),
      ],
    },
    {
      heading: "Your data",
      blocks: [
        p(
          "What you put into the app stays yours. You give us permission to store and process it for one purpose, which is running the app for your workspace. We do not sell it, use it for advertising, or use it to train any machine-learning model.",
        ),
        p(
          "The privacy policy and the data retention, data archival and removal, and data storage policies say what is kept, where, for how long, and how it is deleted. The data deletion request procedure says how to ask us to delete it. They are part of these terms.",
        ),
      ],
    },
    {
      heading: "This website",
      blocks: [
        p(
          "The website and its blog are free to read. What we publish there is general information, offered without a promise that it suits your situation. Our name, logo and site design remain ours.",
        ),
      ],
    },
    {
      heading: "Availability and changes",
      blocks: [
        p(
          "We work to keep the app running, and we do not guarantee that it will always be available or free of errors. We may change, pause or retire a feature or the hosted app. If we retire the hosted app we will give notice on this website first, and stored data is deleted as the removal policy describes.",
        ),
      ],
    },
    {
      heading: "Ending use",
      blocks: [
        p(
          "You can stop at any time. Removing the app from your Slack workspace ends your use and deletes what the app stored for that workspace. We may suspend or end access for a workspace or a person who breaks these terms or puts the service or other people at risk.",
        ),
      ],
    },
    {
      heading: "Disclaimer",
      blocks: [
        p(
          "The app and this website are provided as they are and as available. To the extent the law allows, we make no warranties about them, whether express or implied, including warranties of merchantability, fitness for a particular purpose and non-infringement.",
        ),
      ],
    },
    {
      heading: "Limit of liability",
      blocks: [
        p(
          `To the extent the law allows, ${OPERATOR} is not liable for indirect, incidental, special, consequential or punitive damages, or for lost profits, revenue or data, that arise from your use of the app or this website. Our total liability for any claim under these terms is limited to the greater of the amount you paid us for the app in the twelve months before the claim, or one hundred US dollars.`,
        ),
        p(
          "Some places do not allow some of these limits. In those places the limits apply only as far as the law permits.",
        ),
      ],
    },
    {
      heading: "Governing law",
      blocks: [
        p(
          "These terms are governed by the laws of the State of California, without regard to its conflict of law rules. Disputes will be brought in the state or federal courts located in Los Angeles County, California, and you and we consent to those courts.",
        ),
      ],
    },
    {
      heading: "Changes to these terms",
      blocks: [
        p(
          "When we change these terms, we post the new text on this page with a new date. If you keep using the app after that date, you accept the new terms.",
        ),
      ],
    },
    CONTACT_SECTION,
  ],
};

const retention: Policy = {
  path: "/data-retention",
  title: "Data retention policy",
  label: "Data retention",
  group: "data",
  summary: "How long the hosted Meeting Mouse app keeps each kind of data.",
  sections: [
    {
      heading: "What this policy covers",
      blocks: [
        p(SCOPE),
        p(
          "The rule behind every period below: we keep data for as long as it is needed to run the app for your workspace, and then we delete it.",
        ),
      ],
    },
    {
      heading: "How long each kind of data is kept",
      blocks: [
        table(
          ["Data", "Kept for"],
          [
            [
              "A poll, with the times it offers and everyone who answered",
              `Until ${RETENTION_MONTHS} months after the poll is closed or its final time is picked`,
            ],
            [
              "A poll that nobody closed",
              `Until ${RETENTION_MONTHS} months after the last time the poll offered`,
            ],
            [
              "The stored copy of a person's display name and time zone",
              `Until ${RETENTION_MONTHS} months after the app last read them from Slack`,
            ],
            [
              "The workspace's installation record and its encrypted access token",
              "Until the workspace removes the app",
            ],
            [
              "The cookie set while the app is being added to a workspace",
              `${INSTALL_COOKIE_MINUTES} minutes`,
            ],
          ],
        ),
        p(
          "Three things end a period early. A poll's organizer can delete the poll at any time, which removes it with every answer on it. A workspace that removes the app has everything stored for it deleted at once. A person can ask us to delete their answers and their stored name and time zone.",
        ),
      ],
    },
    {
      heading: "Records held by our providers",
      blocks: [
        p(
          `Our hosting provider records each web request in a log, with details such as the time, the address requested and the IP address. Our database provider keeps a restore history of the database for ${RESTORE_HISTORY}. Both expire on the provider's schedule, and data we delete leaves the restore history when that window passes.`,
        ),
      ],
    },
    {
      heading: "How the periods are enforced",
      blocks: [
        p(
          "A scheduled job runs once a day and deletes data that has passed its period. Deletion on removing the app happens as soon as Slack tells the app it was removed.",
        ),
      ],
    },
    {
      heading: "Changes",
      blocks: [p("When a period changes, this page is updated and given a new date.")],
    },
    CONTACT_SECTION,
  ],
};

const removal: Policy = {
  path: "/data-archival-removal",
  title: "Data archival and removal policy",
  label: "Data archival and removal",
  group: "data",
  summary:
    "How the hosted Meeting Mouse app removes data, what triggers a removal, and what we do about archives.",
  sections: [
    { heading: "What this policy covers", blocks: [p(SCOPE)] },
    {
      heading: "Archival",
      blocks: [
        p(
          "We do not archive your data. Meeting Mouse keeps its data in one production database until the data is deleted. Nothing is moved to cold storage, exported to another system, or kept in a separate archive after its retention period ends.",
        ),
        p(
          `The only other copies are the ones our providers keep for recovery: the database provider's restore history, which covers ${RESTORE_HISTORY}, and the hosting provider's request logs. We use the restore history only to recover from a failure.`,
        ),
      ],
    },
    {
      heading: "What triggers a removal",
      blocks: [
        table(
          ["Trigger", "What is removed", "When"],
          [
            [
              "A workspace removes Meeting Mouse",
              "Everything stored for that workspace: its polls, the answers, the stored names and time zones, and the access token",
              "At once, when Slack reports the removal",
            ],
            [
              "An organizer deletes a poll",
              "The poll, the times it offered and every answer on it",
              "At once",
            ],
            [
              "A retention period ends",
              "Polls and stored profile copies that are past their period",
              "Within a day, by a scheduled job",
            ],
            [
              "A person asks us to delete their data",
              "That person's answers on every poll in the workspace, and the stored copy of their name and time zone",
              `Within ${DELETION_REQUEST_DAYS} days of the request`,
            ],
          ],
        ),
      ],
    },
    {
      heading: "How data is removed",
      blocks: [
        p(
          "Removal means the rows are deleted from the database. We do not mark data as deleted and keep it. Once a removal runs, the data cannot be restored from the production database.",
        ),
        p(
          `A deleted record can remain in the database provider's restore history until that window passes, at most ${RESTORE_HISTORY_MAX_DAYS} days later. Request logs expire on the hosting provider's schedule.`,
        ),
      ],
    },
    {
      heading: "What we cannot remove",
      blocks: [
        p(
          "A poll message that Meeting Mouse already posted stays in your Slack channel until someone in the workspace deletes it there. Slack holds that message, and Slack's own retention settings apply to it.",
        ),
      ],
    },
    {
      heading: "How to request removal",
      blocks: [
        p(
          `A workspace admin can remove Meeting Mouse from the workspace in Slack, which deletes everything for that workspace without contacting us. To have one person's data removed, write to ${SUPPORT_EMAIL} with the name of the Slack workspace and the person's name in it. The data deletion request procedure lists each step.`,
        ),
      ],
    },
    {
      heading: "If the hosted app is retired",
      blocks: [
        p(
          "If we shut down the hosted app, we give notice on this website first and then delete all stored data for every workspace.",
        ),
      ],
    },
    {
      heading: "Changes",
      blocks: [p("When this policy changes, this page is updated and given a new date.")],
    },
    CONTACT_SECTION,
  ],
};

const storage: Policy = {
  path: "/data-storage",
  title: "Data storage policy",
  label: "Data storage",
  group: "data",
  summary:
    "What data the hosted Meeting Mouse app stores, where it is stored, how it is protected and who can reach it.",
  sections: [
    { heading: "What this policy covers", blocks: [p(SCOPE)] },
    {
      heading: "What is stored",
      blocks: [
        p(
          "Meeting Mouse stores what it needs to run availability polls in a Slack workspace. The privacy policy lists every field.",
        ),
        list(
          "Slack ids for the workspace, the channel a poll was posted in, and the people who organize or answer a poll.",
          "Each poll: its title, the times it offers, its status and its final time.",
          "Each answer: the times a person marked, with that person's display name and time zone.",
          "A stored copy of a person's display name and time zone, so the app does not ask Slack for them on every click.",
          "For each workspace that installed the app: its name, the permissions it granted, the id of the person who installed it, and the app's access token in encrypted form.",
        ),
        p(
          "It does not store messages, files, channel names, channel member lists, email addresses, phone numbers, profile pictures or calendar data.",
        ),
      ],
    },
    {
      heading: "Where it is stored",
      blocks: [
        table(
          ["Provider", "Role", "Location"],
          [
            [
              "Neon",
              "Hosts the one database that holds all of the data",
              "United States",
            ],
            [
              "Vercel",
              "Hosts the app and this website, and keeps request logs",
              "United States",
            ],
            [
              "Slack",
              "Delivers commands and clicks to the app and shows the poll messages it posts",
              "As Slack provides",
            ],
          ],
        ),
        p(
          "No other service or processor receives the data. Nothing is kept on personal devices or in a second database. This website has no database and stores nothing about its visitors beyond the hosting provider's request logs.",
        ),
      ],
    },
    {
      heading: "How it is protected",
      blocks: [
        list(
          "In transit: every connection uses TLS, between Slack and the app, between a browser and the app, and between the app and the database.",
          "At rest: the database provider encrypts stored data with AES-256.",
          "Access tokens: each workspace's Slack access token is encrypted by the app with AES-256-GCM before it is written to the database, under a key held only in the hosting environment. The encrypted value is tied to its workspace, so it cannot be reused for another.",
          "Requests: every request from Slack is checked against Slack's signature before the app acts on it.",
          "Secrets: credentials are held in the hosting provider's environment settings and are never committed to source code.",
        ),
      ],
    },
    {
      heading: "Who can reach it",
      blocks: [
        p(
          "Production access is limited to one person, the owner. There are no shared credentials. The data is used only to run the app. We do not sell it, share it with anyone for their own use, use it for advertising, or use it to train or improve any machine-learning model.",
        ),
      ],
    },
    {
      heading: "Separation between workspaces",
      blocks: [
        p(
          `Every stored record carries the id of the workspace it belongs to, and the app acts in a workspace only with that workspace's own token. A link to the page where a person marks availability in a browser is signed for one person and one poll, expires after ${GRID_LINK_HOURS} hours, and is rejected if the workspace in the link does not match the poll.`,
        ),
      ],
    },
    {
      heading: "Backups",
      blocks: [
        p(
          `We keep no separate backup files. Recovery relies on the database provider's restore history, ${RESTORE_HISTORY} that is stored and encrypted by the provider.`,
        ),
      ],
    },
    {
      heading: "Changes",
      blocks: [
        p(
          "When a provider or a storage practice changes, this page is updated and given a new date.",
        ),
      ],
    },
    CONTACT_SECTION,
  ],
};

const deletionRequests: Policy = {
  path: "/data-deletion-requests",
  title: "Data deletion request procedure",
  label: "Data deletion requests",
  group: "data",
  summary:
    "The steps we follow when someone asks us to delete their Meeting Mouse data, and the ways to delete it without asking.",
  sections: [
    {
      heading: "What this procedure covers",
      blocks: [
        p(SCOPE),
        p(
          "Anyone whose data the app holds can ask for it to be deleted. There is no charge and no form to fill in.",
        ),
      ],
    },
    {
      heading: "Deleting without asking us",
      blocks: [
        p("Two kinds of deletion need no request and take effect at once."),
        list(
          "A workspace admin removes the app from the Slack workspace. Everything stored for that workspace is deleted: its polls, the answers, the stored names and time zones, and the access token.",
          "A poll's organizer chooses Delete poll from the menu on the poll's message. The poll is deleted with every answer on it.",
        ),
      ],
    },
    {
      heading: "How to make a request",
      blocks: [
        p(
          `Write to ${SUPPORT_EMAIL}. Tell us the name of the Slack workspace and your name as it appears there.`,
        ),
      ],
    },
    {
      heading: "What we do with a request",
      blocks: [
        table(
          ["Step", "What happens", "When"],
          [
            [
              "1. Acknowledge",
              "We reply to confirm we have the request and say what will be deleted",
              `Within ${SUPPORT_REPLY_DAYS} business days`,
            ],
            [
              "2. Confirm who is asking",
              "We reply to the address the request came from. If it is unclear that the request comes from the person it names, we ask an admin of that workspace to confirm",
              "Before anything is deleted",
            ],
            [
              "3. Delete",
              "We delete that person's answers on every poll in the workspace and the stored copy of their display name and time zone",
              `Within ${DELETION_REQUEST_DAYS} days of the request`,
            ],
            [
              "4. Confirm",
              "We write back to say the deletion is done",
              "When it is done",
            ],
          ],
        ),
      ],
    },
    {
      heading: "What a request does not delete",
      blocks: [
        list(
          "A poll you organized. It holds other people's answers too, so you delete it yourself from the menu on its message.",
          "Poll messages already posted in your Slack channel. Slack holds those, and someone in the workspace deletes them there.",
          "The record that the app is installed in the workspace. A workspace admin ends that by removing the app.",
        ),
      ],
    },
    {
      heading: "Copies that expire later",
      blocks: [
        p(
          `Deleted rows are removed from the production database for good. A copy can remain in the database provider's restore history for ${RESTORE_HISTORY}, and request logs expire on the hosting provider's schedule. We do not restore deleted data from either.`,
        ),
      ],
    },
    {
      heading: "Requests for a copy or a correction",
      blocks: [
        p(
          `The same address takes requests for a copy of the data stored about you, or for a correction. We answer those within ${DELETION_REQUEST_DAYS} days as well.`,
        ),
      ],
    },
    {
      heading: "Changes",
      blocks: [
        p("When this procedure changes, this page is updated and given a new date."),
      ],
    },
    CONTACT_SECTION,
  ],
};

const disclosure: Policy = {
  path: "/vulnerability-disclosure",
  title: "Vulnerability disclosure program",
  label: "Vulnerability disclosure",
  group: "data",
  summary:
    "How to report a security problem in Meeting Mouse, what is in scope, and what you can expect from us.",
  sections: [
    {
      heading: "Our commitment",
      blocks: [
        p(
          "If you find a security problem in Meeting Mouse, we want to hear about it. We will work with you to understand it and fix it, and we will not take legal action against research done in good faith under this program.",
        ),
      ],
    },
    {
      heading: "How to report",
      blocks: [
        p("Please report privately. Do not open a public issue."),
        list(
          `Use GitHub's private vulnerability reporting on the Meeting Mouse repository, ${REPO_URL}: open its Security tab and choose Report a vulnerability.`,
          `Or write to ${SUPPORT_EMAIL}.`,
        ),
        p(
          "Include the address or component affected, the steps to reproduce it, and what an attacker would gain. A working example helps us confirm it quickly.",
        ),
      ],
    },
    {
      heading: "What to expect",
      blocks: [
        list(
          `An acknowledgement within ${DISCLOSURE_ACK_DAYS} days.`,
          "A fix, or a reasoned decision, as soon as one exists. We tell you which.",
          "Credit for the finding when the fix is published, if you want it.",
        ),
        p("We do not run a bug bounty and do not pay for reports."),
      ],
    },
    {
      heading: "In scope",
      blocks: [
        list(
          "The hosted app at app.meetingmouse.net and this website, www.meetingmouse.net.",
          "Verification of Slack request signatures, and handling of replayed requests.",
          "Who may act on a poll: organizer-only actions, and access from one poll or workspace to another.",
          "Anything that lets credentials or another workspace's data reach a browser.",
          "Injection through poll titles, user input or Slack payload fields.",
        ),
      ],
    },
    {
      heading: "Out of scope",
      blocks: [
        list(
          "The Slack platform itself. Report those problems to Slack.",
          "Problems in our hosting or database providers. Report those to the provider.",
          "A self-hosted copy of Meeting Mouse that someone else configured.",
          "Findings that need a bot token or database credential that is already compromised.",
          "Denial of service by volume, social engineering, and physical attacks.",
        ),
      ],
    },
    {
      heading: "Rules for testing",
      blocks: [
        list(
          "Test only against a Slack workspace you control.",
          "Stop when you have shown the problem exists. Do not read, change or delete data that is not yours.",
          "Do not degrade the service for others.",
          "Give us a reasonable time to fix the problem before you describe it publicly.",
        ),
      ],
    },
    {
      heading: "Changes",
      blocks: [
        p("When this program changes, this page is updated and given a new date."),
      ],
    },
    CONTACT_SECTION,
  ],
};

/** In the order the footer lists them. */
export const POLICIES: readonly Policy[] = [
  terms,
  retention,
  removal,
  storage,
  deletionRequests,
  disclosure,
];

export const TERMS = terms;
export const DATA_RETENTION = retention;
export const DATA_REMOVAL = removal;
export const DATA_STORAGE = storage;
export const DATA_DELETION_REQUESTS = deletionRequests;
export const VULNERABILITY_DISCLOSURE = disclosure;
