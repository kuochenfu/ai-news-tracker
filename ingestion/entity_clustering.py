from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Any, Iterable, Mapping
from urllib.parse import urlparse

from .dedup import normalize_text


@dataclass(frozen=True)
class EntityCandidate:
    canonical_name: str
    entity_type: str
    confidence: float
    aliases: tuple[str, ...] = ()
    official_url: str | None = None
    github_repo_url: str | None = None


_GITHUB_RE = re.compile(r"github\.com/([^/\s]+)/([^/\s#?]+)", re.IGNORECASE)
_REPO_NAME_RE = re.compile(r"^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$")
_PUNCT_RE = re.compile(r"[^a-z0-9]+")


def normalize_url_for_entity(url: str | None) -> str | None:
    if not url:
        return None
    parsed = urlparse(url.strip())
    if not parsed.netloc:
        return normalize_text(url)
    netloc = parsed.netloc.lower()
    if netloc.startswith("www."):
        netloc = netloc[4:]
    path = parsed.path.rstrip("/").lower()
    return f"{netloc}{path}"


def extract_github_repo(value: str | None) -> str | None:
    if not value:
        return None
    match = _GITHUB_RE.search(value)
    if match:
        owner, repo = match.groups()
        return f"{owner.lower()}/{repo.removesuffix('.git').lower()}"
    stripped = value.strip()
    if _REPO_NAME_RE.match(stripped):
        owner, repo = stripped.split("/", 1)
        return f"{owner.lower()}/{repo.lower()}"
    return None


def title_slug(title: str | None, max_words: int = 12) -> str:
    normalized = normalize_text(title)
    words = [word for word in _PUNCT_RE.split(normalized) if word]
    return "-".join(words[:max_words])


def canonicalize_entity(event: Mapping[str, Any]) -> EntityCandidate:
    source = str(event.get("source", "")).lower()
    title = event.get("title")
    url = event.get("url")

    repo = (
        event.get("repo_full_name")
        or extract_github_repo(str(url) if url else None)
        or extract_github_repo(str(title) if title else None)
    )
    if repo and source in {"github", "github_releases"}:
        return EntityCandidate(
            canonical_name=str(repo).lower(),
            entity_type="repository",
            confidence=0.98,
            aliases=tuple(alias for alias in (str(title) if title else None, str(event.get("tag_name") or "")) if alias),
            github_repo_url=f"https://github.com/{repo}",
        )

    if source == "arxiv":
        arxiv_id = str(event.get("external_id") or "").removeprefix("https://arxiv.org/abs/")
        return EntityCandidate(
            canonical_name=f"arxiv:{arxiv_id}",
            entity_type="paper",
            confidence=0.96,
            aliases=(str(title),) if title else (),
            official_url=str(url) if url else None,
        )

    if source in {"npm", "pypi"}:
        package_name = event.get("package_name") or title
        return EntityCandidate(
            canonical_name=f"{source}:{str(package_name).lower()}",
            entity_type="package",
            confidence=0.94,
            aliases=(str(package_name),) if package_name else (),
            official_url=str(url) if url else None,
        )

    if source == "hugging_face":
        model_id = event.get("external_id") or title
        return EntityCandidate(
            canonical_name=f"hugging_face:{str(model_id).lower()}",
            entity_type="model",
            confidence=0.94,
            aliases=(str(model_id),) if model_id else (),
            official_url=str(url) if url else None,
        )

    normalized_url = normalize_url_for_entity(str(url) if url else None)
    if normalized_url:
        return EntityCandidate(
            canonical_name=f"url:{normalized_url}",
            entity_type="source_url",
            confidence=0.85,
            aliases=(str(title),) if title else (),
            official_url=str(url) if source == "official_blog" else None,
        )

    slug = title_slug(str(title) if title else event.get("body"))
    return EntityCandidate(
        canonical_name=f"topic:{slug}" if slug else f"event:{event.get('external_id')}",
        entity_type="topic",
        confidence=0.65 if slug else 0.50,
        aliases=(str(title),) if title else (),
    )


def cluster_events(events: Iterable[Mapping[str, Any]]) -> dict[str, list[Mapping[str, Any]]]:
    clusters: dict[str, list[Mapping[str, Any]]] = {}
    for event in events:
        candidate = canonicalize_entity(event)
        clusters.setdefault(candidate.canonical_name, []).append(event)
    return clusters
