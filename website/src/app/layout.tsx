import type { Metadata } from "next";
import "./globals.css";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: { default: "Westfall Optimization — Optimization, with mathematical guarantees", template: "%s · Westfall Optimization" },
  description:
    "Independent research on exact weighted linear ordering: Block-Localized Exclusion (BLX 2.0), a square-root block-localization bound, and independently checkable exact optimality certificates.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:bg-cyan-400 focus:px-3 focus:py-2 focus:text-ink-950">Skip to content</a>
        <Nav />
        <main id="main">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
