from __future__ import annotations

import json
from typing import Iterable

import pandas as pd


EXPLAINABILITY_KEYS: Iterable[str] = (
    "base_score",
    "freshness_multiplier",
    "anti_incumbent_penalty",
    "subscore_hn",
    "subscore_x",
    "subscore_github",
    "norm_hn_score",
    "norm_hn_comments",
    "norm_x_engagement_velocity",
    "norm_github_star_delta",
    "norm_github_fork_delta",
)


def prepare_trend_scores_for_storage(scored_df: pd.DataFrame) -> pd.DataFrame:
    """Maps scoring output to trend_scores persistence columns."""

    df = scored_df.copy()
    df = df.rename(
        columns={
            "date": "score_date",
            "hn_score": "raw_hn_score",
            "hn_comments": "raw_hn_comments",
            "x_engagement_velocity": "raw_x_engagement_velocity",
            "github_star_delta": "raw_github_star_delta",
            "github_fork_delta": "raw_github_fork_delta",
            "github_total_stars": "raw_github_total_stars",
        }
    )

    explainability_cols = [c for c in EXPLAINABILITY_KEYS if c in df.columns]
    df["explainability"] = df[explainability_cols].apply(
        lambda row: json.dumps({k: row[k] for k in explainability_cols if pd.notna(row[k])}),
        axis=1,
    )

    return df
