# Mission 042 Lean formal verification status

## Actually committed
- Pinned Lean project at `research/westfall-041/lean` (Lean 4.32.0, Mathlib v4.32.0).
- New `Westfall042.lean` module with elementary decomposition and monotonicity lemmas for the row-profile split `lambda_i = (lambda_i-h)_+ + min(lambda_i,h)`.
- `Audit042.lean` prints the dependencies of these lemmas.
- `.github/workflows/research-042.yml` separately runs the 042 Lean scaffold build and exact Python profile tests.

## Still not Lean formalized
**The main new cardinality inequality `R h K <= (2*h).choose h * H K` has a complete paper proof but NO Lean theorem.** Similarly `R h K <= 4^h * H K` and the resulting `card_kcuts_le_defect_sharp` corollary are not yet kernel checked. The prior analytic bound on H and the complete cutwidth/OLA algorithms remain outside Lean.

## Remaining formalization task
Construct an injective map from `Rset h K` into `Hset K × BoxPartitions h`. Use `nu_i=(lambda_i-h)_+` padded by zero after h and `tau_i=min(lambda_i,h)`. Prove monotonicity, the hyperbola constraint for `nu`, injectivity from `lambda_i=nu_i+tau_i`, and `card BoxPartitions h = Nat.choose (2*h) h`. Deduce the cardinality inequality and plug it into Mission 041's `card_kcuts_le_defect`. Then run a CLEAN pinned build and inspect printed axioms.

## Verification honesty
The local execution environment has no `lean` or `lake` binary and no outbound network access, so no independent local kernel build is claimed. A successful GitHub action for `Westfall042` means only the elementary lemmas compiled, NOT the full theorem. The exact-integer Python test checked all 180 pairs 0<=h<=8 and 0<=K<=19 and passed.
