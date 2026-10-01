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

## What changes when the poll is a Slack message

|                            | A link to a poll on another site        | A poll in the channel               |
| -------------------------- | --------------------------------------- | ----------------------------------- |
| Where people answer        | A web page, after following the link    | From a button on the message        |
| Who they answer as         | A typed name or an account on that site | Their Slack user                    |
| Where the result is        | On the poll page                        | In the channel, in the same message |
| Who can take part          | Anyone with the link                    | People in the Slack channel         |
| Announcing the chosen time | A separate message from the organizer   | A reply in the poll's thread        |

The last row but one is the real limit. A poll in a channel reaches only the people in that channel, so a client or a candidate who is not in your Slack cannot answer. For those groups a link is the right tool.

## Options or a grid

A Doodle poll asks people to vote on times the organizer chose. The other model is a grid, where each person marks all their free time and the tool counts the overlap. The grid finds times nobody thought to propose. The poll is quicker to answer when the list is short. [When 2 Meet vs Doodle](/blog/when-2-meet-vs-doodle) compares the two models in detail.

## How Meeting Mouse does it

Meeting Mouse is a Slack app that uses the grid model.

1. Run `/meet Sprint planning` in a channel. A form asks for the dates, a daily window and a slot length of 15, 30 or 60 minutes.
2. The app posts one poll message.
3. Each person clicks Add my availability and clicks the times that work in a form in Slack, shown in their own time zone. Each click saves. A link in the form opens a page for dragging across the same slots.
4. The message updates after every answer with a grid of who is free when and the three best times by headcount.
5. The organizer picks the final time from a menu on the message. A thread reply announces it with an Add to Google Calendar link.

It asks for no account and no calendar access. [See how Meeting Mouse works](/#how).

## Which to use

- **Everyone is in one Slack workspace.** Use a channel poll.
- **Some people are outside it.** Use a link, with Doodle or another web tool.
- **You have three fixed options and a large group.** A vote on options is the quickest to answer.
- **The week is open and the team is small.** Use a grid.

Before you settle on a web tool, [what to look for in a when to meet app](/blog/when-to-meet-app-what-to-look-for) gives a checklist to compare them.
