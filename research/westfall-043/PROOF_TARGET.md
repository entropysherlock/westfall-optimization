# Target theorem (paper-complete, Lean outstanding)

Let h,K >=0 and Rset h K as in Westfall041.DefectCount. For every row profile r define
  residual_i = max(r_i-h,0), box_i=min(r_i,h).
Both are antitone, and r_i = residual_i + box_i. The residual is a length-h truncation of a hyperbola partition bounded by H(K). The box fits in an h×h square, which has choose(2h,h) Ferrers partitions via monotone lattice paths. Recover r by addition. Hence the map to (residual,box) is injective and R_h(K) <= choose(2h,h)H(K).

The Lean path is to:
(1) define a total map into Hset K by zero padding the residual profile beyond h and show the antitone/hyperbola predicate;
(2) define BoxSet as bounded antitone functions; prove image membership;
(3) prove injectivity via split_injective;
(4) prove card(BoxSet h) <= choose(2h,h), or inject BoxSet into 2h-bit strings and obtain 4^h bound;
(5) finish the cardinality inequality using product counting;
(6) combine with card_kcuts_le_defect and prove the revised counting theorem with no axioms and no sorry.

No one of the preliminary lemmas alone proves (5).
