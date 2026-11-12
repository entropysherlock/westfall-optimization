| family | instance | SLDP-pack s | BLX 1.0 s | BLX 2.0 s (route) | MILP s | OPT agree |
|---|---|---|---|---|---|---|
| C | blocks n=29 {cores: [19], q: 0.0} | 10.69 | 1.66 | 2.19 (blx) | not proved (60) | True |
| C | blocks n=29 {cores: [19], q: 0.02} | 10.31 | 1.75 | 1.72 (blx) | not proved (60) | True |
| C | blocks n=29 {cores: [19], q: 0.05} | 10.69 | 8.84 | 12.07 (sldp) | not proved (60) | True |
| C | blocks n=35 {cores: [19], q: 0.0} | 18.89 | 4.45 | 4.50 (blx) | not proved (60) | True |
| C | blocks n=35 {cores: [19], q: 0.02} | 19.12 | 17.47 | 17.49 (blx) | not proved (60) | True |
| C | blocks n=35 {cores: [19], q: 0.05} | 21.66 | 23.25 | 22.39 (sldp) | not proved (60) | True |
| C | blocks n=45 {cores: [19, 11], q: 0.0} | 42.49 | 5.45 | 5.34 (blx) | not proved (60) | True |
| C | blocks n=45 {cores: [19, 11], q: 0.02} | 41.26 | 5.54 | 5.58 (blx) | not proved (60) | True |
| C | blocks n=45 {cores: [19, 11], q: 0.05} | 46.77 | 20.79 | 20.30 (blx) | not proved (60) | True |
| C | blocks n=50 {cores: [11, 11, 11], q: 0.0} | 0.30 | 0.14 | 0.22 (blx) | not proved (60) | True |
| C | blocks n=50 {cores: [11, 11, 11], q: 0.03} | 0.41 | 0.58 | 0.55 (sldp) | not proved (60) | True |
| C | blocks n=50 {cores: [11, 11, 11], q: 0.08} | 0.85 | 1.49 | 1.18 (sldp) | not proved (60) | True |
| C-adv | blocks n=29 {cores: [19], q: 0.25} | 35.80 | 38.10 | 37.29 (sldp) | not proved (60) | True |
| A | neartrans n=40  | 0.07 | 2.52 | 0.07 (sldp) | 0.2 | True |
| A | neartrans n=60  | 0.20 | 2.93 | 0.16 (sldp) | 0.6 | True |
| B | planted n=50 {alpha: 0.5, theta: 2.0} | 0.10 | 0.72 | 0.17 (sldp) | 0.3 | True |
| B | planted n=50 {alpha: 0.5, theta: 4.0} | 0.16 | 2.59 | 0.14 (sldp) | 0.5 | True |
| B | planted n=50 {alpha: 1.0, theta: 4.0} | 0.07 | 0.68 | 0.08 (sldp) | 0.3 | True |
| D | uniform n=22  | 0.04 | 1.22 | 0.04 (sldp) | 0.1 | True |
| D | ties n=22  | 0.12 | 0.18 | 0.06 (milp->sldp) | 0.0 | True |
| LOLIB-test | IO/N-t59d11xx | 14.75 | 22.07 | 0.33 (milp->sldp) | 0.2 | True |
| LOLIB-test | IO/N-t65d11xx | 1.33 | 1.77 | 0.39 (milp->sldp) | 0.2 | True |
| LOLIB-test | IO/N-t70d11xx | 0.29 | 0.34 | 0.34 (milp->sldp) | 0.2 | True |
| LOLIB-test | IO/N-t74d11xx | 0.24 | 0.42 | 0.36 (milp->sldp) | 0.3 | True |
| LOLIB-test | IO/N-t75e11xx | 0.16 | 0.35 | 0.32 (milp->sldp) | 0.3 | True |
| LOLIB-test | IO/N-tiw56n54 | timeout | timeout | 0.62 (milp->sldp) | 0.5 | True |
| LOLIB-test | IO/N-stabu70 | timeout | timeout | 1.81 (milp->sldp) | 1.6 | True |
| LOLIB-test | IO/N-be75oi | timeout | timeout | 0.55 (milp->sldp) | 0.4 | True |
| LOLIB-test | xLOLIB/N-be75np_150 | — | — | UNRESOLVED (n>62, MILP not proved) (milp) | not proved (60) | — |
| LOLIB-test | xLOLIB/N-be75eec_150 | — | — | UNRESOLVED (n>62, MILP not proved) (milp) | not proved (60) | — |

fastest solver counts: {'blx': 6, 'blx2': 9, 'sldp': 8, 'milp': 7}
BLX 2.0 time / best-of-(SLDP,BLX1,MILP): median 1.23, max 2.00, n=28
