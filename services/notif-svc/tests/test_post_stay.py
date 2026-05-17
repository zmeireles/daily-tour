"""Unit tests for post-stay email templates."""
from __future__ import annotations

from notif_svc.templates.post_stay import render_post_stay


def test_en_template_content() -> None:
    content = render_post_stay(
        guest_name="Alice",
        guesthouse_name="Casa da Praia",
        review_url="https://daily-tour.example.com/review/abc123",
        locale="en",
    )
    assert "Casa da Praia" in content.subject
    assert "Alice" in content.text_body
    assert "https://daily-tour.example.com/review/abc123" in content.text_body
    assert "No account needed" in content.text_body


def test_pt_template_content() -> None:
    content = render_post_stay(
        guest_name="Maria",
        guesthouse_name="Quinta do Sol",
        review_url="https://daily-tour.example.com/review/xyz789",
        locale="pt-PT",
    )
    assert "Quinta do Sol" in content.subject
    assert "Maria" in content.text_body
    assert "https://daily-tour.example.com/review/xyz789" in content.text_body
    assert "Não é necessário registo" in content.text_body
