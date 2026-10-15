const REPO_URL = "https://github.com/masaok/meetingmouse";
const HOSTED_URL = "https://www.meetingmouse.net";

const link = "font-medium underline underline-offset-4 hover:text-accent";

/** The front door of a self-hosted copy: what this is, and where setup and the hosted app live. */
export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">Meeting Mouse</h1>
      <p className="mt-4 leading-7 text-stone-600 dark:text-stone-400">
        A Slack app for availability polls. Run{" "}
        <code className="rounded bg-stone-200/70 px-1.5 py-0.5 font-mono text-[0.9em] dark:bg-stone-800">
          /meet
        </code>{" "}
        in a channel, everyone clicks the times they are free in their own time zone, and
        the poll message updates in place with who is free when.
      </p>
      <p className="mt-4 leading-7 text-stone-600 dark:text-stone-400">
        This copy is running. Slack sends its commands, clicks and events to{" "}
        <code className="font-mono text-[0.9em]">/api/slack/events</code> on this host.
      </p>
      <ul className="mt-8 space-y-3">
        <li>
          <a href={`${REPO_URL}#run-it-yourself`} className={link}>
            Set up your own copy
          </a>{" "}
          <span className="text-stone-500">with the README on GitHub.</span>
        </li>
        <li>
          <a href={HOSTED_URL} className={link}>
            Use the hosted version
          </a>{" "}
          <span className="text-stone-500">
            to add Meeting Mouse to Slack with nothing to deploy.
          </span>
        </li>
      </ul>
    </main>
  );
}
