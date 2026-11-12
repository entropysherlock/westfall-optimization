import fs from "fs";
import path from "path";
import type { Matrix } from "./engine";

export interface Preset {
  id: string; title: string; family: string; description: string; n: number; integer: boolean; matrix: Matrix;
  reference: {
    solver: string; auto_route: string; status: string; OPT: number; order: number[]; incumbent_order: number[]; incumbent_score: number;
    blocks: number[][] | null; generated: number; retained: number; excluded: number; certified_pairs: number | null; total_pairs: number | null;
    time_s: number; theorem: { K: number | null; b: number | null; X: number | null; zero_cross: number | null; mu_plus: number | null };
    exact_subset_dp: number; certificate: string; certificate_python_verified: boolean; python_verify_s: number;
  };
}
/** Build-time loaders (server components only). */
const pub = (p: string) => path.join(process.cwd(), "public", p);
export const loadPresets = (): Preset[] => JSON.parse(fs.readFileSync(pub("data/presets.json"), "utf8"));
export const loadRepoFile = (rel: string) => fs.readFileSync(path.join(process.cwd(), "..", rel), "utf8");
