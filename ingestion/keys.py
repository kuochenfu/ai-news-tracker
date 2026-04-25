from __future__ import annotations

from datetime import date
from typing import Any, Mapping


class ExternalKeyError(ValueError):
    """Raised when an external key cannot be derived from source payload data."""


def build_external_id(source: str, payload: Mapping[str, Any], snapshot_date: date | None = None) -> str:
    """Build a normalized external identifier for a raw event or metric snapshot.

    Source-specific rules:
    - HN: item.id
    - X: tweet/post ID
    - GitHub: repo full name + snapshot date for metrics
    """

    normalized = source.strip().lower()

    if normalized == "hn":
        item_id = payload.get("item", {}).get("id") if isinstance(payload.get("item"), Mapping) else payload.get("item.id")
        if item_id is None:
            item_id = payload.get("id")
        if item_id is None:
            raise ExternalKeyError("HN payload must include item.id")
        return str(item_id)

    if normalized == "x":
        candidates = ("tweet_id", "post_id", "id", "rest_id")
        for key in candidates:
            value = payload.get(key)
            if value:
                return str(value)
        raise ExternalKeyError("X payload must include tweet/post ID")

    if normalized == "github":
        repo = payload.get("repo_full_name") or payload.get("full_name")
        if not repo:
            owner = payload.get("owner")
            name = payload.get("name")
            if owner and name:
                repo = f"{owner}/{name}"
        if not repo:
            raise ExternalKeyError("GitHub payload must include repository full name")
        if snapshot_date is None:
            raise ExternalKeyError("GitHub keys require snapshot_date")
        return f"{repo}:{snapshot_date.isoformat()}"

    value = payload.get("external_id") or payload.get("id")
    if value is None:
        raise ExternalKeyError(f"Unsupported source '{source}' and no fallback external key")
    return str(value)
