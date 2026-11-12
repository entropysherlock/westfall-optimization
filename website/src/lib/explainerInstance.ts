import type { Matrix } from "./engine";

/** Fixed 7-vertex instance used by the exclusion-DP explainer (two cyclic blocks, one reversed cross pair). */
export const INSTANCE: Matrix = (() => {
  const n = 7;
  const A: Matrix = Array.from({ length: n }, () => Array(n).fill(0));
  const set = (i: number, j: number, v: number) => { A[i][j] = v; A[j][i] = -v; };
  // block 1: weighted 3-cycle 0->1->2->0
  set(0, 1, 3); set(1, 2, 2); set(2, 0, 1);
  // block 2: 4-cycle-ish tournament on 3..6
  set(3, 4, 2); set(4, 5, 2); set(5, 6, 2); set(6, 3, 1); set(3, 5, 1); set(4, 6, -1);
  // cross: block 1 before block 2 (weight 2), one reversed pair
  for (let i = 0; i < 3; i++) for (let j = 3; j < 7; j++) set(i, j, 2);
  set(2, 6, -1);
  return A;
})();
export const BLOCKS = [[0, 1, 2], [3, 4, 5, 6]];
