/**
 * Example problems for Westfall Optimization Studio. Each example is plain input text (exactly
 * what a user would upload), so loading one is fully transparent.
 */
import type { Interpretation } from "./parse";

export interface Example {
  id: string;
  title: string;
  domain: string;
  format: "matrix" | "edges" | "json";
  interpretation: Interpretation;
  note: string;
  text: string;
}

/* Single-machine sequencing: Σ w_j C_j = Σ_j w_j p_j + Σ_{i before j} p_i w_j, so d_ij = p_i·w_j (cost).
   Extra pairwise penalties model persistent effects (e.g. contamination that affects every later job). */
const jobs = [
  ["J1", 4, 2], ["J2", 2, 3], ["J3", 6, 5], ["J4", 3, 1], ["J5", 5, 4], ["J6", 1, 2], ["J7", 3, 3],
] as const;
const penalties: Record<string, number> = { "J3>J1": 9, "J5>J2": 6, "J2>J6": 4, "J7>J4": 5 };
const seqRows = jobs.map(([a, pa], i) =>
  [a, ...jobs.map(([b, , wb], j) => (i === j ? 0 : pa * wb + (penalties[`${a}>${b}`] ?? 0)))].join(","),
);
const SEQ = [",", jobs.map((j) => j[0]).join(",")].join("") + "\n" + seqRows.join("\n") + "\n";

/* Kemeny rank aggregation: 5 judges rank 6 candidates; c_ij = number of judges preferring i to j. */
const ballots = [
  ["Ames", "Baker", "Chen", "Diaz", "Evans", "Ford"],
  ["Baker", "Ames", "Diaz", "Chen", "Ford", "Evans"],
  ["Chen", "Ames", "Baker", "Evans", "Diaz", "Ford"],
  ["Ames", "Chen", "Baker", "Ford", "Evans", "Diaz"],
  ["Baker", "Chen", "Ames", "Diaz", "Ford", "Evans"],
];
const cands = ballots[0];
const kemenyRows = cands.map((a) =>
  [a, ...cands.map((b) => (a === b ? 0 : ballots.filter((r) => r.indexOf(a) < r.indexOf(b)).length))].join(","),
);
const KEMENY = "," + cands.join(",") + "\n" + kemenyRows.join("\n") + "\n";

export const EXAMPLES: Example[] = [
  {
    id: "sequencing",
    title: "Single-machine job sequencing",
    domain: "Manufacturing",
    format: "matrix",
    interpretation: "cost",
    note:
      "Seven jobs with processing times p and weights w. Total weighted completion time equals a constant plus Σ p_i·w_j over every pair with i before j, so d_ij = p_i·w_j. Four extra pairwise penalties model persistent effects (for example contamination that affects every later job). Adjacency-only changeover costs are NOT of this form.",
    text: SEQ,
  },
  {
    id: "kemeny",
    title: "Rank aggregation (Kemeny)",
    domain: "Decision analysis",
    format: "matrix",
    interpretation: "benefit",
    note: "Five judges ranked six candidates. Entry (i, j) counts the judges who placed i above j. Maximising total agreement gives a Kemeny consensus ranking.",
    text: KEMENY,
  },
  {
    id: "tournament",
    title: "Tournament ranking from match margins",
    domain: "Sports & competitions",
    format: "edges",
    interpretation: "skew",
    note: "Each line is a match: winner, loser, margin. A margin is a skew-symmetric weight (the reverse pair gets the negative). The optimal ordering minimises total margin of upsets.",
    text: `from,to,weight
Harbor,Summit,3
Summit,Pioneers,2
Pioneers,Harbor,1
Harbor,Ridge,4
Ridge,Summit,1
Pioneers,Ridge,2
Valley,Harbor,1
Summit,Valley,5
Valley,Pioneers,3
Ridge,Valley,2
`,
  },
  {
    id: "survey",
    title: "Pairwise preference survey",
    domain: "Product & market research",
    format: "edges",
    interpretation: "benefit",
    note: "Respondents compared feature pairs; each line counts how many preferred the first feature. Repeated pairs are summed. Unobserved pairs contribute nothing.",
    text: `from,to,weight
Battery,Camera,41
Camera,Battery,29
Battery,Price,22
Price,Battery,48
Camera,Price,30
Price,Camera,40
Storage,Camera,18
Camera,Storage,52
Storage,Battery,25
Battery,Storage,45
Price,Storage,51
Storage,Price,19
Display,Battery,33
Battery,Display,37
Display,Camera,36
Camera,Display,34
Display,Price,27
Price,Display,43
Display,Storage,47
Storage,Display,23
`,
  },
  {
    id: "ties",
    title: "Negative weights and ties (JSON)",
    domain: "Test case",
    format: "json",
    interpretation: "skew",
    note: "A skew-symmetric instance with zero, negative and fractional entries. It has several optimal orderings.",
    text: JSON.stringify(
      {
        title: "Ties and fractions",
        interpretation: "skew",
        names: ["a", "b", "c", "d", "e"],
        matrix: [
          ["0", "1", "-1/2", "0", "2"],
          ["-1", "0", "1", "1", "0"],
          ["1/2", "-1", "0", "1", "-1"],
          ["0", "-1", "-1", "0", "1"],
          ["-2", "0", "1", "-1", "0"],
        ],
      },
      null,
      2,
    ),
  },
];

/** A larger random near-transitive instance (for the heuristic), generated deterministically. */
export function largeExample(n = 60, seed = 2026): Example {
  let a = seed >>> 0;
  const rnd = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const lines = ["from,to,weight"];
  for (let i = 0; i < n; i++)
    for (let j = i + 1; j < n; j++) {
      if (rnd() < 0.55) continue;
      const w = 1 + Math.floor(rnd() * 9);
      const [u, v] = rnd() < 0.18 ? [j, i] : [i, j];
      lines.push(`T${String(u + 1).padStart(2, "0")},T${String(v + 1).padStart(2, "0")},${w}`);
    }
  return {
    id: "large",
    title: `Large instance (n = ${n})`,
    domain: "Scale test",
    format: "edges",
    interpretation: "skew",
    note: "Too large for the exact browser solvers; use the local search heuristic, which returns a feasible ordering without an optimality claim.",
    text: lines.join("\n") + "\n",
  };
}
