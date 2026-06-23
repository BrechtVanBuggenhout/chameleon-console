import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import { MainLayout } from "../main-layout";

export const metadata: Metadata = {
  title: "Chameleon Console",
  description: "Interactive product demo for Chameleon.",
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
      </body>
    </html>
  );
}
