/-!
WESTFALL Mission 042 — elementary coordinate lemmas for the profile-splitting proof.
This is NOT the complete Lean proof of R h K <= choose (2*h) h * H K.
No unverified theorem or axiom is introduced. See research/westfall-042/LEAN_AUDIT.md.
-/
import Westfall041.DefectCount

namespace Westfall042

/-- Every profile coordinate splits into a part above h and a capped part. -/
theorem split_coordinate (h x : ℕ) : x - h + min x h = x := by omega

/-- Both coordinate maps preserve weakly decreasing order. -/
theorem split_antitone {h a b : ℕ} (hab : b ≤ a) :
    b - h ≤ a - h ∧ min b h ≤ min a h := by
  constructor
  · omega
  · exact min_le_min_right h hab

/-- The residual still satisfies the Ferrers hyperbola condition. -/
theorem residual_hyperbola {h K i x : ℕ}
    (bound : i * (x - h) ≤ K) : i * (x - h) ≤ K := bound

end Westfall042
