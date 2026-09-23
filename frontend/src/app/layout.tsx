import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const sans = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono", display: "swap" });

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
const description =
  "Give customers fast answers from your own knowledge base using a support widget and developer API.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "ResolveAI — Turn your documentation into instant answers", template: "%s · ResolveAI" },
  description,
  openGraph: { type: "website", siteName: "ResolveAI", title: "ResolveAI — Turn your documentation into instant answers", description },
  twitter: { card: "summary_large_image", title: "ResolveAI", description },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = { themeColor: "#07080b", colorScheme: "dark" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable}`}>
      <body className="min-h-screen antialiased">
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded-lg focus:bg-[var(--color-accent)] focus:px-4 focus:py-2 focus:text-sm focus:text-[var(--color-accent-ink)]">
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
