from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

SourceType = Literal["first_party", "community", "media", "platform"]
SignalRole = Literal["origin", "early_discussion", "validation", "adoption"]


@dataclass(frozen=True)
class SourceMetadata:
    source: str
    label: str
    source_type: SourceType
    signal_role: SignalRole
    tier: int
    description: str
    homepage_url: str | None = None
    feed_url: str | None = None
    region: str | None = None

    @property
    def tier_label(self) -> str:
        return source_tier_label(self.tier)


def source_tier_label(tier: int) -> str:
    labels = {
        1: "first-party / primary",
        2: "developer / community",
        3: "media validation",
    }
    return labels.get(tier, "unclassified")


SOURCE_REGISTRY: dict[str, SourceMetadata] = {
    "official_blog": SourceMetadata(
        source="official_blog",
        label="Official company or product blog",
        source_type="first_party",
        signal_role="origin",
        tier=1,
        description="First-party release notes, product announcements, and research posts.",
    ),
    "arxiv": SourceMetadata(
        source="arxiv",
        label="arXiv",
        source_type="first_party",
        signal_role="origin",
        tier=1,
        description="Research preprints from cs.AI, cs.LG, cs.CL, cs.CV, and related AI categories.",
        homepage_url="https://arxiv.org/",
    ),
    "github_releases": SourceMetadata(
        source="github_releases",
        label="GitHub Releases",
        source_type="first_party",
        signal_role="origin",
        tier=1,
        description="Project-owned release notes and version announcements.",
        homepage_url="https://github.com/",
    ),
    "hn": SourceMetadata(
        source="hn",
        label="Hacker News",
        source_type="community",
        signal_role="early_discussion",
        tier=2,
        description="Developer community discussion signal.",
        homepage_url="https://news.ycombinator.com/",
    ),
    "x": SourceMetadata(
        source="x",
        label="X",
        source_type="community",
        signal_role="early_discussion",
        tier=2,
        description="Fast social discussion and repost velocity signal.",
        homepage_url="https://x.com/",
    ),
    "github": SourceMetadata(
        source="github",
        label="GitHub",
        source_type="platform",
        signal_role="adoption",
        tier=2,
        description="Developer adoption signal from repository metadata.",
        homepage_url="https://github.com/",
    ),
    "hugging_face": SourceMetadata(
        source="hugging_face",
        label="Hugging Face",
        source_type="platform",
        signal_role="adoption",
        tier=2,
        description="Model, dataset, and space adoption signal.",
        homepage_url="https://huggingface.co/",
    ),
    "npm": SourceMetadata(
        source="npm",
        label="npm",
        source_type="platform",
        signal_role="adoption",
        tier=2,
        description="JavaScript package adoption and release signal.",
        homepage_url="https://www.npmjs.com/",
    ),
    "pypi": SourceMetadata(
        source="pypi",
        label="PyPI",
        source_type="platform",
        signal_role="adoption",
        tier=2,
        description="Python package adoption and release signal.",
        homepage_url="https://pypi.org/",
    ),
    "media_rss": SourceMetadata(
        source="media_rss",
        label="Technology media RSS",
        source_type="media",
        signal_role="validation",
        tier=3,
        description="Media pickup and validation layer, not first-party intelligence.",
    ),
}


def get_source_metadata(source: str) -> SourceMetadata:
    normalized = source.strip().lower()
    if normalized in SOURCE_REGISTRY:
        return SOURCE_REGISTRY[normalized]
    if normalized.startswith("media:") or normalized.endswith("_rss"):
        return SourceMetadata(
            source=normalized,
            label=source,
            source_type="media",
            signal_role="validation",
            tier=3,
            description="Media pickup and validation layer.",
        )
    return SourceMetadata(
        source=normalized,
        label=source,
        source_type="community",
        signal_role="early_discussion",
        tier=2,
        description="Unregistered source treated as a community signal until classified.",
    )


def enrich_event_with_source_metadata(event: dict[str, object]) -> dict[str, object]:
    metadata = get_source_metadata(str(event["source"]))
    return {
        **event,
        "source_type": metadata.source_type,
        "signal_role": metadata.signal_role,
        "source_tier": metadata.tier,
        "source_label": metadata.label,
    }
