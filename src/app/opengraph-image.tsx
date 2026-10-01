import { ImageResponse } from "next/og";

import { LogoMark, Mascot } from "@/components/brand";

export const alt = "Meeting Mouse: find the time everyone is free, right from Slack";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const BACKGROUND = "#fafaf9";
const FOREGROUND = "#1c1917";
const ACCENT = "#4a154b";
const MUTED = "#57534e";

/**
 * A page that sets its own `openGraph` replaces the root's, image included, so it passes
 * this in `openGraph.images` and `twitter.images` to keep the preview.
 */
export const SOCIAL_IMAGE = { url: "/opengraph-image", ...size, alt };

/** The social preview for every page of the site, drawn at build time. */
export default function OpengraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "72px 80px",
        background: BACKGROUND,
        color: FOREGROUND,
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", width: 640 }}>
        <div
          style={{ display: "flex", alignItems: "center", fontSize: 36, fontWeight: 600 }}
        >
          <LogoMark size={64} />
          <span style={{ marginLeft: 18 }}>Meeting</span>
          <span style={{ marginLeft: 10, color: ACCENT }}>Mouse</span>
        </div>
        <div
          style={{
            marginTop: 56,
            fontSize: 68,
            fontWeight: 600,
            lineHeight: 1.1,
            letterSpacing: -2,
          }}
        >
          Find the time everyone is free, right from Slack.
        </div>
        <div style={{ marginTop: 36, fontSize: 30, color: MUTED }}>
          Availability polls in one Slack message.
        </div>
      </div>
      <Mascot size={400} />
    </div>,
    size,
  );
}
