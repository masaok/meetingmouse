import Link from "next/link";

import { Logo, LogoMark, Mascot } from "@/components/brand";

const SLACK_INSTALL_URL = "https://app.meetingmouse.net/api/slack/install";
const SELF_HOST_URL = "https://github.com/masaok/meetingmouse#run-it-yourself";

const steps = [
  {
    n: "1",
    title: "Start a poll",
    body: "Run /when Sprint planning in any channel. Pick the dates, a daily window, and a slot length.",
  },
  {
    n: "2",
    title: "Everyone paints their time",
    body: "Each person clicks Add my availability and drags across a grid of slots shown in their own time zone.",
  },
  {
    n: "3",
    title: "Watch the grid fill in",
    body: "The group's availability darkens where more people are free, and the channel message updates with the best times.",
  },
  {
    n: "4",
    title: "Lock it in",
    body: "The organizer picks a final time. A thread reply announces it with an Add to Google Calendar link.",
  },
];

const features = [
  {
    title: "Lives in your channel",
    body: "The poll, the results and the final time are one Slack message that updates in place. No accounts and no sign-in.",
  },
  {
    title: "Time zones handled for you",
    body: "Every time is shown in the viewer's local zone. A slot that lands on a different day for someone in Tokyo is grouped under their day.",
  },
  {
    title: "Best times, ranked",
    body: "The top three slots by headcount sit at the top of the message, above a grid of who is free when.",
  },
  {
    title: "Drag to mark your time",
    body: "Sweep across the hours you are free instead of ticking boxes one by one. Come back later and your answer is already painted.",
  },
  {
    title: "Organizer controls",
    body: "Pick a final time, close the poll, or delete it from an overflow menu that only the organizer can use.",
  },
  {
    title: "Calendar-ready",
    body: "The scheduled announcement includes a one-click Google Calendar link with the right start and end time.",
  },
];

const DAYS = ["Mon", "Tue", "Wed", "Thu"];
const TIMES = ["9 AM", "", "10 AM", "", "11 AM", "", "12 PM", ""];
const TOTAL = 4;

/** `MINE[row][day]`: the half-hours the viewer painted. */
const MINE = [
  [0, 0, 0, 0],
  [0, 0, 0, 0],
  [1, 0, 0, 1],
  [1, 1, 0, 1],
  [1, 1, 0, 1],
  [1, 1, 1, 0],
  [0, 1, 1, 0],
  [0, 0, 1, 0],
];

/** `GROUP[row][day]`: how many of the four people are free. */
const GROUP = [
  [0, 1, 0, 0],
  [1, 1, 0, 1],
  [2, 1, 1, 2],
  [3, 3, 1, 2],
  [3, 4, 2, 3],
  [2, 4, 3, 1],
  [1, 3, 3, 1],
  [0, 1, 2, 0],
];

const SHADE = ["opacity-0", "opacity-25", "opacity-50", "opacity-75", "opacity-100"];

