import { ImageResponse } from "next/og";

import { LogoMark, Mascot } from "@/components/brand";

export const SOCIAL_IMAGE_SIZE = { width: 1200, height: 630 };

const BACKGROUND = "#fafaf9";
const FOREGROUND = "#1c1917";
const ACCENT = "#4a154b";
const MUTED = "#57534e";

/** Headlines up to this long use the large size; a post title can run to 60 characters. */
const LARGE_HEADLINE_MAX_CHARS = 50;

/** The site's social preview: the logo, a headline, one line under it and the mascot. */
export function socialImage({
  headline,
  footer,
}: {
  headline: string;
  footer: string;
}): ImageResponse {
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
            fontSize: headline.length <= LARGE_HEADLINE_MAX_CHARS ? 68 : 60,
            fontWeight: 600,
            lineHeight: 1.1,
            letterSpacing: -2,
          }}
        >
          {headline}
        </div>
        <div style={{ marginTop: 36, fontSize: 30, color: MUTED }}>{footer}</div>
      </div>
      <Mascot size={400} />
    </div>,
    SOCIAL_IMAGE_SIZE,
  );
}
