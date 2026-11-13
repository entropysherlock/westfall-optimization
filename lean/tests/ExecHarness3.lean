import Westfall022.Exec
open Westfall022

def showRes {n : ℕ} (A : WMat n) : String :=
  match autoCutX A with
  | none => "NONE"
  | some r =>
    let v : String := match (r.1 : Option ℚ) with | none => "bot" | some q => toString q
    s!"{v}|{List.ofFn (fun i => (r.2.1 i).val)}|{objective A r.2.1}|{List.ofFn (fun v => (r.2.2.1 v).val)}|{lamB A r.2.2.1}|{r.2.2.2}"

def A72 : WMat 4 := ![![(0 : ℚ), (1 : ℚ), (1 : ℚ), (-3 : ℚ)], ![(-1 : ℚ), (0 : ℚ), (1 : ℚ), (1 : ℚ)], ![(-1 : ℚ), (-1 : ℚ), (0 : ℚ), (1 : ℚ)], ![(3 : ℚ), (-1 : ℚ), (-1 : ℚ), (0 : ℚ)]]
def A74 : WMat 4 := ![![(0 : ℚ), (1 : ℚ), (-1 : ℚ), (-1 : ℚ)], ![(-1 : ℚ), (0 : ℚ), (8 : ℚ), (8 : ℚ)], ![(1 : ℚ), (-8 : ℚ), (0 : ℚ), (8 : ℚ)], ![(1 : ℚ), (-8 : ℚ), (-8 : ℚ), (0 : ℚ)]]
def A76 : WMat 1 := ![![(0 : ℚ)]]

def main : IO Unit := do
  IO.println s!"72|{showRes A72}"
  (← IO.getStdout).flush
  IO.println s!"74|{showRes A74}"
  (← IO.getStdout).flush
  IO.println s!"76|{showRes A76}"
  (← IO.getStdout).flush
