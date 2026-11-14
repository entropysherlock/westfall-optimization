import type { Metadata, Viewport } from "next";
import "./globals.css";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import { BASE } from "@/lib/site";

const description =
  "Research-driven optimization software for weighted ordering problems: exact algorithms, structural decomposition, and formally verified correctness results that can be independently examined.";

export const metadata: Metadata = {
  metadataBase: new URL("https://entropysherlock.github.io"),
  title: { default: "Westfall Optimization — The mathematics of better decisions", template: "%s · Westfall Optimization" },
  description,
  keywords: ["weighted linear ordering", "linear ordering problem", "exact optimization", "structural decomposition", "parameterized algorithms", "formal verification", "Lean"],
  openGraph: {
    type: "website",
    siteName: "Westfall Optimization",
    title: "Westfall Optimization — The mathematics of better decisions",
    description,
    url: "https://entropysherlock.github.io/westfall-optimization/",
    images: [{ url: `${BASE}/og.png`, width: 1200, height: 630, alt: "Westfall Optimization: the mathematics of better decisions" }],
  },
  twitter: { card: "summary_large_image", title: "Westfall Optimization", description, images: [`${BASE}/og.png`] },
};

export const viewport: Viewport = { themeColor: "#0b1a2e", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:bg-navy-900 focus:px-3 focus:py-2 focus:text-white">
          Skip to content
        </a>
        <Nav />
        <main id="main">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
