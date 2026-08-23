import type { Metadata, Viewport } from "next";
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

const APP_NAME = "COC & Reports Submission Status";
const DESCRIPTION =
  "Check the status of your Certificate of Compliance and report submissions with the Cooperative Development Authority.";

/**
 * metadataBase turns the relative Open Graph URLs below into absolute ones,
 * which is what link previews need. AUTH_URL already holds the canonical
 * origin, so there is one place to change on deployment rather than two.
 */
const siteUrl = process.env.AUTH_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: APP_NAME,
    template: `%s — ${APP_NAME}`,
  },
  description: DESCRIPTION,
  applicationName: APP_NAME,
  openGraph: {
    type: "website",
    siteName: APP_NAME,
    title: APP_NAME,
    description: DESCRIPTION,
    url: "/",
    locale: "en_PH",
  },
  twitter: {
    card: "summary",
    title: APP_NAME,
    description: DESCRIPTION,
  },
  /**
   * This is an internal register holding cooperatives' details. There is no
   * reason for any of it to appear in a search engine, and the sign-in page is
   * the only publicly reachable route anyway.
   */
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#0f172a",
  width: "device-width",
  initialScale: 1,
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
        {/*
          Keyboard users land here first. Without it, reaching the record list
          on the admin pages means tabbing past the whole header and nav on
          every single page load.
        */}
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        {children}
      </body>
    </html>
  );
}
