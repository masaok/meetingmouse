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
    title: "Everyone marks their time",
    body: "Each person clicks Add my availability and checks off slots shown in their own time zone.",
  },
  {
    n: "3",
    title: "Watch the heatmap fill in",
    body: "The channel message updates live with the best times and who has answered.",
  },
  {
    n: "4",
    title: "Lock it in",
    body: "The organizer picks a final time. A thread reply announces it with an Add to Google Calendar link.",
  },
];

const features = [
  {
    title: "Nobody leaves Slack",
    body: "No links, no accounts, no new tabs. The whole poll lives in one message that updates in place.",
  },
  {
    title: "Time zones handled for you",
    body: "Every time is shown in the viewer's local zone. A slot that lands on a different day for someone in Tokyo is grouped under their day.",
  },
  {
    title: "Best times, ranked",
    body: "The top three slots by headcount sit at the top of the message. Contiguous times where everyone is free are called out.",
  },
  {
    title: "Edit your answer any time",
    body: "Reopen the modal and your previous picks are already checked. Submit again and the heatmap re-renders.",
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

type Row = { time: string; count: number };

const day1: Row[] = [
  { time: "09:00", count: 4 },
  { time: "09:30", count: 3 },
  { time: "10:00", count: 3 },
  { time: "10:30", count: 1 },
];

const TOTAL = 4;

function Heat({ count }: { count: number }) {
  return (
    <span className="inline-flex gap-0.5" aria-hidden="true">
      {Array.from({ length: TOTAL }).map((_, i) => (
        <span
          key={i}
          className={`inline-block h-3.5 w-3.5 rounded-[3px] ${
            i < count
              ? "bg-emerald-500 dark:bg-emerald-400"
              : "bg-stone-200 dark:bg-stone-700"
          }`}
        />
      ))}
    </span>
  );
}

function DayBlock({ label, rows }: { label: string; rows: Row[] }) {
  return (
    <div className="mt-3">
      <p className="text-sm font-semibold">{label}</p>
      <ul className="mt-1 space-y-0.5">
        {rows.map((r) => (
          <li key={r.time} className="flex items-center gap-3 text-sm">
            <code className="rounded bg-stone-100 px-1 font-mono text-[12px] text-stone-700 dark:bg-stone-800 dark:text-stone-300">
              {r.time}
            </code>
            <Heat count={r.count} />
            <span className="text-stone-500 dark:text-stone-400">
              {r.count}
              <span className="sr-only"> of {TOTAL} available</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function MockPoll() {
  return (
    <div className="w-full max-w-xs rounded-2xl border border-stone-200 bg-white p-4 shadow-xl shadow-stone-900/5 dark:border-stone-800 dark:bg-stone-950 dark:shadow-black/40">
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
        4 responded · times shown in your time zone
      </p>

      <p className="mt-2 text-sm">
        <span className="font-semibold">Best time</span> · Tue 9:00 AM — 4/4{" "}
        <span aria-label="everyone free">✅</span>
      </p>

      <DayBlock label="Tue, Sep 30" rows={day1} />

      <div className="mt-3 flex items-center gap-2">
        <span className="rounded-md bg-emerald-700 px-3 py-1.5 text-sm font-semibold text-white">
          Add my availability
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
        <section className="mx-auto grid w-full max-w-6xl items-center gap-12 px-6 py-16 md:grid-cols-2 md:py-24">
          <div>
            <p className="mb-4 inline-block rounded-full border border-stone-200 px-3 py-1 text-xs font-medium text-stone-600 dark:border-stone-800 dark:text-stone-400">
              Meet the mouse who finds the time
            </p>
            <h1 className="text-4xl leading-tight font-semibold tracking-tight sm:text-5xl">
              Find a meeting time without leaving the channel.
            </h1>
            <p className="mt-5 max-w-lg text-lg leading-8 text-stone-600 dark:text-stone-400">
              Run{" "}
              <code className="rounded bg-stone-200/70 px-1.5 py-0.5 font-mono text-[0.9em] dark:bg-stone-800">
                /when
              </code>
              , let everyone mark when they&apos;re free, and let Meeting Mouse turn one
              Slack message into a live heatmap with the best times on top.
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

      <footer className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-6 py-8 text-sm text-stone-500 sm:flex-row sm:items-center sm:justify-between dark:text-stone-500">
        <p>© {new Date().getFullYear()} Meeting Mouse · meetingmouse.net</p>
        <p>Not affiliated with Slack Technologies.</p>
      </footer>
    </div>
  );
}
