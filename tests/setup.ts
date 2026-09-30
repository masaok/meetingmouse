import { vi } from "vitest";

// Every test runs against a fixed clock and fake secrets so renders are deterministic.
vi.stubEnv("SLACK_BOT_TOKEN", "xoxb-test");
vi.stubEnv("SLACK_SIGNING_SECRET", "test-signing-secret");
vi.stubEnv("DATABASE_URL", "postgres://test:test@localhost/test");
