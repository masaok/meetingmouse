import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Meet Mouse · find a meeting time without leaving Slack",
  description:
    "Availability polls that live in Slack. Run /when, everyone marks when they're free, and the channel message updates live with a heatmap and the best times.",
  metadataBase: new URL("https://meetmouse.net"),
  openGraph: {
    title: "Meet Mouse · find a meeting time without leaving Slack",
    description: "Availability polls with a live heatmap, right in your Slack channel.",
    url: "https://meetmouse.net",
    siteName: "Meet Mouse",
    type: "website",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
