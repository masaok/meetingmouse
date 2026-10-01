# Principles

Twenty-three one-line rules, adopted from [Pstack](https://github.com/cursor/plugins/tree/main/pstack)
(Lauren Tan's skill stack). Agents read this list at the start of any multi-step task, apply the ones
the task triggers, and **name each applied principle in the reply together with the decision it changed**.
A citation with no decision behind it is name-dropping. Humans use the names to steer:
"apply prove it works, show me the real output" redirects a run better than a paragraph.

## Core: how much to build, when to rethink

| Principle                      | Rule                                                                                                                                      |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| laziness protocol              | Bias toward deletion and the smallest change that solves the problem.                                                                     |
| foundational thinking          | Choose core types and data structures before writing logic; ask what concurrent actors share. Get the data right so code becomes obvious. |
| redesign from first principles | Integrate a new requirement as if it had been a day-one assumption, not a bolt-on.                                                        |
| attack the premise             | When two fixes sharing one premise have failed the same gate, question the premise instead of writing a third fix.                        |
| subtract before you add        | Remove dead weight, redundant validators and stub references first, then build on the simpler base.                                       |
| minimize reader load           | Count layers between question and answer and hidden state in the reader's head; collapse one-caller wrappers, shrink mutable scope.       |
| outcome-oriented execution     | In rewrites and migrations, converge on the target architecture; no throwaway compatibility states.                                       |
| experience first               | Choose the user's result over implementation convenience; fewer polished features over more rough ones.                                   |
| exhaust the design space       | With no precedent, build two or three competing prototypes and compare before committing.                                                 |
| build the lever                | Build the script, codemod, generator or skill that does or proves the work; the tool is what a reviewer can rerun.                        |

## Architecture: where state, validation and compatibility live

| Principle                                | Rule                                                                                                                                                         |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| model the domain                         | Encode repeated rules in one structure, not scattered conditionals.                                                                                          |
| boundary discipline                      | Guards at system boundaries (Slack payloads, env, DB rows); trust internal types; business logic in pure functions.                                          |
| type system discipline                   | Make illegal states unrepresentable; parse external data at the boundary; never lie to the compiler; exhaust variants; derive from the authoritative schema. |
| make operations idempotent               | Converge to the same end state regardless of partial prior runs (replace-all saves, re-renders from fresh aggregates).                                       |
| migrate callers then delete legacy APIs  | Migrate and delete in one wave; no compatibility layers.                                                                                                     |
| separate before serializing shared state | Eliminate the sharing first (own worktree per agent); add locks only when one shared writer is a real invariant.                                             |

## Verification: what counts as proof

| Principle                         | Rule                                                                                                                                        |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| prove it works                    | Verify the real artifact (run the path, read the value, inspect the diff), not a proxy, a self-report, or "it compiles".                    |
| fix root causes                   | Reproduce first, ask why until the cause, fix it there; no nil-check guards that silence the symptom.                                       |
| sequence verifiable units         | Split multi-step work into units that each end in a check; order commits and PRs so the sequence proves itself to a reviewer.               |
| test behavior, not implementation | Call the code the way its users do and assert a literal expected value; delete a test that would pass if every import returned `undefined`. |

## Delegation

| Principle                | Rule                                                                                              |
| ------------------------ | ------------------------------------------------------------------------------------------------- |
| guard the context window | Route bulk reading to subagents; keep summaries, not raw payloads, in the main thread.            |
| never block on the human | Proceed on reversible work and present the result; reserve confirmation for irreversible actions. |

## Meta

| Principle                   | Rule                                                                                        |
| --------------------------- | ------------------------------------------------------------------------------------------- |
| encode lessons in structure | Advice repeated twice becomes a lint, a check, a runtime guard or a script, not more prose. |

## Where this repo already encodes them

- `src/domain/constants.ts` feeding the DB checks, zod parsers and modals: _model the domain_, _type system discipline_.
- `saveResponse` as one replace-all statement and `refreshPollMessage` rendering from fresh reads: _make operations idempotent_.
- ESLint import boundaries, `server-only`, `featuremap:check`, `docs:check` with failure fixtures: _encode lessons in structure_, _boundary discipline_.
- `pnpm verify`, `pnpm health`, the `verify-meetmouse` recipes: _prove it works_, _build the lever_.
- One worktree per agent, one PR per phase: _separate before serializing shared state_, _sequence verifiable units_.
