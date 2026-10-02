/**
 * What the installation page shows: the steps of adding the hosted app to a workspace, each
 * with its screenshot, and what each permission on Slack's page is for.
 */
export interface InstallStep {
  title: string;
  body: string;
  /** A file under `public/install/`, with its pixel size. Absent while a capture is missing. */
  image?: { file: string; alt: string; width: number; height: number };
}

export const INSTALL_STEPS: readonly InstallStep[] = [
  {
    title: "Click Add to Slack",
    body: "Start on the Meeting Mouse homepage and click Add to Slack. You need no account with us.",
    image: {
      file: "01-add-to-slack.png",
      alt: "The Meeting Mouse homepage with the Add to Slack button",
      width: 1280,
      height: 800,
    },
  },
  {
    title: "Sign in to your workspace",
    body: "If your browser is not signed in to Slack, Slack asks which workspace you want. Enter its address and sign in. If you are already signed in, Slack skips this step.",
    image: {
      file: "02-sign-in-to-your-workspace.png",
      alt: "Slack's page asking for your workspace's address",
      width: 1280,
      height: 520,
    },
  },
  {
    title: "Review the permissions and click Allow",
    body: "Slack shows what Meeting Mouse will be able to do in the workspace you picked. Check the workspace name in the top corner, then click Allow. If your workspace requires approval for apps, Slack sends the request to an admin first.",
  },
  {
    title: "See the confirmation",
    body: "You land on a page that says Meeting Mouse is installed in your workspace. There is nothing else to set up. Open Slack and start a poll in any channel.",
    image: {
      file: "04-installed.png",
      alt: "The confirmation page: Meeting Mouse is installed in Acme",
      width: 1280,
      height: 330,
    },
  },
];

/** Each permission Slack lists on its page, by scope, in plain words. A test holds it equal to the manifest. */
export const PERMISSION_REASONS: Readonly<Record<string, string>> = {
  commands: "Add the slash commands and the shortcut that start a poll.",
  "chat:write":
    "Post the poll message in the channel you choose, keep it up to date, and reply in its thread with the final time.",
  "chat:write.public":
    "Post a poll in a public channel without someone inviting the app to it first.",
  "users:read":
    "Read your display name and time zone, so times are shown in your own zone and the poll can list who answered.",
};
