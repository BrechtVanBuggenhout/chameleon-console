import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import { MainLayout } from "../main-layout";
import { Analytics } from "@vercel/analytics/next";

// This image is built once and shared unmodified across every BYOC/hosted
// customer instance -- VAULT_BASE_URL and every other runtime secret don't
// exist yet at `docker build` time. Without this, kvFetch's early-return
// (`if (!VAULT_BASE_URL) return null`) means the `fetch()` call -- and its
// `cache: 'no-store'` option -- never actually executes during Next's
// build-time static/dynamic analysis, so pages like /registry silently get
// statically prerendered with fixture data baked in and never revisited,
// regardless of the real customer's env vars at runtime. Forcing every
// route dynamic here closes that gap for good, independent of whether any
// individual page's fetch calls happen to run during the build.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Chameleon Console",
  description: "Compliance console for Chameleon.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${GeistSans.variable} ${GeistMono.variable} h-full antialiased`}
    >
      <body className="h-full">
        <MainLayout>{children}</MainLayout>
        <Analytics />
      </body>
    </html>
  );
}
