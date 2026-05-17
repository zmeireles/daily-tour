"""AI reservation drafting (T-4.4.0).

Takes a guest's chat context + selected place + dates, asks Anthropic to
draft a short reservation message in the requested locale, and returns
text the guest can review and send through whichever channel they prefer.

`reservation_drafter.draft_reservation` is the public entry; the prompt
text lives in `prompt_template` so locale tweaks don't churn the drafter.
"""
from .reservation_drafter import DraftRequest, DraftResult, draft_reservation

__all__ = ["DraftRequest", "DraftResult", "draft_reservation"]
