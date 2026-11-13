/**
 * Mission 039 — the evidence ladder shown in the Verification workspace.
 *
 * Six distinct levels of mathematical evidence. They are NOT interchangeable, and a level is reported as
 * established only on the basis named in `basis`. Pure function; tested in tests/studio039.test.ts.
 */
import type { Verdict } from "./certverify";
import type { SolveResult } from "./report";

export type EvidenceState = "established" | "failed" | "not-available" | "pending";
export interface EvidenceStep { id: string; title: string; meaning: string; state: EvidenceState; basis: string }

export function evidenceLadder(r: SolveResult, verdict: Verdict | null): EvidenceStep[] {
  const v = r.verification;
  const a = r.atlas;
  const proved = r.status === "OPTIMAL";
  const steps: EvidenceStep[] = [];
  steps.push({
    id: "feasible", title: "Feasible ordering",
    meaning: "The returned answer is a valid ordering of every item exactly once.",
    state: v.permutation ? "established" : "failed",
    basis: v.permutation ? "checked on this page: a permutation of all items" : "the returned ordering is not a permutation",
  });
  steps.push({
    id: "recompute", title: "Objective recomputation",
    meaning: "The objective value was recomputed from your original data in exact rational arithmetic, independently of the solver's own value.",
    state: v.objectiveRecomputed && v.identityHolds ? "established" : "failed",
    basis: v.objectiveRecomputed && v.identityHolds ? "exact recomputation from the input; the affine identity with F_A holds" : "recomputation or identity check failed",
  });
  const hasBound = !!a?.objectiveBound;
  steps.push({
    id: "bound", title: "Rigorous bound",
    meaning: "A proven limit on how good any ordering can be, so the gap to the returned objective is known.",
    state: hasBound ? "established" : proved ? "established" : "not-available",
    basis: hasBound
      ? `cycle-packing lower bound on β* summed over strong components (PROOFS.md Lemmas 1–5)${a!.gap === "0" ? "; it meets the objective (gap 0)" : `; gap ${a!.gap}`}`
      : proved ? "the exact solver's completed search: the objective itself is the bound" : r.solver === "heuristic" ? "a heuristic computes no bound" : "this run produced no bound (only ATLAS-032 reports bounds for interrupted runs)",
  });
  steps.push({
    id: "certificate", title: "Complete optimality certificate",
    meaning: "A self-contained file from which optimality can be re-established by a different, simpler program.",
    state: a?.certificate ? "established" : "not-available",
    basis: a?.certificate ? "ATLAS-032 certificate: decomposition, per-component orders, β and cycle packings" : a ? a.certificateNote : "only ATLAS-032 produces exportable certificates in the browser",
  });
  steps.push({
    id: "independent", title: "Independently accepted certificate",
    meaning: "A separate verifier that shares no code with the solver accepted the certificate in exact integer arithmetic.",
    state: !a?.certificate ? "not-available" : verdict === null ? "pending" : verdict.verdict === "ACCEPTED" ? "established" : "failed",
    basis: !a?.certificate ? "no certificate to check" : verdict === null ? "not run yet" : `${verdict.verdict}: ${verdict.reason} (certverify.ts, BigInt arithmetic, ${verdict.ms.toFixed(0)} ms)`,
  });
  steps.push({
    id: "lean", title: "Lean machine verification",
    meaning: "A proof checked by the Lean kernel.",
    state: "not-available",
    basis: r.solver === "autocut"
      ? "the AutoCut algorithm is Lean kernel-checked (formal/westfall-theorem); this browser port is tested against the Lean executable but is not itself verified, and this particular run is not a Lean proof"
      : "no browser run is a Lean proof; ATLAS-032 and the other browser solvers are not formally verified",
  });
  return steps;
}

/** Plain-language summary of what was established and what remains uncertain. */
export function evidenceSummary(r: SolveResult, verdict: Verdict | null): { established: string; uncertain: string } {
  const a = r.atlas;
  if (r.status === "OPTIMAL") {
    if (verdict?.verdict === "ACCEPTED") return { established: "The ordering is optimal for the exact integer model, and an independent verifier re-established this from the certificate.", uncertain: "Correctness of the verifier and the browser runtime themselves (they are tested programs, not formal proofs)." };
    if (a?.certificate) return { established: "The solver completed an exact search and produced a certificate.", uncertain: "Run the independent verifier to re-establish optimality without trusting the solver." };
    return { established: "The exact solver completed under its stated assumptions; checks on this page confirm the objective.", uncertain: r.verification.bruteForce?.agrees ? "Nothing beyond the solver code: exhaustive enumeration also confirmed the optimum." : "No exportable certificate exists for this solver; optimality rests on the solver implementation." };
  }
  if (r.status === "INTERRUPTED") return { established: `A valid ordering with the reported objective${a?.objectiveBound ? `, and a rigorous bound (gap ${a.gap})` : ""}.`, uncertain: "Whether the ordering is optimal: the exact search did not finish." };
  return { established: "A valid ordering with an exactly recomputed objective.", uncertain: "Optimality: a heuristic never proves it, and no bound was computed." };
}
