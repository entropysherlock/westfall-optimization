/* Mission 047 — exhaustive test of the Two-Tournament Extremal Conjecture (forward model).
   Vertices 0..n-1 in reference order; U = complement of G; every U-edge i<j is the arc i->j (width c = 0),
   so b(X) = inv_U(X) = #{i<j : ij in U, i not in X, j in X}.  alpha(U) <= 2  <=>  G triangle-free.
   For every labelled triangle-free G on n vertices we compute N_k for all k and record:
     best[k]  = max over all triangle-free G,
     bestT[k] = max over "two disjoint tournaments" (G = complete bipartite between S and its complement, any S),
     count of G with N_k > bestT[k] (counterexamples to exact extremality).
   Usage: ./extremal n            (exhaustive over all 2^(n choose 2) labelled G)
          ./extremal n samples s  (random triangle-free G, greedy-random construction, seed s) */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdint.h>
#define KMAX 40
static int n, m, pu[64], pv[64];
static uint32_t gadj[16];
static long long best[KMAX+1], bestT[KMAX+1], beats[KMAX+1];
static uint64_t bestG[KMAX+1];

static void counts(const uint32_t *g, long long *N) {
    uint32_t low[16];
    for (int j = 0; j < n; j++) low[j] = (~g[j]) & ((1u << j) - 1);  /* U-neighbours below j */
    long long h[KMAX+2]; memset(h, 0, sizeof h);
    for (uint32_t X = 0; X < (1u << n); X++) {
        int inv = 0; uint32_t notX = ~X;
        for (int j = 0; j < n; j++) if (X >> j & 1) inv += __builtin_popcount(low[j] & notX);
        h[inv > KMAX ? KMAX+1 : inv]++;
    }
    long long s = 0; for (int k = 0; k <= KMAX; k++) { s += h[k]; N[k] = s; }
}
static int triangle_free(const uint32_t *g) {
    for (int u = 0; u < n; u++) for (int v = u+1; v < n; v++) if ((g[u] >> v & 1) && (g[u] & g[v])) return 0;
    return 1;
}
static void process(const uint32_t *g, uint64_t code) {
    long long N[KMAX+1]; counts(g, N);
    for (int k = 0; k <= KMAX; k++) {
        if (N[k] > best[k]) { best[k] = N[k]; bestG[k] = code; }
        if (N[k] > bestT[k]) beats[k]++;
    }
}
int main(int argc, char **argv) {
    n = atoi(argv[1]); m = 0;
    for (int u = 0; u < n; u++) for (int v = u+1; v < n; v++) { pu[m] = u; pv[m] = v; m++; }
    /* two-tournament baseline: all S subset of [n] */
    for (int k = 0; k <= KMAX; k++) bestT[k] = 0;
    for (uint32_t S = 0; S < (1u << n); S++) {
        uint32_t g[16];
        for (int u = 0; u < n; u++) { g[u] = 0; for (int v = 0; v < n; v++) if (u != v && ((S>>u&1) != (S>>v&1))) g[u] |= 1u << v; }
        long long N[KMAX+1]; counts(g, N);
        for (int k = 0; k <= KMAX; k++) if (N[k] > bestT[k]) bestT[k] = N[k];
    }
    long long graphs = 0;
    if (argc == 2) {
        for (uint64_t code = 0; code < (1ull << m); code++) {
            uint32_t g[16]; memset(g, 0, sizeof g);
            for (int e = 0; e < m; e++) if (code >> e & 1) { g[pu[e]] |= 1u << pv[e]; g[pv[e]] |= 1u << pu[e]; }
            if (!triangle_free(g)) continue;
            graphs++; process(g, code);
        }
    } else {
        long long samples = atoll(argv[3]); srand(atoi(argv[4]));
        for (long long t = 0; t < samples; t++) {
            uint32_t g[16]; memset(g, 0, sizeof g); uint64_t code = 0;
            int dens = rand() % 100;
            int perm[64]; for (int e = 0; e < m; e++) perm[e] = e;
            for (int e = m-1; e > 0; e--) { int r = rand() % (e+1); int tmp = perm[e]; perm[e] = perm[r]; perm[r] = tmp; }
            for (int i = 0; i < m; i++) { int e = perm[i]; int u = pu[e], v = pv[e];
                if (rand() % 100 < dens && !(g[u] & g[v])) { g[u] |= 1u << v; g[v] |= 1u << u; code |= 1ull << e; } }
            graphs++; process(g, code);
        }
    }
    printf("{\"n\": %d, \"triangle_free_graphs\": %lld, \"rows\": [", n, graphs);
    for (int k = 0; k <= KMAX && k <= m; k++)
        printf("%s{\"k\": %d, \"max_N\": %lld, \"two_tournament_max\": %lld, \"graphs_beating_two_tournaments\": %lld, \"argmax_code\": %llu}",
               k ? ", " : "", k, best[k], bestT[k], beats[k], (unsigned long long)bestG[k]);
    printf("]}\n");
    return 0;
}
