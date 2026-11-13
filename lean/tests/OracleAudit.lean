import Westfall022.Complexity
open Lean Meta Elab Command

/-- Transitively collect the constants reachable from `root` through *definition bodies*
(theorem proofs are not followed: they carry no computational content). -/
partial def defClosure (env : Environment) (root : Name) : NameSet := Id.run do
  let mut seen : NameSet := {}
  let mut todo : List Name := [root]
  while !todo.isEmpty do
    let c := todo.head!
    todo := todo.tail!
    if seen.contains c then continue
    seen := seen.insert c
    match env.find? c with
    | some (.defnInfo d) => todo := d.value.getUsedConstants.toList ++ d.type.getUsedConstants.toList ++ todo
    | some (.opaqueInfo d) => todo := d.value.getUsedConstants.toList ++ todo
    | _ => pure ()
  return seen

elab "#oracle_audit " root:ident : command => do
  let env ← getEnv
  let cl := defClosure env root.getId
  let forbidden := [``Westfall022.lam, ``Westfall022.lamB, ``Westfall022.OPT, ``Westfall022.objective,
    ``Westfall022.IsOptimal, ``Westfall022.autoCut, ``Westfall022.recognize, ``Westfall022.argPred,
    ``Westfall022.bestCand, ``Westfall022.dpLast, ``Classical.choice, ``Classical.choose, ``Nat.find]
  let hits := forbidden.filter cl.contains
  let ours := cl.toList.filter (fun n => (`Westfall022).isPrefixOf n)
  logInfo m!"{root.getId}: {cl.size} constants in definition closure, {ours.length} in Westfall022; forbidden reachable: {hits}"
  logInfo m!"Westfall022 definitions used: {ours.toArray.qsort (·.toString < ·.toString)}"

#oracle_audit Westfall022.autoCutX
#oracle_audit Westfall022.recognizeX
#oracle_audit Westfall022.recognize
