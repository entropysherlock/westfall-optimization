/* Hill-climb over vertex orders to maximise N_k of the forward-model digraph whose non-adjacency graph is G.
   stdin: n, n masks, k, restarts, iters, seed.  Prints the best N_k found. */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdint.h>
int n; uint32_t g[20];
static long long eval(const int *p, int k) {
    uint32_t low[20];
    for (int j = 0; j < n; j++) { low[j] = 0; for (int i = 0; i < j; i++) if (!(g[p[j]] >> p[i] & 1)) low[j] |= 1u << i; }
    long long cnt = 0;
    for (uint32_t X = 0; X < (1u << n); X++) { int inv = 0; uint32_t nX = ~X;
        for (int j = 0; j < n && inv <= k; j++) if (X >> j & 1) inv += __builtin_popcount(low[j] & nX);
        if (inv <= k) cnt++; }
    return cnt;
}
int main(void) {
    int k, R, I, seed; if (scanf("%d", &n) != 1) return 1;
    for (int i = 0; i < n; i++) if (scanf("%u", &g[i]) != 1) return 1;
    if (scanf("%d %d %d %d", &k, &R, &I, &seed) != 4) return 1; srand(seed);
    long long best = 0; int p[20];
    for (int r = 0; r < R; r++) {
        for (int i = 0; i < n; i++) p[i] = i;
        for (int i = n-1; i > 0; i--) { int j = rand() % (i+1); int t = p[i]; p[i] = p[j]; p[j] = t; }
        long long cur = eval(p, k);
        for (int it = 0; it < I; it++) {
            int a = rand() % n, b = rand() % n; if (a == b) continue;
            int t = p[a]; p[a] = p[b]; p[b] = t;
            long long v = eval(p, k);
            if (v >= cur) cur = v; else { t = p[a]; p[a] = p[b]; p[b] = t; }
        }
        if (cur > best) best = cur;
    }
    printf("%lld\n", best); return 0;
}
