import { existsSync } from "node:fs";

import { expect, it } from "vitest";

import sitemap from "@/app/sitemap";

import manifest from "../../manifest.json";
import { INSTALL_STEPS, PERMISSION_REASONS } from "./installation";
import { INSTALLATION_PATH, SITE_URL } from "./site";

it("explains every permission the manifest asks for, and no other", () => {
  expect(Object.keys(PERMISSION_REASONS).sort()).toEqual(
    [...manifest.oauth_config.scopes.bot].sort(),
  );
});

it("every screenshot a step names is a file the site serves", () => {
  for (const step of INSTALL_STEPS)
    if (step.image) expect(existsSync(`public/install/${step.image.file}`)).toBe(true);
});

it("the installation page is in the sitemap", () => {
  expect(sitemap().map((entry) => entry.url)).toContain(
    `${SITE_URL}${INSTALLATION_PATH}`,
  );
});
