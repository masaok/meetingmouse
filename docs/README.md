# Meeting Mouse docs

One living document per subsystem. These describe the code **as it exists today**; a behavior
change lands with its doc change in the same PR. Every relative link and heading anchor here is
validated in CI (`pnpm docs:check`).

| Document                                            | Answers                                                                |
| --------------------------------------------------- | ---------------------------------------------------------------------- |
| [Architecture](./ARCHITECTURE.md)                   | What runs where, directory layout, dependency rules, time zones        |
| [Feature map](./FEATURE_MAP.md)                     | Every Slack surface: ids, files, how to reproduce it                   |
| [Data model](./DATA_MODEL.md)                       | Tables, keys, the replace-all write, migrations                        |
| [Local development](./LOCAL_DEV.md)                 | Env vars, tunnel, exercising the route without Slack                   |
| [Deployment](./DEPLOYMENT.md)                       | Vercel, manifest URLs, required checks, secrets                        |
| [Testing](./TESTING.md)                             | The `pnpm verify` gate, what each CI job proves, guardrails, manual QA |
| [Engineering practices](./ENGINEERING_PRACTICES.md) | The 31 techniques: adopted, rejected, and in what order                |
| [Principles](./PRINCIPLES.md)                       | The 23 one-line rules agents apply and humans steer with               |

Human process (branches, commits, PRs) is in [CONTRIBUTING.md](../CONTRIBUTING.md). Agent
guardrails are in [AGENTS.md](../AGENTS.md). The verification harness and its per-feature
recipes live in `.claude/skills/verify-meetmouse/`.
