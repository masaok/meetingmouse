---
slug: when-to-meet-find-a-time-that-works-for-everyone
title: "When to meet: find a time that works for everyone"
description: "Deciding when to meet is a counting problem. Collect each person's free time on one grid, count the overlap, and pick the slot most people can make."
primaryKeyword: when to meet
secondaryKeywords:
  - when to met
  - when two meet
tags:
  - Scheduling basics
  - Availability polls
author: Meeting Mouse
createdAt: 2026-10-01
publishedAt: 2026-10-01
updatedAt: 2026-10-01
draft: false
---

Working out when to meet is a counting problem, and a message thread is a poor place to count. The reliable method has three steps. Ask everyone for all the times they are free, lay the answers over each other on one grid, and pick the slot with the most people in it.

## Why a thread fails

A thread asks one question at a time. Someone proposes Tuesday at 2. Two people say yes, one says no, and a fourth offers Wednesday morning. Now there are two proposals and four partial answers, and nobody has said anything about Thursday.

Each reply answers only the times already on the table. The time that suits everyone may be one that nobody proposed.

## Collect availability, not votes

The fix is to change the question. Do not ask "does Tuesday at 2 work?". Ask "when are you free this week?".

An availability grid does this. The rows are times, the columns are days, and each person marks every cell they can make. Nobody has to react to anyone else's proposal, so the answers do not depend on who replied first.

Here is a small example with four people and half-hour slots on one morning.

| Time  | Ana  | Ben  | Chi  | Dev  | Free |
| ----- | ---- | ---- | ---- | ---- | ---- |
| 9:00  | free |      | free |      | 2    |
| 9:30  | free | free | free |      | 3    |
| 10:00 | free | free | free | free | 4    |
| 10:30 |      | free | free | free | 3    |
| 11:00 |      | free |      | free | 2    |

The answer is 10:00, and nobody had to propose it.

## Three decisions before you ask

1. **The date range.** Keep it short. A week or two is enough for most meetings, and a long range gives people more cells to fill in.
2. **The daily window.** Offer only the hours a meeting could happen. Nine to five is a sensible default for one office.
3. **The slot length.** Match it to the meeting. A one-hour meeting does not need 15-minute slots.

[When to meet survey: what to ask and how to set it up](/blog/when-to-meet-survey-what-to-ask) goes through each setting with examples.

## Mind the time zones

A grid only works when each person reads it in their own time zone. If the organizer's 9:00 is shown as 9:00 to someone eight hours away, that person marks the wrong cells and the count is wrong.

Check that your tool converts times for each viewer. A slot late in the organizer's day can fall on the next calendar day for someone else, and it should appear under that day for them.

## Pick the time and close the question

When most people have answered, choose the slot with the highest count. If nothing suits everyone, take the best slot and tell the people who cannot make it. Then say the decision once, in the place where everyone will see it, and put it on the calendar.

When the question is which day and not which hour, the same counting works on dates. See [how to find a date when everyone is available](/blog/find-a-date-when-everyone-is-available).

## Where to run the grid

If the group already talks in Slack, the grid can live there. Meeting Mouse posts an availability poll as one channel message when you run `/meet` with a title. Each person marks their free slots in their own time zone, and the message updates with the three best times by headcount. [How Meeting Mouse works](/#how) shows the four steps.
