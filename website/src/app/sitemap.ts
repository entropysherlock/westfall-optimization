import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export const dynamic = "force-static";

// Canonical, indexable pages only. /lab and /research/discovery-022 are redirects and are left out.
const ROUTES = [
  "", "studio/", "case-studies/forty-items/", "research/", "research/theorem/", "research/manuscript/", "research/paper/", "formal-verification/",
  "verify/", "benchmarks/", "technology/", "applications/", "explainer/", "docs/", "docs/api/", "roadmap/", "about/", "contact/",
];

export default function sitemap(): MetadataRoute.Sitemap {
  return ROUTES.map((r) => ({ url: `${SITE_URL}${r}`, changeFrequency: "monthly", priority: r === "" ? 1 : r === "studio/" ? 0.9 : 0.6 }));
}
