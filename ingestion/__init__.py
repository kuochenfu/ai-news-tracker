"""Ingestion utilities for idempotent AI news ingestion jobs."""

from .dedup import build_content_hash
from .keys import build_external_id
from .sources import parse_github_repo, parse_hn_story, parse_x_post
from .trend_scoring import TrendScoreInput, TrendScoreBreakdown, classify_verdict, compute_trend_score
from .writer import IngestionWriter, RunMetadata

__all__ = [
    "build_external_id",
    "build_content_hash",
    "IngestionWriter",
    "RunMetadata",
    "parse_hn_story",
    "parse_x_post",
    "parse_github_repo",
    "TrendScoreInput",
    "TrendScoreBreakdown",
    "compute_trend_score",
    "classify_verdict",
]
