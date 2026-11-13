export const BASE = process.env.NEXT_PUBLIC_BASE_PATH || "";
export const REPO = "https://github.com/entropysherlock/westfall-optimization";
export const SITE_URL = "https://entropysherlock.github.io/westfall-optimization/";
export const asset = (p: string) => `${BASE}/${p.replace(/^\//, "")}`;
export const blob = (p: string) => `${REPO}/blob/main/${p}`;
export const tree = (p: string) => `${REPO}/tree/main/${p}`;

/** Research branch evidence, pinned to the Mission 025 verified commit. */
export const RESEARCH_BRANCH = "formal/westfall-theorem";
export const RESEARCH_COMMIT = "5de1b5b60d770a6d3bf447665576e5f92ff2e334";
export const RESEARCH_CI = "https://github.com/entropysherlock/westfall-optimization/actions/runs/43419080867";
export const leanBlob = (p: string) => `${REPO}/blob/${RESEARCH_COMMIT}/lean/${p}`;
export const leanTree = (p = "") => `${REPO}/tree/${RESEARCH_COMMIT}/lean/${p}`;
export const branchTree = `${REPO}/tree/${RESEARCH_BRANCH}`;
export const ISSUES = `${REPO}/issues`;

/** Optional deployment configuration (public values only; never secrets). */
export const STUDIO_API_URL = process.env.NEXT_PUBLIC_STUDIO_API_URL || "";
export const CONTACT_ENDPOINT = process.env.NEXT_PUBLIC_CONTACT_ENDPOINT || "";
