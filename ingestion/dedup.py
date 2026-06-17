from __future__ import annotations

import hashlib


def normalize_text(value: str | None) -> str:
    if not value:
        return ""
    return " ".join(value.strip().lower().split())


def build_content_hash(title: str | None, url: str | None, source: str) -> str:
    """Hash title + url + source to catch near-duplicate API inconsistencies."""

    basis = "|".join(
        [
            normalize_text(source),
            normalize_text(title),
            normalize_text(url),
        ]
    )
    return hashlib.sha256(basis.encode("utf-8")).hexdigest()
