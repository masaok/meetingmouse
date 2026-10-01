---
slug: doodle-free-plan-or-a-free-slack-poll
title: "Doodle free plan or a free Slack poll: how to choose"
description: "Choosing between the Doodle free plan and a free poll inside Slack? Compare where your group is, what each free tier limits, and what you pay in time."
primaryKeyword: doodle free
secondaryKeywords:
  - doodle online free
  - doodle com free
tags:
  - Comparisons
  - Slack
author: Meeting Mouse
createdAt: 2026-10-01
publishedAt: 2026-10-01
updatedAt: 2026-10-01
draft: false
---

If you are looking at the Doodle free plan for scheduling a team, the choice turns on two things. Where your group is, and what the free tier limits. Doodle works through a link and reaches anyone. A free poll inside Slack reaches only people in the channel, and keeps the question and the answer in the channel. Read the limits of any free plan before you rely on it.

## What to check on any free plan

Free tiers change, so this post does not quote Doodle's current limits. Open the pricing page and look for these.

| Check                           | Why it matters                                                |
| ------------------------------- | ------------------------------------------------------------- |
| Number of polls or events       | A cap can stop you mid-quarter.                               |
| Number of participants per poll | A team poll and an all-hands poll are different sizes.        |
| Advertising                     | Whether the free tier shows ads, and to whom.                 |
| Accounts                        | Whether participants must sign up to answer.                  |
| Calendar connection             | Whether it is in the free tier or a paid one.                 |
| Reminders and deadlines         | Which tier includes them.                                     |
| Data and branding               | Whether you can remove the tool's branding or export answers. |

Two of those rows deserve a second look.

**Who the limit applies to.** A cap on the organizer is your problem alone. A requirement on participants, such as an account or an advert on the page, is a cost you hand to every person you invite.

**Whether the plan is free or a trial.** A free plan has no end date. A trial of a paid plan does. The sign-up page says which one you are starting, and it is easy to miss.

## Test the free plan before the real poll

A pricing table tells you what is included. It does not tell you what answering feels like. A short test does, and it costs nothing.

1. Create a throwaway poll with three options. Note every step that asks for something: an email address, a password, a calendar connection, a plan choice.
2. Copy the poll's link and open it in a private browser window. You are now seeing what a participant sees, with no account.
3. Answer the poll as that participant. Count the screens between the link and the submitted answer.
4. Open the same link on a phone. Some of your group will answer there.
5. Go back to the organizer view. Check that you can read the result, pick a time and tell the group without meeting a paid feature.
6. Look for anything marked as an upgrade along the way. That is the edge of the free plan as it applies to you.

If the test poll runs from start to finish without a wall, the free plan fits this job. If it stops at step 5, you have learned that before inviting anyone.

## The costs that are not on the pricing page

A free plan is also paid for in time and attention. These costs appear on no price list.

- **The trip.** Each person leaves the conversation, opens the link, answers and comes back. Later, some of them search for the link again to change an answer.
- **The follow-up.** A result on a page nobody revisits needs someone to announce it. That someone is the organizer.
- **Attention.** If the free tier shows adverts, your participants see them too. They did not choose the tool. You did.
- **The surprise.** A cap reached halfway through a busy month forces a decision at a bad moment: pay, wait or switch.
- **The switch.** Moving a group to a new tool means teaching the new one. The more polls a team has run in one tool, the more the habit is worth.

A free Slack poll removes the trip, because people answer where the question was asked. It does not remove the others by default. Judge it by the same list.

## What "free" means for Meeting Mouse

Meeting Mouse is a Slack app for availability polls, and it is free in two ways.

- **The hosted app is free while in beta.** You add it to your workspace and run `/when` in a channel. "While in beta" means that may change.
- **The code is open source under the MIT license.** You can run your own copy. That needs a Slack app you create, a host for the web app and a Postgres database, so it costs setup time and whatever your host charges.

