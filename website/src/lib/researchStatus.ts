/**
 * Single source of truth for the verification status of every research result shown on the website.
 * Levels (strongest first):
 *   lean          — the stated result is checked by the Lean kernel (axiom audit: standard axioms only)
 *   partial       — some supporting lemmas are Lean-checked, the full result is not
 *   proved        — human-readable proof only (not peer reviewed unless stated)
 *   computational — checked by independent programs / exhaustive or exact computation, not a proof
 *   draft         — a candidate proof under review; not externally checked
 *   conjecture    — supported by evidence, unproved
 *   experimental  — software capability under test; correctness evidence is computational
 * Tests (tests/site038.test.ts) pin the statuses of the provisional items so they cannot drift upward.
 */
import { blob, leanBlob, REPO } from "./site";

export type Level = "lean" | "partial" | "proved" | "computational" | "draft" | "conjecture" | "experimental";

export interface ResearchItem {
  id: string;
  title: string;
  statement: string;
  level: Level;
  /** Secondary evidence (e.g. a proved result that is also computationally checked). */
  also?: Level[];
  status: string;
  source: string;
  sourceLabel: string;
  inProgress?: boolean;
}

export const LEVEL_LABEL: Record<Level, string> = {
  lean: "Lean kernel-checked",
  partial: "Partially Lean-formalized",
  proved: "Human-readable proof",
  computational: "Computationally checked",
  draft: "Proof draft · unreviewed",
  conjecture: "Conjecture",
  experimental: "Experimental",
};

export const RESEARCH: ResearchItem[] = [
  {
    id: "structural-theorem", title: "Westfall structural optimization theorem (AutoCut)",
    statement: "A deterministic algorithm returns the optimum, an optimal ordering and a partition attaining λ(A) = min_B (b² + 3K₀), using poly(n)·2^{O(√λ)} arithmetic operations (unit-cost model).",
    level: "lean", also: ["computational"], status: "Kernel-checked on the formal/westfall-theorem branch (Mission 025). Bit-level complexity and novelty are open; the manuscript is not peer reviewed.",
    source: leanBlob("MISSION_025_REPORT.md"), sourceLabel: "Formal verification report",
  },
  {
    id: "exchange-localization", title: "Exchange localization and the λ(A) parameter",
    statement: "Cross-block inversions of any optimal prefix are bounded by K₀(B); λ(A) bounds the weak-majority cut of every optimal prefix.",
    level: "lean", status: "Kernel-checked (Mission 025).", source: leanBlob("FORMALIZATION_STATUS.md"), sourceLabel: "Formalization status",
  },
  {
    id: "block-localization", title: "Square-root block localization (supplied partition)",
    statement: "With a supplied ordered partition of largest block b, the prefix states an exact search must keep are bounded by (n+1)·P(2K+b²).",
    level: "proved", status: "Manuscript proof; not peer reviewed and not Lean-checked.", source: "/research/paper/", sourceLabel: "Manuscript",
  },
  {
    id: "exclusion-dp", title: "Exclusion DP and exact certificates (BLX)",
    statement: "Prefix states provably unable to beat an incumbent are discarded by admissible bounds; optimality certificates are checked by an independent exact-integer checker.",
    level: "proved", also: ["computational"], status: "Admissibility argued in the manuscripts; certificates re-checked by a separate program.", source: blob("docs/certificates.md"), sourceLabel: "Certificates",
  },
  {
    id: "atlas-032", title: "ATLAS-032 exact solver (cycle-packing residual bounds)",
    statement: "Strong-component decomposition, cut-bounded prefix DP and the pruning rule β_S + cut(S) + ⌈L(V∖S)⌉ ≥ B with directed-cycle packing bounds. Standard techniques (3-dicycle relaxation; prefix branch-and-bound), not new theorems.",
    level: "proved", also: ["computational"], status: "Short human-readable proofs (PROOFS.md); 50 unit tests; certificates accepted by two independent verifiers (Python and in-browser). The implementation is NOT Lean-verified.",
    source: blob("benchmarks/atlas-032/PROOFS.md"), sourceLabel: "Proofs",
  },
  {
    id: "kcut-counting", title: "k-cuts of semicomplete digraphs: N_k(D) ≤ (n+1)·H(c+k)",
    statement: "If a semicomplete digraph has an ordering of width ≤ c, it has at most (n+1)·H(c+k) k-cuts, where H(K) counts partitions with iλ_i ≤ K; with H(K) ≤ e^{2π√K} this would give n·2^{O(√k)} for cutwidth ≤ k, the bound asked for by Fomin and Pilipczuk (2013).",
    level: "draft", also: ["partial", "computational"], inProgress: true,
    status: "Candidate proof in draft PR #10 (not merged). A supporting cut inequality was reported Lean-checked on research/discovery-028; the injection itself is not formalized. Exhaustively tested on all semicomplete digraphs with n ≤ 5. Not externally reviewed; novelty not established. The 2013 question is NOT claimed as solved.",
    source: `${REPO}/pull/10`, sourceLabel: "Draft PR #10",
  },
  {
    id: "hyperbola-leading", title: "Hyperbola partitions: log H(K) = 2π√K + o(√K)",
    statement: "H(K) ≤ e^{2π√K} for every K ≥ 1, with matching leading-order lower bound.",
    level: "draft", also: ["computational"], inProgress: true,
    status: "Proof in research notes (Missions 028–029, independently re-derived); exact integer values reported checked to K = 10⁶ (NT-035, cited in draft PR #11). Not peer reviewed; the counting result may be classical.",
    source: `${REPO}/tree/research/discovery-028`, sourceLabel: "research/discovery-028",
  },
  {
    id: "airy-representation", title: "Exact tilted-walk representation of H(K)",
    statement: "H(K) = e^{A_K}·Q_K with an exact product of finite-state transfer kernels for Q_K, and A_K = 2π√K + O(log K).",
    level: "draft", inProgress: true, status: "Proved in the draft note NT-037 (draft PR #11); not externally audited or Lean-checked.",
    source: `${REPO}/pull/11`, sourceLabel: "Draft PR #11",
  },
  {
    id: "airy-conjecture", title: "Airy correction: log H(K) = 2π√K − c_Airy·K^{1/6} + o(K^{1/6})",
    statement: "c_Airy = |a₁|·2^{−2/3}·Γ(1/6)²/Γ(1/3) ≈ 17.0353, from the lowest eigenvalue of a hard-wall Airy operator integrated along the hyperbola.",
    level: "conjecture", also: ["computational"], inProgress: true,
    status: "UNPROVED. Open: a spectral limit for products of non-identical transfer operators, floor-increment homogenization, singular endpoints, normalization, and comparison with Ferrari–Spohn / area-tilted walk results. Numerics fit a coefficient near 17.04.",
    source: `${REPO}/pull/11`, sourceLabel: "Draft PR #11",
  },
  {
    id: "cutwidth-solver", title: "Directed cutwidth solver for semicomplete digraphs",
    statement: "Exact minimum cutwidth by prefix-state search; for semicomplete inputs the k-cut count above is used as an optional early-stop certificate.",
    level: "experimental", also: ["computational"], inProgress: true,
    status: "Agrees with an independent subset DP on 300 random digraphs. The state cap depends on the unreviewed k-cut bound and is only applied to semicomplete input; it never triggered in benchmarks.",
    source: blob("website/src/lib/studio/cutwidth.ts"), sourceLabel: "Source",
  },
];