function MiniGrid({
  title,
  cells,
  kind,
}: {
  title: string;
  cells: number[][];
  kind: "mine" | "group";
}) {
  return (
    <div>
      <p className="text-center text-xs font-semibold">{title}</p>
      <div
        className="mt-2 grid grid-cols-[2.25rem_repeat(4,1.5rem)] text-[10px] text-stone-500 dark:text-stone-400"
        aria-hidden="true"
      >
        <span />
        {DAYS.map((d) => (
          <span key={d} className="pb-1 text-center">
            {d}
          </span>
        ))}
        {cells.map((row, r) => (
          <div key={r} className="contents">
            <span className="-mt-1.5 pr-1.5 text-right leading-3">{TIMES[r]}</span>
            {row.map((value, c) => (
              <span
                key={c}
                className={`relative h-3.5 border-l border-stone-400 dark:border-stone-600 ${
                  r % 2 === 0
                    ? "border-t"
                    : "border-t border-t-stone-300 dark:border-t-stone-700"
                } ${c === row.length - 1 ? "border-r" : ""} ${
                  r === cells.length - 1 ? "border-b" : ""
                } ${
                  kind === "mine" && !value
                    ? "bg-rose-100 dark:bg-rose-950/50"
                    : "bg-white dark:bg-stone-900"
                }`}
              >
                <span
                  className={`absolute inset-0 bg-emerald-600 dark:bg-emerald-500 ${
                    kind === "mine" ? (value ? "opacity-100" : "opacity-0") : SHADE[value]
                  }`}
                />
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function MockGrid() {
  return (
    <div className="w-full max-w-sm rounded-2xl border border-stone-200 bg-white p-4 shadow-xl shadow-stone-900/5 dark:border-stone-800 dark:bg-stone-950 dark:shadow-black/40">
      <div className="flex items-center gap-2">
        <span className="bg-accent flex h-7 w-7 items-center justify-center rounded-md">
          <LogoMark className="h-5 w-5" />
        </span>
        <p className="text-sm leading-none font-bold">
          Meeting Mouse{" "}
          <span className="ml-1 rounded bg-stone-100 px-1 py-px text-[10px] font-medium text-stone-500 uppercase dark:bg-stone-800 dark:text-stone-400">
            app
          </span>
        </p>
      </div>

      <h3 className="mt-3 font-bold">📅 Sprint planning</h3>
      <p className="text-xs text-stone-500 dark:text-stone-400">
        {TOTAL} responded · times shown in your time zone
      </p>

      <p className="mt-2 text-sm">
        <span className="font-semibold">Best time</span> · Tue 11:00 AM · {TOTAL}/{TOTAL}{" "}
        <span aria-label="everyone free">✅</span>
      </p>

      <div className="mt-4 flex justify-between gap-3">
        <MiniGrid title="Your availability" cells={MINE} kind="mine" />
        <MiniGrid title="Group's availability" cells={GROUP} kind="group" />
      </div>
      <p className="sr-only">
        Two grids of days by times. On the left, the hours you painted as free. On the
        right, the group&apos;s availability, darker green where more of the {TOTAL}{" "}
        people are free.
      </p>

      <div className="mt-4 flex items-center justify-between gap-2">
        <span className="rounded-md bg-emerald-700 px-3 py-1.5 text-sm font-semibold text-white">
          Add my availability
        </span>
        <span className="flex items-center gap-1 text-[10px] text-stone-500 dark:text-stone-400">
          0/{TOTAL}
          <span className="flex border border-stone-400 dark:border-stone-600">
            {SHADE.map((shade) => (
              <span key={shade} className="relative h-3 w-3 bg-white dark:bg-stone-900">
                <span
                  className={`absolute inset-0 bg-emerald-600 dark:bg-emerald-500 ${shade}`}
                />
              </span>
            ))}
          </span>
          {TOTAL}/{TOTAL} free
        </span>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5">
        <Link href="/" aria-label="Meeting Mouse home">
          <Logo />
        </Link>
        <nav className="flex items-center gap-6 text-sm">
          <a
            href="#how"
            className="hover:text-foreground hidden text-stone-600 sm:inline dark:text-stone-400"
          >
            How it works
          </a>
          <a
            href="#features"
            className="hover:text-foreground hidden text-stone-600 sm:inline dark:text-stone-400"
          >
            Features
          </a>
          <a
            href={SLACK_INSTALL_URL}
            className="bg-accent hover:bg-accent-hover rounded-full px-4 py-2 font-medium text-white transition-colors dark:text-stone-950"
          >
            Add to Slack
          </a>
        </nav>
      </header>

      <main className="flex-1">
        <section className="mx-auto grid w-full max-w-6xl items-center gap-12 px-6 py-12 md:grid-cols-2 md:py-20">
          <div>
            <p className="mb-4 inline-block rounded-full border border-stone-200 px-3 py-1 text-xs font-medium text-stone-600 dark:border-stone-800 dark:text-stone-400">
              Meet the mouse who finds the time
            </p>
            <h1 className="text-4xl leading-tight font-semibold tracking-tight sm:text-5xl">
              Find the time everyone is free, right from Slack.
            </h1>
            <p className="mt-5 max-w-lg text-lg leading-8 text-stone-600 dark:text-stone-400">
              Run{" "}
              <code className="rounded bg-stone-200/70 px-1.5 py-0.5 font-mono text-[0.9em] dark:bg-stone-800">
                /when
              </code>
              , let everyone drag across a grid to mark when they&apos;re free, and watch
              the group&apos;s availability fill in, darker where more people can meet.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a
                href={SLACK_INSTALL_URL}
                className="bg-accent hover:bg-accent-hover inline-flex h-12 items-center justify-center rounded-full px-6 font-medium text-white transition-colors dark:text-stone-950"
              >
                Add to Slack
              </a>
              <a
                href={SELF_HOST_URL}
                className="inline-flex h-12 items-center justify-center rounded-full border border-stone-300 px-6 font-medium transition-colors hover:bg-stone-100 dark:border-stone-700 dark:hover:bg-stone-900"
              >
                Self-host it
              </a>
            </div>
            <p className="mt-4 text-sm text-stone-500 dark:text-stone-500">
              Free while in beta. No accounts, no calendar access required.
            </p>
          </div>
          <div className="flex flex-col items-center gap-2 sm:flex-row sm:items-end sm:justify-center md:justify-end">
            <Mascot className="w-48 shrink-0 drop-shadow-lg sm:-mr-8 sm:w-56" />
            <MockGrid />
          </div>
        </section>

        <section
          id="how"
          className="border-t border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-950"
        >
          <div className="mx-auto w-full max-w-6xl px-6 py-16 md:py-24">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              How it works
            </h2>
            <ol className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {steps.map((s) => (
                <li key={s.n}>
                  <span className="bg-accent flex h-9 w-9 items-center justify-center rounded-full font-mono text-sm font-semibold text-white dark:text-stone-950">
                    {s.n}
                  </span>
                  <h3 className="mt-4 font-semibold">{s.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-stone-600 dark:text-stone-400">
                    {s.body}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="features" className="mx-auto w-full max-w-6xl px-6 py-16 md:py-24">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Built for the way teams actually schedule
          </h2>
          <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <li
                key={f.title}
                className="rounded-2xl border border-stone-200 bg-white p-6 dark:border-stone-800 dark:bg-stone-950"
              >
                <h3 className="font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm leading-6 text-stone-600 dark:text-stone-400">
                  {f.body}
                </p>
              </li>
            ))}
          </ul>
        </section>

        <section className="border-t border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-950">
          <div className="mx-auto flex w-full max-w-6xl flex-col items-start gap-6 px-6 py-16 md:flex-row md:items-center md:justify-between md:py-20">
            <div className="flex items-center gap-5">
              <Mascot className="hidden w-24 shrink-0 sm:block" />
              <div>
                <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                  Stop scheduling in a thread.
                </h2>
                <p className="mt-2 text-stone-600 dark:text-stone-400">
                  Add it to your workspace and run your first poll today, or{" "}
                  <a href={SELF_HOST_URL} className="underline underline-offset-4">
                    deploy your own copy
                  </a>
                  .
                </p>
              </div>
            </div>
            <a
              href={SLACK_INSTALL_URL}
              className="bg-accent hover:bg-accent-hover inline-flex h-12 shrink-0 items-center justify-center rounded-full px-6 font-medium text-white transition-colors dark:text-stone-950"
            >
              Add to Slack
            </a>
          </div>
        </section>
      </main>

      <footer className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-6 py-8 text-sm text-stone-500 sm:flex-row sm:items-center sm:justify-between dark:text-stone-500">
        <p>© {new Date().getFullYear()} Meeting Mouse · meetingmouse.net</p>
        <p>Not affiliated with Slack Technologies.</p>
      </footer>
    </div>
  );
}
