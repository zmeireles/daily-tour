"""Post-stay review email templates — EN and pt-PT."""
from __future__ import annotations

from dataclasses import dataclass
from typing import Literal


@dataclass
class EmailContent:
    subject: str
    text_body: str


def render_post_stay(
    *,
    guest_name: str,
    guesthouse_name: str,
    review_url: str,
    locale: Literal["en", "pt-PT"] = "en",
) -> EmailContent:
    if locale == "pt-PT":
        return _pt(guest_name=guest_name, guesthouse_name=guesthouse_name, review_url=review_url)
    return _en(guest_name=guest_name, guesthouse_name=guesthouse_name, review_url=review_url)


def _en(*, guest_name: str, guesthouse_name: str, review_url: str) -> EmailContent:
    subject = f"How was your stay at {guesthouse_name}?"
    text_body = (
        f"Hi {guest_name},\n\n"
        f"We hope you enjoyed your stay at {guesthouse_name}!\n\n"
        "We'd love to hear your thoughts. Leave a review in under a minute "
        "— it helps other travellers choose well:\n\n"
        f"{review_url}\n\n"
        "No account needed. Thank you!\n\n"
        "The Daily Tour Team"
    )
    return EmailContent(subject=subject, text_body=text_body)


def _pt(*, guest_name: str, guesthouse_name: str, review_url: str) -> EmailContent:
    subject = f"Como foi a sua estada em {guesthouse_name}?"
    text_body = (
        f"Olá {guest_name},\n\n"
        f"Esperamos que tenha gostado da sua estada em {guesthouse_name}!\n\n"
        "Gostaríamos de conhecer a sua opinião. Deixe uma avaliação em apenas um minuto "
        "— ajuda outros viajantes a escolher melhor:\n\n"
        f"{review_url}\n\n"
        "Não é necessário registo. Obrigado!\n\n"
        "A Equipa Daily Tour"
    )
    return EmailContent(subject=subject, text_body=text_body)
