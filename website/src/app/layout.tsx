import type { Metadata } from "next";
import "./globals.css";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  metadataBase: new URL("https://entropysherlock.github.io"),
  title: { default: "Westfall Optimization — Discover the structure. Prove the optimum.", template: "%s · Westfall Optimization" },
  description: "Research in exact weighted linear ordering, structural decomposition, partition recovery, Lean formalization, and reproducible algorithms.",
  keywords: ["weighted linear ordering","exact algorithms","parameterized complexity","BLX","cut dynamic programming","formal verification"],
  openGraph: {
    type: "website",
    siteName: "Westfall Optimization",
    title: "Westfall Optimization — Discover the structure. Prove the optimum.",
    description: "Structural optimization research, verified correctness results, algorithms, and reproducible experiments.",
    url: "https://entropysherlock.github.io/westfall-optimization/"
  },
  twitter: {
    card: "summary",
    title: "Westfall Optimization — Theorem & Research",
    description: "Exact structural optimization, algorithms and evidence. Formal mathematics and reproducible computational evidence."
  }
};

export default function RootLayout({children}:{children:React.ReactNode}) {
 return <html lang="en"><body className="min-h-screen">
   <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:bg-cyan-400 focus:px-3 focus:py-2 focus:text-ink-950">Skip to content</a>
   <Nav/><main id="main">{children}</main><Footer/>
 </body></html>;
}
