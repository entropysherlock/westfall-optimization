import Westfall042

/-!
WESTFALL Mission 043 — proof infrastructure for the sharpened defect-profile bound.
These lemmas are universal and are NOT substitutes for the desired cardinality inequality.
No sorry, admit, or additional axioms.
-/
open Finset Westfall041 Westfall040

namespace Westfall043

/-- Coordinatewise residual and box parts of a profile. -/
def residual {h K : ℕ} (r : Fin h → Fin (K + h + 1)) (i : Fin h) : ℕ :=
  (r i).val - h

def boxed {h K : ℕ} (r : Fin h → Fin (K + h + 1)) (i : Fin h) : ℕ :=
  min (r i).val h

/-- The row profile is recovered exactly from its two pieces. -/
theorem split_reconstruct {h K : ℕ} (r : Fin h → Fin (K + h + 1)) (i : Fin h) :
    residual r i + boxed r i = (r i).val := by
  simp only [residual, boxed]
  omega

/-- Both pieces preserve antitonicity. -/
theorem split_profile_antitone {h K : ℕ}
    (r : Fin h → Fin (K + h + 1))
    (hr : ∀ i j : Fin h, i ≤ j → r j ≤ r i)
    (i j : Fin h) (hij : i ≤ j) :
    residual r j ≤ residual r i ∧ boxed r j ≤ boxed r i := by
  have hval : (r j).val ≤ (r i).val := (hr i j hij).val
  constructor
  · unfold residual
    omega
  · unfold boxed
    exact min_le_min_right h hval

/-- Each residual part obeys the unshifted hyperbola inequality. -/
theorem residual_hyperbola {h K : ℕ}
    (r : Fin h → Fin (K + h + 1))
    (hr : r ∈ Rset h K) (i : Fin h) :
    (i.val + 1) * residual r i ≤ K := by
  have hi := (Finset.mem_filter.mp hr).2.2 i
  simpa only [residual] using hi

/-- Each box coordinate is at most h. -/
theorem boxed_le {h K : ℕ} (r : Fin h → Fin (K + h + 1)) (i : Fin h) :
    boxed r i ≤ h := by
  exact min_le_right _ _

/-- The pair of residual and box profiles determines its original row profile. -/
theorem split_injective {h K : ℕ}
    {r s : Fin h → Fin (K + h + 1)}
    (hres : residual r = residual s)
    (hbox : boxed r = boxed s) : r = s := by
  funext i
  apply Fin.ext
  have hr := split_reconstruct r i
  have hs := split_reconstruct s i
  have he1 := congrFun hres i
  have he2 := congrFun hbox i
  omega

end Westfall043
