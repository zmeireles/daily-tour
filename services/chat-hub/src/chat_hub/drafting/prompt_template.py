"""Locale-aware prompt assembly for the reservation drafter (T-4.4.0).

Two surfaces:

* `build_system_prompt(locale)` — picks the system message for the model.
  pt-PT and en are first-class; anything else falls back to en.
* `build_user_prompt(...)` — formats the structured ask (place, dates,
  party size, guest message) into a single string that goes in the
  `user` turn.

Kept deliberately small — D7 in REQUIREMENTS commits us to two locales
for v1, so a dict lookup is enough; no i18n framework, no Jinja.
"""
from __future__ import annotations

from typing import Final

Locale = str

_SYSTEM_PROMPTS: Final[dict[Locale, str]] = {
    "en": (
        "You are a concise reservation assistant for a tour-planning app. "
        "Write a short, polite reservation request (3-5 sentences) the "
        "guest can send to the venue. Use the guest's voice, include the "
        "party size and dates, and end with a polite confirmation ask. "
        "Plain text only — no markdown, no preamble, no sign-off "
        "placeholders. Respond in English."
    ),
    "pt-PT": (
        "És um assistente conciso para pedidos de reserva numa aplicação "
        "de planeamento de visitas. Redige um pedido curto e cortês (3-5 "
        "frases) que o hóspede possa enviar ao estabelecimento. Usa a "
        "voz do hóspede, inclui o número de pessoas e as datas, e termina "
        "com um pedido cortês de confirmação. Apenas texto simples — sem "
        "markdown, sem preâmbulo, sem assinaturas. Responde em português "
        "de Portugal."
    ),
}


def normalize_locale(locale: str | None) -> Locale:
    """Map an incoming locale tag to one of the supported keys.

    Anything starting with `pt` routes to pt-PT (we only ship one Portuguese
    variant in v1); everything else falls back to `en`.
    """
    if locale is None:
        return "en"
    tag = locale.strip().lower()
    if tag.startswith("pt"):
        return "pt-PT"
    return "en"


def build_system_prompt(locale: str | None) -> str:
    return _SYSTEM_PROMPTS[normalize_locale(locale)]


def build_user_prompt(
    *,
    place_name: str,
    dates: str,
    party_size: int | None,
    guest_message: str,
    locale: str | None,
) -> str:
    """Format the structured fields into the user turn for the Messages API."""
    norm = normalize_locale(locale)
    if norm == "pt-PT":
        party_line = (
            f"Número de pessoas: {party_size}"
            if party_size is not None
            else "Número de pessoas: não especificado"
        )
        return (
            f"Local: {place_name}\n"
            f"Datas: {dates}\n"
            f"{party_line}\n"
            f"Mensagem do hóspede: {guest_message}\n\n"
            "Redige o pedido de reserva."
        )
    party_line = (
        f"Party size: {party_size}"
        if party_size is not None
        else "Party size: not specified"
    )
    return (
        f"Venue: {place_name}\n"
        f"Dates: {dates}\n"
        f"{party_line}\n"
        f"Guest note: {guest_message}\n\n"
        "Draft the reservation request."
    )
