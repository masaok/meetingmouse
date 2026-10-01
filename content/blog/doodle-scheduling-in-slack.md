---
slug: doodle-scheduling-in-slack
title: "Doodle scheduling in Slack: how a channel poll compares"
description: "Doodle scheduling works through a link to a poll on another site. For a team in one Slack channel, here is how a poll inside the channel compares."
primaryKeyword: doodle scheduling
secondaryKeywords:
  - doodlepoll
tags:
  - Comparisons
  - Slack
author: Meeting Mouse
createdAt: 2026-10-01
publishedAt: 2026-10-01
updatedAt: 2026-10-01
draft: false
---

Doodle scheduling means sending a group a link to a poll, where the organizer has listed possible times and each person votes on the ones that work. It is a sound method, and it happens on Doodle's site. When the whole group is already in one Slack channel, a poll that lives in the channel removes the trip to another site and puts the result where the conversation is.

## How a Doodle poll runs

1. The organizer creates a poll and lists the candidate times.
2. The organizer shares the poll's link.
3. Each person opens the link and votes on the options.
4. The organizer reads the result, picks a time and tells the group.

Steps 2 and 4 happen in your chat tool. Steps 1 and 3 happen on another site.

That split is the thing to manage. The poll holds the answers. The channel holds the people. Every hand-off between the two is a place where an answer can be lost.

## Running a Doodle poll well from a Slack channel

If you use Doodle with a Slack team, a few habits close most of the gaps.

- **Post the link with context.** Say what the meeting is, how long it runs and when you need answers. A bare link in a busy channel scrolls away.
- **Pin the message.** People who mean to answer later need to find the link again. A pinned message saves them the search.
- **Ask for votes on the poll, not in the thread.** Some people will reply "Tuesday works" under your message. Those replies are not in the poll's count. Ask them to vote on the page as well.
- **Remind once, by name.** Check the poll a day before the deadline. Mention the people who have not voted.
- **Announce in the same thread.** The result lives on the poll page until you bring it back. Reply under your first message with the chosen time, so the question and the answer sit together.

Here is a message you can copy.

```text
Sprint planning, 60 minutes, next week.
Vote on every option you can make: <link>
Please vote on the page, not in this thread, so the count is right.
I will close the poll on Wednesday at noon and post the time here.
```

And a reminder.

```text
Four of six have voted on the sprint planning poll (link pinned above).
@Sam @Priya, could you add your votes by noon tomorrow?
```

## What changes when the poll is a Slack message

|                            | A link to a poll on another site        | A poll in the channel               |
| -------------------------- | --------------------------------------- | ----------------------------------- |
| Where people answer        | A web page, after following the link    | From a button on the message        |
| Who they answer as         | A typed name or an account on that site | Their Slack user                    |
| Where the result is        | On the poll page                        | In the channel, in the same message |
| Who can take part          | Anyone with the link                    | People in the Slack channel         |
| Announcing the chosen time | A separate message from the organizer   | A reply in the poll's thread        |

The last row but one is the real limit. A poll in a channel reaches only the people in that channel, so a client or a candidate who is not in your Slack cannot answer. For those groups a link is the right tool.

The other rows are about hand-offs. With a channel poll, nobody has to find a link, type a name or carry the result back. The habits in the section above exist to patch those hand-offs. A channel poll removes the need for most of them.

## Options or a grid

A Doodle poll asks people to vote on times the organizer chose. The other model is a grid, where each person marks all their free time and the tool counts the overlap. The grid finds times nobody thought to propose. The poll is quicker to answer when the list is short. [When 2 Meet vs Doodle](/blog/when-2-meet-vs-doodle) compares the two models in detail.

This matters here because the two choices are separate. Where the poll lives, on a site or in the channel, is one choice. What it asks, a vote or free time, is another. Moving from a linked poll of options to a channel grid changes both at once, so know which change you want.

## How Meeting Mouse does it

Meeting Mouse is a Slack app that uses the grid model.

1. Run `/when Sprint planning` in a channel. A form asks for the dates, a daily window and a slot length of 15, 30 or 60 minutes.
2. The app posts one poll message.
3. Each person clicks Add my availability and clicks the times that work in a form in Slack, shown in their own time zone. Each click saves. A link in the form opens a page for dragging across the same slots.
4. The message updates after every answer with a grid of who is free when and the three best times by headcount.
5. The organizer picks the final time from a menu on the message. A thread reply announces it with an Add to Google Calendar link.

