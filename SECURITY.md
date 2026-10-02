# Security policy

## Reporting a vulnerability

The vulnerability disclosure program for the hosted app is at
https://www.meetingmouse.net/vulnerability-disclosure. It says what to expect and the rules for
testing.

Please do not report security problems through public issues. Use GitHub's private
vulnerability reporting on this repository (Security tab, "Report a vulnerability"). Include
the surface affected, a reproduce command (`pnpm slack:sign …` or a payload fixture) and what
an attacker gains. You will get an acknowledgement within seven days and a fix or a reasoned
decision as soon as one exists.

## In scope

- Slack request signature verification and replay handling in the route handler
- Authorization rules: organizer-only actions, cross-poll access
- Anything that lets credentials or another workspace's data reach a client
- Injection through poll titles, user input or Slack payload fields
- Denial of service through payload size or block-count limits

## Out of scope

- The Slack platform itself; report those to Slack
- Misconfiguration of a self-hosted deployment (missing env, public database)
- Findings that require an already-compromised bot token or database credential

## Supported versions

The `main` branch. There are no maintained release lines yet.
