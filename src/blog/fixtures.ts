/** Enough repeated prose, under enough headings, to clear the length and section floors. */
const FILLER = [1, 2, 3, 4]
  .map(
    (n) =>
      `## Filler section ${n}\n\n${"A grid shows every answer at once, so the group can count and not guess. ".repeat(26).trim()}\n`,
  )
  .join("\n");

/** A post that passes every rule. Tests break one part of it at a time. */
export const GOOD_POST = `---
slug: when-to-meet-with-a-grid
title: "When to meet with a grid"
description: "Deciding when to meet is easier on a grid. This sample post exists for the tests and repeats itself until it is long enough to pass."
primaryKeyword: when to meet
secondaryKeywords: []
tags:
  - Sample
author: Meeting Mouse
createdAt: 2026-09-01
publishedAt: 2026-09-02
draft: false
---

Working out when to meet takes one grid. See [the homepage](/).

## A section

More text.

${FILLER}`;