It asks for no account and no calendar access. [See how Meeting Mouse works](/#how).

A few details matter when you compare it with a linked poll.

- **Changing an answer.** A person clicks Add my availability again, and their earlier answer is already filled in.
- **Saying no.** The form has an "I can't make any of these" choice, so a person with no free slot can still answer.
- **Organizer controls.** The menu on the message lets the organizer pick a final time, close the poll or delete it. Only the organizer can use it.
- **Size.** A poll offers up to 14 dates, and a day holds at most 24 slots.
- **Time zones.** There is no zone to choose. Each person sees the times in the zone of their Slack profile.

## The same sprint planning, both ways

A team of six needs 60 minutes for sprint planning next week. All six are in the #team-billing channel.

**With a linked poll.** The organizer opens Doodle, creates the poll and picks five candidate times. She pastes the link in the channel with a deadline. Over the next day, four people follow the link and vote. One replies "any afternoon" in the thread and does not vote. One misses the message. She reminds both by name. When the votes are in, she opens the poll page, reads the count, and posts the winning time in the thread. Then she sends the calendar invite, unless the tool did it for her.

**With a channel poll.** The organizer runs `/when Sprint planning` and picks Monday to Friday, 9:00 to 17:00, in 60-minute slots. One message appears in the channel. Each person clicks the button on it and marks their free hours. The message redraws after each answer, so anyone who scrolls past sees the current best times. She still has to remind the person who missed it. When the answers are in, she picks the top slot from the menu on the message, and the thread reply carries the calendar link.

The second run has fewer steps for everyone, and the count never leaves the channel. The first run would be the only choice if one of the six were a contractor outside the workspace.

## When part of the group is outside Slack

Mixed groups are common. A team shares a channel, and one client or one candidate does not. You have three workable options.

- **Use a link for everyone.** One poll, one count. The team loses the convenience, and the count stays in one place. This is the safest choice.
- **Add the guest to the channel.** If your workspace allows guests and the person will work with you for a while, this may be worth it. It is too much for a single meeting.
- **Settle the team first, then offer the guest a short list.** Run the channel poll, take the two or three best times, and send those to the guest by email. This works when the guest's time is the scarcer one and you want to offer them only good options.

Whichever you choose, tell the guest what you are doing and when they will hear the result. A guest who gets a bare link from a stranger's team is the person most likely not to answer.

Avoid running two full polls side by side and merging them by hand. Two counts in two places is the problem a poll was meant to solve.

## Common questions

### Does Doodle have a Slack app?

Scheduling tools add and remove integrations over time, so this post does not state what Doodle offers today. Check Doodle's own site and the Slack app directory. Whatever you find, ask the two questions from the table. Where do people answer, and where does the result appear?

### Is a channel poll free?

Meeting Mouse is free while in beta, and the code is open source, so you can run your own copy. For how that compares with a free tier on a web tool, read [Doodle free plan or a free Slack poll](/blog/doodle-free-plan-or-a-free-slack-poll).

### Does a channel poll read my calendar?

Meeting Mouse does not. Each person marks their own free time. Whether a calendar connection is worth having is covered in [Doodle calendar polls: do you need calendar access?](/blog/doodle-calendar-polls-and-calendar-access).

### Can I get a vote on fixed options inside Slack?

Meeting Mouse offers every slot in the dates and window you choose, not a hand-picked list. You can get close by offering one or two dates and a narrow window. For a true vote on three named times, a poll of options is the better fit.

### What happens to people who join the channel late?

The poll is a message in the channel, so anyone who joins can scroll to it and answer while it is open. Once the organizer closes it or picks a time, the message shows the outcome.

## Which to use

- **Everyone is in one Slack workspace.** Use a channel poll.
- **Some people are outside it.** Use a link, with Doodle or another web tool.
- **You have three fixed options and a large group.** A vote on options is the quickest to answer.
- **The week is open and the team is small.** Use a grid.

These can combine. A team in one workspace with an open week gets the most from a channel grid. A large group with outside guests and three fixed dates is the textbook case for a linked poll of options.

Before you settle on a web tool, [what to look for in a when to meet app](/blog/when-to-meet-app-what-to-look-for) gives a checklist to compare them.
