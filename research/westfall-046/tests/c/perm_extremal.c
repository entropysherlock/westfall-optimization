/* For one non-adjacency graph G (read from stdin: n then n bitmasks), iterate over ALL n! vertex orders
   (Heap's algorithm), compute N_k of the forward-model digraph for every k, and print max over orders. */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdint.h>
#define KMAX 40
int n; uint32_t g[16];
long long best[KMAX+1];
static void eval(const int *p) {             /* p[pos] = vertex at position pos */
    uint32_t low[16];
    for (int j = 0; j < n; j++) { low[j] = 0;
        for (int i = 0; i < j; i++) if (!(g[p[j]] >> p[i] & 1)) low[j] |= 1u << i; }
    long long h[KMAX+2]; memset(h, 0, sizeof h);
    for (uint32_t X = 0; X < (1u << n); X++) { int inv = 0; uint32_t nX = ~X;
        for (int j = 0; j < n; j++) if (X >> j & 1) inv += __builtin_popcount(low[j] & nX);
        h[inv > KMAX ? KMAX+1 : inv]++; }
    long long s = 0; for (int k = 0; k <= KMAX; k++) { s += h[k]; if (s > best[k]) best[k] = s; }
}
int main(void) {
    if (scanf("%d", &n) != 1) return 1;
    for (int i = 0; i < n; i++) scanf("%u", &g[i]);
    int p[16], c[16]; for (int i = 0; i < n; i++) { p[i] = i; c[i] = 0; }
    eval(p); int i = 0;
    while (i < n) { if (c[i] < i) { int a = (i % 2 == 0) ? 0 : c[i]; int t = p[a]; p[a] = p[i]; p[i] = t; eval(p); c[i]++; i = 0; } else { c[i] = 0; i++; } }
    for (int k = 0; k <= KMAX; k++) printf("%lld%c", best[k], k == KMAX ? '\n' : ' ');
    return 0;
}
