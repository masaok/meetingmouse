import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import sitemap from "@/app/sitemap";
import { SITE_ROUTES } from "@/blog/paths";
import { GRID_LINK_TTL_SECONDS } from "@/web/link";

import {
  DELETION_REQUEST_DAYS,
  DISCLOSURE_ACK_DAYS,
  GRID_LINK_HOURS,
  RETENTION_MONTHS,
  SUPPORT_EMAIL,
} from "./hosted";
import {
  DATA_DELETION_REQUESTS,
  DATA_RETENTION,
  POLICIES,
  VULNERABILITY_DISCLOSURE,
  type Policy,
} from "./policies";
import { LEGAL_PATH, SITE_URL } from "./site";

const textOf = (policy: Policy): string =>
  policy.sections
    .flatMap((s) => s.blocks)
    .flatMap((b) =>
      b.kind === "p" ? [b.text] : b.kind === "list" ? b.items : b.rows.flat(),
    )
    .join("\n");

describe("the terms and data policies", () => {
  it("are six pages, each at its own address", () => {
    expect(POLICIES.map((p) => p.path)).toEqual([
      "/terms",
      "/data-retention",
      "/data-archival-removal",
      "/data-storage",
      "/data-deletion-requests",
      "/vulnerability-disclosure",
    ]);
  });

  it("are all in the sitemap and may be linked from a blog post", () => {
    const urls = sitemap().map((entry) => entry.url);
    for (const policy of POLICIES) {
      expect(urls).toContain(`${SITE_URL}${policy.path}`);
      expect(SITE_ROUTES).toContain(policy.path);
    }
  });

  it("are listed on one legal page, which is in the sitemap too", () => {
    expect(sitemap().map((entry) => entry.url)).toContain(`${SITE_URL}${LEGAL_PATH}`);
    expect(SITE_ROUTES).toContain(LEGAL_PATH);
  });

  it("each end with how to reach us", () => {
    for (const policy of POLICIES) {
      expect(policy.sections.at(-1)?.heading).toBe("Contact");
      expect(textOf(policy)).toContain(SUPPORT_EMAIL);
    }
  });

  it("state the retention period, the deletion deadline and the report acknowledgement from one place", () => {
    expect(textOf(DATA_RETENTION)).toContain(
      `${RETENTION_MONTHS} months after the poll is closed`,
    );
    expect(textOf(DATA_DELETION_REQUESTS)).toContain(
      `Within ${DELETION_REQUEST_DAYS} days of the request`,
    );
    expect(textOf(VULNERABILITY_DISCLOSURE)).toContain(
      `An acknowledgement within ${DISCLOSURE_ACK_DAYS} days.`,
    );
  });

  it("agree with the code and SECURITY.md on the numbers they quote", () => {
    expect(GRID_LINK_HOURS * 60 * 60).toBe(GRID_LINK_TTL_SECONDS);
    expect(DISCLOSURE_ACK_DAYS).toBe(7);
    expect(readFileSync("SECURITY.md", "utf8")).toContain("within seven days");
  });
});
