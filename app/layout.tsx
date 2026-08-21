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
  title: {
    default: "COC & Reports Submission Status",
    template: "%s — COC & Reports Submission Status",
  },
  description:
    "Check the status of your Certificate of Compliance and report submissions with the Cooperative Development Authority.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // suppressHydrationWarning is scoped to these two elements only.
    // Browser extensions inject attributes onto <html> and <body> before React
    // hydrates — Liner adds data-liner-extension-version, others add their own.
    // The server cannot know about them, so React reports a mismatch that is
    // neither our bug nor fixable by us. Suppressing here silences that noise
    // without hiding genuine mismatches anywhere inside the page.
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body suppressHydrationWarning className="min-h-full flex flex-col">
        {children}
      </body>
    </html>
  );
}
