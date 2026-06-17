"""Ingestion utilities for idempotent AI news ingestion jobs."""

from .dedup import build_content_hash
from .entity_clustering import EntityCandidate, canonicalize_entity, cluster_events
from .keys import build_external_id
from .source_registry import SourceMetadata, get_source_metadata
from .sources import (
    parse_arxiv_paper,
    parse_github_release,
    parse_github_repo,
    parse_hn_story,
    parse_hugging_face_model,
    parse_official_blog_post,
    parse_package_release,
    parse_x_post,
)
from .trend_scoring import (
    TrendIntelligenceInput,
    TrendIntelligenceBreakdown,
    TrendScoreInput,
    TrendScoreBreakdown,
    classify_verdict,
    compute_cross_source_confirmation_score,
    compute_growth_velocity_score,
    compute_trend_intelligence_score,
    compute_trend_score,
)
from .writer import IngestionWriter, RunMetadata

__all__ = [
    "build_external_id",
    "build_content_hash",
    "SourceMetadata",
    "get_source_metadata",
    "EntityCandidate",
    "canonicalize_entity",
    "cluster_events",
    "IngestionWriter",
    "RunMetadata",
    "parse_hn_story",
    "parse_x_post",
    "parse_github_repo",
    "parse_github_release",
    "parse_arxiv_paper",
    "parse_hugging_face_model",
    "parse_package_release",
    "parse_official_blog_post",
    "TrendScoreInput",
    "TrendScoreBreakdown",
    "TrendIntelligenceInput",
    "TrendIntelligenceBreakdown",
    "compute_trend_score",
    "compute_trend_intelligence_score",
    "compute_growth_velocity_score",
    "compute_cross_source_confirmation_score",
    "classify_verdict",
]
