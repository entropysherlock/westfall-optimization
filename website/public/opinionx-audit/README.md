# AdaptivePair — OpinionX Pair Rank Audit (alpha)

A single-file, browser-only, static CSV analysis tool. No server or API calls.

## Input

One CSV per Pair Rank block containing one answered pair per row, with columns indicating first option, second option, winner (the exact option name or 1/2), and optionally respondent ID. Automatic aliases plus manual mapping are supported. Rows with skipped/invalid winners are excluded from scores, with counts reported. Max 30,000 rows, 250 options, 8MB.

**Not yet verified against the exact Pair Rank sample tab schema** from OpinionX's linked public Google Sheet. The official docs confirm transaction-level raw exports but the linked Google Sheets example did not expose its Pair Rank headers in this browsing environment. Accordingly the app makes no blanket "import any OpinionX CSV" claim, and provides column mapping.

## Outputs

- Observed win rate (number of wins / appearances), not adjusted for the varying strength of opponents.
- Count and coverage of observed unordered pair types and range of exposures per observed pair.
- Exploratory 95% respondent-cluster bootstrap interval for the top two **observed** scores if 15+ complete respondent IDs are available. The top two are chosen after seeing the data; this is not a multiple-comparisons-adjusted inference procedure.
- CSV export of raw observed scores and counts.
- No inference about uniform-opponent Borda scores, assignment propensities, future sample-saving, calibrated stopping decisions, or equivalence.

## How to run

Open index.html in a browser, or host it as static content on GitHub Pages. Click **Explore sample audit** or provide your own CSV.

## Official reference

OpinionX Pair Rank: https://knowledge.opinionx.co/en/articles/5866366-pair-rank

OpinionX export guide: https://knowledge.opinionx.co/en/articles/6764214-exporting-how-to-send-your-opinionx-data-to-an-external-spreadsheet

## Outstanding work

1. Obtain a consented, authentic OpinionX Pair Rank raw CSV; validate column mapping, vote interpretation, and exact observed score reconciliation.
2. Independently audit bootstrap uncertainty and adjust for post-hoc comparison selection before drawing decisions.
3. Build and validate a prospective design / early-stopping analysis when actual logging and assumptions support it.