It needs no account for participants and no calendar access. People answer as their Slack user. A poll offers up to 14 dates, with slots of 15, 30 or 60 minutes. [See how Meeting Mouse works](/#how).

Hold it to the same checks as any other free tool. These are the limits that matter.

- **It reaches only people in the Slack channel.** A client or a candidate who is not in your Slack cannot answer.
- **It does not read calendars.** Each person checks their own calendar and clicks the times that work. [Doodle calendar polls: do you need calendar access?](/blog/doodle-calendar-polls-and-calendar-access) covers what that trade means.
- **It collects free time on a grid.** It does not run a vote on a short list of named options, and it offers no booking pages.
- **The calendar step is a link.** When the organizer picks the final time, a thread reply carries an Add to Google Calendar link. Each person adds the event with one click.
- **The price of the hosted app is settled only for the beta.** If a fixed price matters to you, the code is MIT licensed, so a copy you run yourself costs only what your host and database charge.

## Is running your own copy really free?

The license costs nothing. The work and the hosting are yours. Running your own copy means these jobs.

- Create a Slack app in a workspace where you are allowed to create one.
- Provide a Postgres database. The project's README names Neon and says its free tier is enough.
- Deploy the web app to a host and point the Slack app at it.
- Keep it running, and update it when you want new features.

For a team with a developer who is comfortable with those steps, the cost is setup time and a running cost that depends on the host. For a team without one, the hosted app is the realistic free option, and the beta caveat applies.

## A worked example: two meetings, two answers

A design team of eight shares one Slack channel. This month it has two meetings to schedule.

**The weekly review.** All eight people are in the channel. The week is open, and nobody knows which hours suit the group. A poll in the channel fits. The organizer runs `/when Weekly review`, picks five dates and a daily window, and the team answers from the message. The best times appear at the top of that message, so nobody has to announce the count. No link leaves Slack, and no plan limit is in play.

**A portfolio session with two outside reviewers.** The reviewers work at other companies and are not in the team's Slack. A channel poll cannot reach them. A web tool with a link can, and Doodle is a common choice. Before sending the link, the organizer runs the six-step test above. The things to confirm are that the reviewers can answer without an account, and that ten participants fit within the free plan.

One team, two tools, and neither choice is wrong. The split follows where the people are, not which product is better.

## Choosing between them

| Your situation                                         | Choose                                            |
| ------------------------------------------------------ | ------------------------------------------------- |
| Everyone is in one Slack workspace                     | A poll in the channel                             |
| Some participants are outside your organization        | A web tool with a link, such as Doodle            |
| You want votes on a few fixed options                  | A poll of options                                 |
| You want to see everyone's free time and count overlap | An availability grid                              |
| You need calendar connections and booking pages        | A scheduling suite, and check which tier has them |

If two rows apply, let the people decide it. A tool that half the group cannot reach fails, however good its other features are.

The grid and the poll of options are different questions. [When 2 Meet vs Doodle](/blog/when-2-meet-vs-doodle) explains when each one wins, and [Doodle scheduling in Slack](/blog/doodle-scheduling-in-slack) compares a linked poll with a channel poll step by step.

## Mistakes people make when choosing a free tool

- **Choosing by feature count.** A free plan with ten features you will not use is no better than one with the three you will.
- **Reading the limits after the poll is out.** Check first. Changing tools while six people are halfway through answering costs you their goodwill.
- **Testing only as the organizer.** The organizer's view is the polished one. The participant's view decides whether people answer.
- **Trusting an old article.** A comparison written last year can describe a plan that no longer exists. The tool's own pricing page is the only current source. That applies to this post too.
- **Treating free as permanent.** Plans change, and a beta ends. Keep the decision cheap to reverse: do not build a process that depends on one free feature.
- **Using one tool for every group.** The team in Slack and the committee spread across four organizations have different needs. Nothing stops you from using two tools.

## Questions people ask about free scheduling polls

### Is Doodle free to use?

Doodle has long offered a free plan alongside paid ones. Whether it still does, and what it includes today, is on Doodle's pricing page. Use the table at the top of this post as your reading list, then run the test poll.

### Do participants pay or sign up?

In most poll tools the plan belongs to the organizer, and participants answer through the link. Whether they must create an account is a per-tool detail. Step 2 of the test settles it in a minute.

### What do I do if I hit a limit mid-project?

Finish the open poll where it is. Then decide between paying, waiting for the limit to reset if it does, or moving the next poll to another tool. Do not move a poll that people have already answered.

### Can I use Doodle and a Slack poll side by side?

Yes. Use the channel poll when every participant is in the channel, and the link when someone is not. Tell the team the rule once, so nobody has to guess where the next poll will appear.

A message you can copy:

```text
Scheduling from now on:
- Team-only meetings: I will post a poll in this channel. Answer from the message.
- Meetings with outside guests: I will send a link to a poll on the web.
Either way, mark every time you can make, not only your favorite.
```

### Does a free plan include reminders?

It depends on the tool and the tier. If it does not, a reminder is one message from you. [How to ask a group when we can meet](/blog/how-to-ask-when-we-can-meet) has wording for the first ask and the follow-up.
