# Public human-preference demonstration: provenance and reproducibility

## Source

- Original data: PrefLib Pol.is Dataset 00069, file `00069-00000001.cat` ("Polis Poll: $15/hour", Seattle minimum-wage discussion), based on data from Pol.is.
- Dataset page: https://preflib.github.io/PrefLib-Jekyll/dataset/00069
- Original file: https://raw.githubusercontent.com/PrefLib/PrefLib-Data/main/datasets/00069%20-%20polis/00069-00000001.cat
- Original source snapshot Git blob SHA: `8c1d785d1442baed2bc4a24c424e5104fb3a1458`
- License: Pol.is data described by PrefLib as Creative Commons Attribution 4.0 International (CC BY 4.0). Attribution: Pol.is survey respondents, original Pol.is dataset, and PrefLib reformatting/contribution by Simon Rey.

## Transformation (not direct pairwise votes)

The original contains 339 respondents, represented by 306 unique category profiles, over 54 comments. Each comment is marked Disapproved (0), Neutral/Skipped (1), or Approved (2), with many unrated.

1. Count explicit Approved and Disapproved responses per comment, weighting each category profile by its occurrence count.
2. Retain the 12 most frequently explicitly rated comments (same original numeric IDs, named `Comment #...` in the source; no new text was invented).
3. Expand each frequency-counted profile into anonymous respondent pseudo-IDs `polis-0001`, etc. These IDs are generated for the research demo, not original participant identifiers.
4. For every single respondent, form an implied pairwise comparison only when one selected comment was Approved and another selected comment was Disapproved. Approved is labeled winner. Never convert Neutral/Skipped into a vote; never assume an opinion about an unobserved comment.
5. Generate a standard comparison CSV with columns `option_a,option_b,winner,respondent_id`. The multiple derived comparisons from one respondent are correlated; the audit resamples at the reconstructed respondent-cluster level, not by individual pair row.

This is an **interpretation of categorical preference responses as pairwise comparisons**. The resulting pair data were *not* elicited as OpinionX Pair Rank votes. They cannot be used to verify exact OpinionX export compatibility.

## Independent consistency check (2026-11-17)

- Original response count: **339** (from all category-profile frequencies).
- Derived comparisons: **1,475**.
- Respondents with at least one qualifying derived pair: **136**.
- Comments retained: **12**.
- Pair types represented: **66 of 66**. Coverage alone does not imply balanced exposure.
- Top observed derived win rates: Comment #11 **69.43%** (229 appearances), Comment #1 **65.89%** (214), Comment #12 **62.07%** (232).
- These scores are observed wins/appearances **among selected and explicitly opposed categories**, not uniform-opponent Borda scores or population causal quantities.

## Limits

The demo demonstrates real-human-data ingestion, reproducible observed scoring, pair exposure diagnostics, respondent-level descriptive bootstrap, and privacy-first browser processing. It does *not* establish propensity-corrected scoring, calibrated simultaneous tests, true equivalence, proven recruitment savings, or prospective early stopping. The top-two pair is chosen after observing the data, so its percentile bootstrap is not multiplicity-adjusted. Missing data may be informative.

The hosted CSV is public derived data, not a confidential survey export. Uploaded user CSVs are analyzed locally in the browser.
