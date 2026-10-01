import { LogoMark, Mascot } from "@/components/brand";
import { SiteFooter, SiteHeader } from "@/components/site";
import { SELF_HOST_URL, SLACK_INSTALL_URL } from "@/lib/site";

const steps = [
  {
    n: "1",
    title: "Start a poll",
    body: "Run /when Sprint planning in any channel. Pick the dates, a daily window, and a slot length.",
  },
  {
    n: "2",
    title: "Everyone clicks their times",
    body: "Each person clicks Add my availability, then the times that work, shown in their own time zone. Each click saves.",
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
    title: "Answer in a few clicks",
    body: "A row of time buttons per day. Click the ones that work and they turn green, with nothing to save. Prefer to drag? Open the grid page instead.",
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

const TOTAL = 4;
const DAYS = ["Mon", "Tue", "Wed"];

const TIMES = ["9am", "9:30am", "10am", "10:30am"];

/** The form's buttons: a row per day, and which times the viewer chose. */
const CHIPS = [
  { day: "Tuesday, September 30", chosen: [true, true, false, false] },
  { day: "Wednesday, October 1", chosen: [false, false, true, true] },
];

/** `GROUP[row][day]`: how many of the four people are free. Rows are TIMES. */
const GROUP = [
  [2, 4, 1],
  [3, 3, 0],
  [3, 3, 2],
  [0, 1, 4],
];

/** The poll message's squares: everyone, half or more, a few, nobody. */
function squareClass(count: number): string {
  if (count === 0) return "bg-stone-200 dark:bg-stone-700";
  if (count === TOTAL) return "bg-emerald-500";
  return count * 2 >= TOTAL ? "bg-yellow-400" : "bg-orange-400";
}

function MockForm() {
  return (
    <div aria-hidden="true">
      <p className="text-xs font-semibold">Click your times</p>
      {CHIPS.map((row) => (
        <div key={row.day} className="mt-2">
          <p className="text-[11px] font-bold">{row.day}</p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {TIMES.map((time, i) => (
              <span
                key={time}
                className={`rounded-md border px-2 py-1 text-[11px] leading-none font-semibold ${
                  row.chosen[i]
                    ? "border-emerald-700 bg-emerald-700 text-white"
                    : "border-stone-300 dark:border-stone-700"
                }`}
              >
                {row.chosen[i] ? "✓ " : ""}
                {time}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function MockSquares() {
  return (
    <div>
      <p className="text-xs font-semibold">Who is free when</p>
      <div
        className="mt-2 grid w-max grid-cols-[3rem_repeat(3,2.25rem)] items-center gap-y-1.5 text-[10px] text-stone-500 dark:text-stone-400"
        aria-hidden="true"
      >
        <span />
        {DAYS.map((d) => (
          <span key={d} className="font-semibold">
            {d}
          </span>
        ))}
        {GROUP.map((row, r) => (
          <div key={r} className="contents">
            <span className="pr-1.5 text-right">{TIMES[r]}</span>
            {row.map((count, c) => (
              <span key={c} className="flex items-center gap-1">
                <span className={`h-3.5 w-3.5 rounded-[3px] ${squareClass(count)}`} />
                {count > 0 ? count : ""}
              </span>
            ))}
          </div>
        ))}
      </div>
      <p className="mt-3 flex items-center gap-1 text-[10px] whitespace-nowrap text-stone-500 dark:text-stone-400">
        <span className="h-2.5 w-2.5 rounded-[2px] bg-emerald-500" /> all
        <span className="ml-1 h-2.5 w-2.5 rounded-[2px] bg-yellow-400" /> most
        <span className="ml-1 h-2.5 w-2.5 rounded-[2px] bg-orange-400" /> a few
      </p>
    </div>
  );
}

function MockPoll() {
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
        <span className="font-semibold">Best time</span> · Tue 9:00 AM · {TOTAL}/{TOTAL}{" "}
        <span aria-label="everyone free">✅</span>
      </p>

      <div className="mt-4 space-y-4">
        <MockForm />
        <MockSquares />
      </div>
      <p className="sr-only">
        First, the form: a row of time buttons per day, the chosen ones green with a tick.
        Below it, the poll message&apos;s grid: a colored square per day and time, green
        where all {TOTAL} people are free.
      </p>

      <span className="mt-4 inline-block rounded-md bg-emerald-700 px-3 py-1.5 text-sm font-semibold whitespace-nowrap text-white">
        Add my availability
      </span>
    </div>
  );
}

export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader home />

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
              , let everyone click the times they&apos;re free without leaving Slack, and
              watch the channel message fill in with a grid of who can meet when.
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
            <MockPoll />
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

      <SiteFooter />
    </div>
  );
}
