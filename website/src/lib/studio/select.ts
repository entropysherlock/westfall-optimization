/**
 * Recommended-solver rules for the Studio. Pure function of the built Problem; every recommendation carries
 * the reasons it was made. For very large dense components, it recommends a feasible heuristic rather than
 * an exact method with little practical chance of finishing, and explicitly explains that tradeoff.
 *
 * Measured basis (benchmarks/atlas-032/RESULTS.md, 30 s, one thread): ATLAS-032 proved all instances with
 * strong components up to n = 30 in the suite, 3 of 6 dense n = 35 instances, and all 50 LOLIB IO instances
 * (n = 44–79). Dense single components above ~35 items may not finish; the run then returns its best ordering
 * with a rigorous gap.
 */
import type { Problem } from "./model";
import { strongComponents } from "./decompose";
import type { SolverId } from "./catalog";
import { SOLVERS } from "./catalog";

export interface Recommendation {
  solver: SolverId;
  reasons: string[];
  warnings: string[];
  profile: { n: number; components: number; largest: number; density: number; zeroPairs: number; integral: boolean };
}

export function recommendSolver(p: Problem): Recommendation {
  const n = p.n;
  const pairs = (n * (n - 1)) / 2;
  const dec = strongComponents(p.M);
  const largest = dec.components.reduce((m, c) => Math.max(m, c.length), 0);
  const density = pairs ? p.stats.nonzeroPairs / pairs : 0;
  const profile = { n, components: dec.components.length, largest, density, zeroPairs: p.stats.zeroPairs, integral: p.exact };
  const reasons: string[] = [], warnings: string[] = [];
  if (!p.exact) warnings.push("The model is not in exact 53-bit integer arithmetic, so no solver can certify optimality (results are labelled FEASIBLE) and ATLAS's cycle bounds are disabled.");
  const atlasMax = SOLVERS.find((s) => s.id === "atlas")!.maxN;
  if (n <= 9 && p.exact) {
    reasons.push(`${n} ≤ 9 items: AutoCut solves exactly and also recovers the structural partition attaining λ(A); the result is independently checked by exhaustive enumeration.`);
    return { solver: "autocut", reasons, warnings, profile };
  }
  // Dense, large single components can exhaust a browser worker before ATLAS reports a result.
  // Prefer a usable ordering; users can still explicitly select ATLAS to seek proof.
  if (largest >= 80 && density >= 0.6) {
    reasons.push(`A dense, strongly connected component of ${largest} items is beyond the reliable exact benchmark range.`);
    reasons.push("Local search returns a feasible ordering without claiming optimality.");
    warnings.push("For an optimality proof, select ATLAS manually; it may exceed the time or memory budget.");
    return { solver: "heuristic", reasons, warnings, profile };
  }
  if (n <= atlasMax) {
    reasons.push(`${n} items: ATLAS-032 is the adaptive exact solver for up to ${atlasMax} items.`);
    reasons.push(dec.components.length > 1
      ? `The strict preference graph splits into ${dec.components.length} strongly connected components (largest ${largest}); each is solved separately, which is exact.`
      : `The instance is one strongly connected component of ${largest} items, so decomposition does not help.`);
    if (largest > 13 && p.exact) reasons.push("Components above 13 items use the cut-bounded DP with the cycle-packing lower bound and strict incumbent proving.");
    if (p.stats.zeroPairs > 0 && p.exact) reasons.push(`${p.stats.zeroPairs} tied pairs: the longer-cycle bound extension (on by default) matters on tie-heavy input.`);
    if (largest > 35 && density > 0.6) warnings.push(`A dense component of ${largest} items may not be proved optimal within the time limit (dense n = 35 instances were only half-solved in the benchmark). The best ordering found and a rigorous gap are returned.`);
    else if (largest > 80) warnings.push(`A component of ${largest} items is larger than any benchmarked component; proof is not guaranteed.`);
    return { solver: "atlas", reasons, warnings, profile };
  }
  reasons.push(`${n} items exceeds every exact browser solver's limit (${atlasMax}); only the local-search heuristic applies, and its result is never labelled optimal.`);
  return { solver: "heuristic", reasons, warnings, profile };
}
