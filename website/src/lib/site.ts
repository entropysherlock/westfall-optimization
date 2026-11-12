export const BASE = process.env.NEXT_PUBLIC_BASE_PATH || "";
export const REPO = "https://github.com/entropysherlock/westfall-optimization";
export const asset = (p: string) => `${BASE}/${p.replace(/^\//, "")}`;
export const blob = (p: string) => `${REPO}/blob/main/${p}`;
export const tree = (p: string) => `${REPO}/tree/main/${p}`;
