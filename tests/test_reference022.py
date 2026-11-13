"""Independent checks for the exact small-n 022 reference."""
import random
import unittest

from research.discovery_022.reference_exact import (
    analyze, all_ordered_partitions, k0, robust_condorcet_lambda, validate_matrix
)


class Reference022Tests(unittest.TestCase):
    def test_partition_count(self):
        self.assertEqual(sum(1 for _ in all_ordered_partitions((0, 1, 2, 3))), 75)

    def test_zero_weight_ties(self):
        a = [[0] * 4 for _ in range(4)]
        result = analyze(a)
        self.assertTrue(result["localization_bound_holds"])
        self.assertEqual(result["optimal_score"], 0)
        self.assertEqual(result["lambda"], 16)

    def test_exact_random_instances(self):
        rng = random.Random(22026)
        for n in (3, 4, 5):
            for _ in range(6 if n < 5 else 2):
                a = [[0] * n for _ in range(n)]
                for i in range(n):
                    for j in range(i + 1, n):
                        a[i][j] = rng.randint(-3, 3)
                        a[j][i] = -a[i][j]
                outcome = analyze(a)
                self.assertLessEqual(outcome["max_optimal_prefix_weak_cut"],
                                     outcome["lambda"])

    def test_wrong_type_rejected(self):
        with self.assertRaises(ValueError):
            validate_matrix([[0, 0.5], [-0.5, 0]])


if __name__ == "__main__":
    unittest.main()
