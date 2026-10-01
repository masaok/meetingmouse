import { beforeEach, expect, test, vi } from "vitest";

// tests/setup.ts stubs the three required variables once; only these two vary here.
beforeEach(() => {
  vi.stubEnv("APP_BASE_URL", undefined);
  vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", undefined);
  vi.resetModules();
});

test("the app's origin is APP_BASE_URL when set", async () => {
  vi.stubEnv("APP_BASE_URL", "https://polls.example.com");
  vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "app.vercel.example");
  const { appBaseUrl } = await import("./env");

  expect(appBaseUrl()).toBe("https://polls.example.com");
});

test("on Vercel the origin falls back to the production domain", async () => {
  vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "app.vercel.example");
  const { appBaseUrl } = await import("./env");

  expect(appBaseUrl()).toBe("https://app.vercel.example");
});

test("with neither, there is no origin and the web grid stays off", async () => {
  const { appBaseUrl } = await import("./env");

  expect(appBaseUrl()).toBeUndefined();
});

test("an APP_BASE_URL that is not a URL is named in the error", async () => {
  vi.stubEnv("APP_BASE_URL", "polls.example.com");
  const { appBaseUrl } = await import("./env");

  expect(() => appBaseUrl()).toThrow(/APP_BASE_URL/);
});
