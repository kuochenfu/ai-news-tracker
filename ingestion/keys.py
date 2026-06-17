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
    - GitHub Releases: repo full name + tag/id
    - arXiv: arXiv ID
    - Hugging Face: model/dataset/space ID
    - npm/PyPI: package name + version/date
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

    if normalized == "github_releases":
        repo = payload.get("repo_full_name") or payload.get("repository")
        tag = payload.get("tag_name") or payload.get("release_tag") or payload.get("id")
        if not repo or not tag:
            raise ExternalKeyError("GitHub release payload must include repo_full_name and tag/id")
        return f"{repo}:{tag}"

    if normalized == "arxiv":
        arxiv_id = payload.get("arxiv_id") or payload.get("id")
        if not arxiv_id:
            raise ExternalKeyError("arXiv payload must include arxiv_id or id")
        return str(arxiv_id).removeprefix("https://arxiv.org/abs/")

    if normalized == "hugging_face":
        model_id = payload.get("modelId") or payload.get("model_id") or payload.get("id")
        if not model_id:
            raise ExternalKeyError("Hugging Face payload must include model ID")
        return str(model_id)

    if normalized in {"npm", "pypi"}:
        package_name = payload.get("name") or payload.get("package_name")
        version = payload.get("version")
        if not package_name:
            raise ExternalKeyError(f"{normalized} payload must include package name")
        if version:
            return f"{package_name}:{version}"
        if snapshot_date:
            return f"{package_name}:{snapshot_date.isoformat()}"
        return str(package_name)

    if normalized == "official_blog":
        value = payload.get("guid") or payload.get("id") or payload.get("url") or payload.get("link")
        if value is None:
            raise ExternalKeyError("Official blog payload must include guid, id, url, or link")
        return str(value)

    value = payload.get("external_id") or payload.get("id")
    if value is None:
        raise ExternalKeyError(f"Unsupported source '{source}' and no fallback external key")
    return str(value)
