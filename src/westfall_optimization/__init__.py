"""Westfall Optimization: exact weighted linear ordering with Block-Localized Exclusion (BLX 2.0)
and independently checkable exact certificates. Research software; see README for scope and status."""
from .core import score, backward_weight, as_skew, from_preferences, paley_sign, perturbed_paley, read_lolib
from .blx.portfolio import solve, PROVED, BEST, UNRESOLVED, REJECTED

__version__ = "0.1.0"
__all__ = ["solve", "score", "backward_weight", "as_skew", "from_preferences", "paley_sign",
           "perturbed_paley", "read_lolib", "PROVED", "BEST", "UNRESOLVED", "REJECTED", "__version__"]
