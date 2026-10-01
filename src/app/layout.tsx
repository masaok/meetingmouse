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
  title: "Meeting Mouse · find the time everyone is free, right from Slack",
  description:
    "Availability polls that start in Slack. Run /when, everyone drags across a grid to mark when they're free, and the channel message updates live with the group's availability and the best times.",
  metadataBase: new URL("https://meetingmouse.net"),
  openGraph: {
    title: "Meeting Mouse · find the time everyone is free, right from Slack",
    description:
      "Availability polls with a paint-your-time grid, right from your Slack channel.",
    url: "https://meetingmouse.net",
    siteName: "Meeting Mouse",
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
